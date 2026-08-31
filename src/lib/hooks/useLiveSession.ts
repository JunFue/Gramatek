'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LiveSession, LiveSessionQuestion } from '@/types/live-session'

export function useLiveSession(sessionId: string, initialSession?: LiveSession | null) {
  const [session, setSession] = useState<LiveSession | null>(initialSession || null)
  const [questions, setQuestions] = useState<LiveSessionQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<LiveSessionQuestion | null>(null)
  const [loading, setLoading] = useState<boolean>(!initialSession)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const selfHealTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch session & questions
  const refreshData = useCallback(async () => {
    try {
      // 1. Fetch Session
      const { data: sessionData, error: sessionErr } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionErr) throw sessionErr
      setSession(sessionData as LiveSession)

      // 2. Fetch Questions
      const { data: qData, error: qErr } = await supabase
        .from('live_session_questions')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index', { ascending: true })

      if (qErr) throw qErr
      const qList = (qData || []) as LiveSessionQuestion[]
      setQuestions(qList)

      // 3. Find current question
      if (sessionData.current_question_id) {
        const cur = qList.find(q => q.id === sessionData.current_question_id) || null
        setCurrentQuestion(cur)
      } else {
        setCurrentQuestion(null)
      }

      setError(null)
    } catch (err: any) {
      console.error('Error fetching live session data:', err)
      setError(err?.message || 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [sessionId, supabase])

  // Initial load
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Realtime Subscriptions
  useEffect(() => {
    const channel = supabase.channel(`live-session-${sessionId}`)

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const updated = payload.new as LiveSession
          setSession(updated)
          
          if (updated.current_question_id) {
            setQuestions((prev) => {
              const cur = prev.find(q => q.id === updated.current_question_id) || null
              setCurrentQuestion(cur)
              return prev
            })
          } else {
            setCurrentQuestion(null)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_questions',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedQ = payload.new as LiveSessionQuestion
            setQuestions((prev) =>
              prev.map((q) => (q.id === updatedQ.id ? updatedQ : q))
            )
            setCurrentQuestion((prev) =>
              prev?.id === updatedQ.id ? updatedQ : prev
            )
          } else {
            refreshData()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Re-sync on subscription connect/reconnect
          refreshData()
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, refreshData])

  // Self-Healing Pacing for Timed Sessions
  useEffect(() => {
    if (selfHealTimerRef.current) {
      clearTimeout(selfHealTimerRef.current)
      selfHealTimerRef.current = null
    }

    if (
      session?.status === 'question' &&
      session?.pacing === 'timed' &&
      session?.question_started_at &&
      currentQuestion
    ) {
      const timeLimit = currentQuestion.time_limit_seconds || session.default_time_limit_seconds || 30
      const startTime = new Date(session.question_started_at).getTime()
      const deadline = startTime + timeLimit * 1000 + 4000 // 4s buffer
      const delay = Math.max(500, deadline - Date.now())

      selfHealTimerRef.current = setTimeout(async () => {
        try {
          await supabase.rpc('advance_question', { p_session_id: sessionId })
        } catch (err) {
          // Ignore error if already advanced by host
        }
      }, delay)
    }

    return () => {
      if (selfHealTimerRef.current) {
        clearTimeout(selfHealTimerRef.current)
      }
    }
  }, [session, currentQuestion, sessionId, supabase])

  // Host Action RPC Wrappers
  const advanceQuestion = useCallback(async () => {
    const { data, error } = await supabase.rpc('advance_question', { p_session_id: sessionId })
    if (error) throw error
    return data
  }, [sessionId, supabase])

  const goToQuestion = useCallback(async (questionIndex: number) => {
    const { data, error } = await supabase.rpc('go_to_question', {
      p_session_id: sessionId,
      p_question_index: questionIndex
    })
    if (error) throw error
    return data
  }, [sessionId, supabase])

  const revealAnswer = useCallback(async (questionId: string) => {
    const { data, error } = await supabase.rpc('reveal_answer', {
      p_session_id: sessionId,
      p_question_id: questionId
    })
    if (error) throw error
    return data
  }, [sessionId, supabase])

  const revealFinalResults = useCallback(async () => {
    const { data, error } = await supabase.rpc('reveal_final_results', {
      p_session_id: sessionId
    })
    if (error) throw error
    return data
  }, [sessionId, supabase])

  const endSession = useCallback(async () => {
    const { data, error } = await supabase.rpc('end_session', {
      p_session_id: sessionId
    })
    if (error) throw error
    return data
  }, [sessionId, supabase])

  return {
    session,
    questions,
    currentQuestion,
    loading,
    error,
    refreshData,
    advanceQuestion,
    goToQuestion,
    revealAnswer,
    revealFinalResults,
    endSession
  }
}
