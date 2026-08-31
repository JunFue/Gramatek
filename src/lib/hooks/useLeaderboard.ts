'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeaderboardEntry } from '@/types/live-session'

export function useLeaderboard(
  sessionId: string,
  mode: 'individual' | 'group' = 'individual',
  revealMode: string = 'auto_per_question',
  resultsRevealedAt: string | null = null,
  isHost: boolean = false
) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const supabase = createClient()

  // In end_of_session mode, non-hosts only see leaderboard once results_revealed_at is set
  const isLeaderboardVisible = isHost || revealMode !== 'end_of_session' || !!resultsRevealedAt

  const fetchScores = useCallback(async () => {
    if (!sessionId) return

    try {
      if (mode === 'individual') {
        // 1. Fetch participants and answers for tie breaker
        const { data: participants, error: pErr } = await supabase
          .from('live_session_participants')
          .select(`
            student_id,
            total_score,
            removed_at,
            profiles (
              full_name,
              avatar_url
            )
          `)
          .eq('session_id', sessionId)
          .is('removed_at', null)

        if (pErr) throw pErr

        // Fetch cumulative response_ms
        const { data: answers } = await supabase
          .from('live_session_answers')
          .select('student_id, response_ms')
          .eq('session_id', sessionId)

        const responseTimeMap = new Map<string, number>()
        answers?.forEach((a) => {
          if (a.student_id) {
            responseTimeMap.set(
              a.student_id,
              (responseTimeMap.get(a.student_id) || 0) + (a.response_ms || 0)
            )
          }
        })

        const entries: LeaderboardEntry[] = (participants || []).map((p: any) => ({
          id: p.student_id,
          name: p.profiles?.full_name || 'Mag-aaral',
          avatar_url: p.profiles?.avatar_url || null,
          score: p.total_score || 0,
          total_response_ms: responseTimeMap.get(p.student_id) || 0,
          is_group: false
        }))

        // Sort: score DESC, tie-break: response_ms ASC
        entries.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return a.total_response_ms - b.total_response_ms
        })

        setLeaderboard(entries)
      } else {
        // Group Mode
        const { data: groups, error: gErr } = await supabase
          .from('live_session_groups')
          .select(`
            id,
            label,
            total_score,
            leader_id,
            profiles:leader_id (
              full_name,
              avatar_url
            )
          `)
          .eq('session_id', sessionId)

        if (gErr) throw gErr

        // Count group members
        const { data: participants } = await supabase
          .from('live_session_participants')
          .select('group_id')
          .eq('session_id', sessionId)
          .is('removed_at', null)

        const groupMemberCountMap = new Map<string, number>()
        participants?.forEach((p) => {
          if (p.group_id) {
            groupMemberCountMap.set(
              p.group_id,
              (groupMemberCountMap.get(p.group_id) || 0) + 1
            )
          }
        })

        // Fetch cumulative response_ms for groups
        const { data: answers } = await supabase
          .from('live_session_answers')
          .select('group_id, response_ms')
          .eq('session_id', sessionId)

        const responseTimeMap = new Map<string, number>()
        answers?.forEach((a) => {
          if (a.group_id) {
            responseTimeMap.set(
              a.group_id,
              (responseTimeMap.get(a.group_id) || 0) + (a.response_ms || 0)
            )
          }
        })

        const entries: LeaderboardEntry[] = (groups || []).map((g: any) => ({
          id: g.id,
          name: g.label,
          avatar_url: g.profiles?.avatar_url || null,
          score: g.total_score || 0,
          total_response_ms: responseTimeMap.get(g.id) || 0,
          is_group: true,
          member_count: groupMemberCountMap.get(g.id) || 0
        }))

        entries.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return a.total_response_ms - b.total_response_ms
        })

        setLeaderboard(entries)
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }, [sessionId, mode, supabase])

  useEffect(() => {
    fetchScores()
  }, [fetchScores])

  // Realtime subscription for score updates
  useEffect(() => {
    const table = mode === 'individual' ? 'live_session_participants' : 'live_session_groups'
    const channel = supabase.channel(`leaderboard-${sessionId}-${mode}`)

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchScores()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, mode, supabase, fetchScores])

  return {
    leaderboard: isLeaderboardVisible ? leaderboard : [],
    isLeaderboardVisible,
    loading,
    refreshLeaderboard: fetchScores
  }
}
