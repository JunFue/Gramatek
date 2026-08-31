'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createLiveSessionAction(formData: {
  classroom_id: string
  mode: 'individual' | 'group'
  capacity: number
  pacing: 'manual' | 'timed'
  default_time_limit_seconds: number | null
  randomize_choices: boolean
  randomize_question_order: boolean
  reveal_mode: 'auto_per_question' | 'manual_per_question' | 'end_of_session'
  question_ids: string[]
  per_question_time_limits?: number[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Create Session
  const { data: sessionId, error: sessionErr } = await supabase.rpc('create_live_session', {
    p_classroom_id: formData.classroom_id,
    p_mode: formData.mode,
    p_capacity: formData.capacity,
    p_pacing: formData.pacing,
    p_default_time_limit_seconds: formData.default_time_limit_seconds,
    p_randomize_choices: formData.randomize_choices,
    p_randomize_question_order: formData.randomize_question_order,
    p_reveal_mode: formData.reveal_mode
  })

  if (sessionErr || !sessionId) {
    console.error('Failed to create live session:', sessionErr)
    throw new Error(sessionErr?.message || 'Failed to create live session')
  }

  // 2. Add Questions
  if (formData.question_ids && formData.question_ids.length > 0) {
    const { error: qErr } = await supabase.rpc('add_questions_to_session', {
      p_session_id: sessionId,
      p_source_question_ids: formData.question_ids,
      p_per_question_time_limits: formData.per_question_time_limits || null
    })

    if (qErr) {
      console.error('Failed to add questions to live session:', qErr)
      throw new Error(qErr?.message || 'Failed to add questions')
    }
  }

  revalidatePath(`/educator/classrooms/${formData.classroom_id}`)
  return { success: true, sessionId }
}

export async function startLiveSessionAction(sessionId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('start_session', { p_session_id: sessionId })
  if (error) throw new Error(error.message)
  return data
}

export async function advanceQuestionAction(sessionId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('advance_question', { p_session_id: sessionId })
  if (error) throw new Error(error.message)
  return data
}

export async function goToQuestionAction(sessionId: string, questionIndex: number) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('go_to_question', {
    p_session_id: sessionId,
    p_question_index: questionIndex
  })
  if (error) throw new Error(error.message)
  return data
}

export async function removeParticipantAction(sessionId: string, studentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('remove_participant', {
    p_session_id: sessionId,
    p_student_id: studentId
  })
  if (error) throw new Error(error.message)
  return data
}

export async function forceAssignLeaderAction(sessionId: string, groupId: string, studentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('force_assign_leader', {
    p_session_id: sessionId,
    p_group_id: groupId,
    p_student_id: studentId
  })
  if (error) throw new Error(error.message)
  return data
}

export async function revealAnswerAction(sessionId: string, questionId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('reveal_answer', {
    p_session_id: sessionId,
    p_question_id: questionId
  })
  if (error) throw new Error(error.message)
  return data
}

export async function revealFinalResultsAction(sessionId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('reveal_final_results', { p_session_id: sessionId })
  if (error) throw new Error(error.message)
  return data
}

export async function endSessionAction(sessionId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('end_session', { p_session_id: sessionId })
  if (error) throw new Error(error.message)
  return data
}

export async function duplicateSessionAction(sourceSessionId: string) {
  const supabase = await createClient()
  const { data: newSessionId, error } = await supabase.rpc('duplicate_session', {
    p_source_session_id: sourceSessionId
  })
  if (error) throw new Error(error.message)
  return { success: true, newSessionId }
}
