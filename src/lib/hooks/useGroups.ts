'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LiveSessionGroup, LiveSessionParticipant } from '@/types/live-session'

export function useGroups(sessionId: string) {
  const [groups, setGroups] = useState<LiveSessionGroup[]>([])
  const [participants, setParticipants] = useState<LiveSessionParticipant[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const supabase = createClient()

  const refreshGroups = useCallback(async () => {
    if (!sessionId) return

    try {
      // 1. Fetch groups with leader profiles
      const { data: gData, error: gErr } = await supabase
        .from('live_session_groups')
        .select(`
          *,
          leader:leader_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('session_id', sessionId)
        .order('label', { ascending: true })

      if (gErr) throw gErr
      setGroups((gData || []) as LiveSessionGroup[])

      // 2. Fetch participants
      const { data: pData, error: pErr } = await supabase
        .from('live_session_participants')
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('session_id', sessionId)
        .is('removed_at', null)
        .order('joined_at', { ascending: true })

      if (pErr) throw pErr
      setParticipants((pData || []) as LiveSessionParticipant[])
    } catch (err) {
      console.error('Error fetching groups data:', err)
    } finally {
      setLoading(false)
    }
  }, [sessionId, supabase])

  // Realtime subscriptions
  useEffect(() => {
    let isMounted = true

    const loadInitial = async () => {
      if (isMounted) {
        await refreshGroups()
      }
    }

    loadInitial()

    const channel = supabase.channel(`groups-${sessionId}`)

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_groups',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          refreshGroups()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          refreshGroups()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, refreshGroups])

  // RPC actions
  const randomizeGroups = useCallback(
    async (numberOfGroups: number) => {
      const { data, error } = await supabase.rpc('randomize_groups', {
        p_session_id: sessionId,
        p_number_of_groups: numberOfGroups
      })
      if (error) throw error
      await refreshGroups()
      return data
    },
    [sessionId, supabase, refreshGroups]
  )

  const setManualGroups = useCallback(
    async (assignments: Array<{ student_id: string; group_label: string }>) => {
      const { data, error } = await supabase.rpc('set_manual_groups', {
        p_session_id: sessionId,
        p_assignments: assignments
      })
      if (error) throw error
      await refreshGroups()
      return data
    },
    [sessionId, supabase, refreshGroups]
  )

  const forceAssignLeader = useCallback(
    async (groupId: string, studentId: string) => {
      const { data, error } = await supabase.rpc('force_assign_leader', {
        p_session_id: sessionId,
        p_group_id: groupId,
        p_student_id: studentId
      })
      if (error) throw error
      await refreshGroups()
      return data
    },
    [sessionId, supabase, refreshGroups]
  )

  return {
    groups,
    participants,
    loading,
    refreshGroups,
    randomizeGroups,
    setManualGroups,
    forceAssignLeader
  }
}
