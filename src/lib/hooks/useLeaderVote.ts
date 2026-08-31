'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LiveSessionLeaderVote } from '@/types/live-session'

export function useLeaderVote(sessionId: string, groupId: string | null, studentId?: string) {
  const [votes, setVotes] = useState<LiveSessionLeaderVote[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const supabase = createClient()

  const refreshVotes = useCallback(async () => {
    if (!sessionId || !groupId) {
      setVotes([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('live_session_leader_votes')
        .select('*')
        .eq('session_id', sessionId)
        .eq('group_id', groupId)

      if (error) throw error
      const voteList = (data || []) as LiveSessionLeaderVote[]
      setVotes(voteList)

      if (studentId) {
        const found = voteList.find((v) => v.voter_id === studentId)
        setMyVote(found ? found.candidate_id : null)
      }
    } catch (err) {
      console.error('Error fetching leader votes:', err)
    } finally {
      setLoading(false)
    }
  }, [sessionId, groupId, studentId, supabase])

  useEffect(() => {
    refreshVotes()
  }, [refreshVotes])

  // Realtime subscription for votes
  useEffect(() => {
    if (!sessionId || !groupId) return

    const channel = supabase.channel(`votes-${sessionId}-${groupId}`)

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_leader_votes',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          refreshVotes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, groupId, supabase, refreshVotes])

  const castVote = useCallback(
    async (candidateId: string) => {
      if (!groupId) return
      const { data, error } = await supabase.rpc('cast_leader_vote', {
        p_session_id: sessionId,
        p_group_id: groupId,
        p_candidate_id: candidateId
      })
      if (error) throw error
      setMyVote(candidateId)
      await refreshVotes()
      return data
    },
    [sessionId, groupId, supabase, refreshVotes]
  )

  const finalizeLeader = useCallback(async () => {
    if (!groupId) return
    const { data, error } = await supabase.rpc('finalize_leader', {
      p_session_id: sessionId,
      p_group_id: groupId
    })
    if (error) throw error
    return data
  }, [sessionId, groupId, supabase])

  // Candidate tallies
  const voteTallies: Record<string, number> = {}
  votes.forEach((v) => {
    voteTallies[v.candidate_id] = (voteTallies[v.candidate_id] || 0) + 1
  })

  return {
    votes,
    myVote,
    voteTallies,
    totalVotes: votes.length,
    loading,
    castVote,
    finalizeLeader,
    refreshVotes
  }
}
