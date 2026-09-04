'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface LiveQuestionInput {
  id?: string
  prompt: string
  choices: unknown
  correct_answer: string | number
  time_limit_seconds?: number | null
}

export async function createLiveSessionAction(formData: {
  classroom_id: string
  mode: 'individual' | 'group'
  capacity: number
  pacing: 'manual' | 'timed'
  default_time_limit_seconds: number | null
  randomize_choices: boolean
  randomize_question_order: boolean
  reveal_mode: 'auto_per_question' | 'manual_per_question' | 'end_of_session'
  quiz_id?: string | null
  question_ids?: string[]
  per_question_time_limits?: number[]
  questions?: LiveQuestionInput[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. End any stale unended sessions for this classroom so students aren't stuck in zombie sessions
  await supabase
    .from('live_sessions')
    .update({ status: 'ended' })
    .eq('classroom_id', formData.classroom_id)
    .neq('status', 'ended')

  // 2. Create Session
  const { data: sessionId, error: sessionErr } = await supabase.rpc('create_live_session', {
    p_classroom_id: formData.classroom_id,
    p_mode: formData.mode,
    p_capacity: formData.capacity,
    p_pacing: formData.pacing,
    p_default_time_limit_seconds: formData.default_time_limit_seconds,
    p_randomize_choices: formData.randomize_choices,
    p_randomize_question_order: formData.randomize_question_order,
    p_reveal_mode: formData.reveal_mode,
    p_quiz_id: formData.quiz_id || null
  })

  if (sessionErr || !sessionId) {
    console.error('Failed to create live session:', sessionErr)
    throw new Error(sessionErr?.message || 'Failed to create live session')
  }

  // 3. Add Questions directly to live_session_questions
  if (formData.questions && formData.questions.length > 0) {
    let questionsList = [...formData.questions]
    if (formData.randomize_question_order) {
      questionsList = questionsList.sort(() => Math.random() - 0.5)
    }

    const rows = questionsList.map((q, idx) => {
      let normalizedCorrectAnswer = String(q.correct_answer ?? '')
      if (Array.isArray(q.choices) && typeof q.correct_answer === 'number') {
        const choiceAtIdx = q.choices[q.correct_answer]
        if (typeof choiceAtIdx === 'string') {
          normalizedCorrectAnswer = choiceAtIdx
        } else if (choiceAtIdx && typeof choiceAtIdx === 'object') {
          const cObj = choiceAtIdx as Record<string, unknown>
          normalizedCorrectAnswer = String(cObj.text || cObj.label || cObj.option || q.correct_answer)
        }
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.id || '')

      return {
        session_id: sessionId,
        source_question_id: isUuid ? q.id : null,
        order_index: idx,
        prompt: q.prompt,
        choices: Array.isArray(q.choices) ? q.choices : [],
        correct_answer: normalizedCorrectAnswer,
        time_limit_seconds: q.time_limit_seconds || formData.default_time_limit_seconds || 30
      }
    })

    const { error: qErr } = await supabase
      .from('live_session_questions')
      .insert(rows)

    if (qErr) {
      console.error('Failed to insert live session questions:', qErr)
      throw new Error(qErr?.message || 'Failed to add questions')
    }
  } else if (formData.question_ids && formData.question_ids.length > 0) {
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

  // 4. Set newly created session to 'lobby' so the lobby is officially open for students
  await supabase
    .from('live_sessions')
    .update({ status: 'lobby' })
    .eq('id', sessionId)

  revalidatePath(`/educator/classrooms/${formData.classroom_id}`)
  revalidatePath(`/student/classrooms/${formData.classroom_id}`)
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

export async function recordLiveSessionScoresAction(sessionId: string, record: boolean) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('record_live_session_scores', {
    p_session_id: sessionId,
    p_record: record
  })
  if (error) throw new Error(error.message)
  revalidatePath('/educator/classrooms')
  return data
}

