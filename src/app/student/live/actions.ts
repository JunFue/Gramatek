'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveQuestionType } from '@/lib/utils/live-questions'

export async function joinLiveSessionAction(sessionId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Kailangang mag-sign in upang sumali sa sesyon.' }
    }

    const { data, error } = await supabase.rpc('join_live_session', {
      p_session_id: sessionId,
      p_student_id: user.id
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nagkaroon ng aberya sa pagsali sa sesyon.' }
  }
}

export async function submitAnswerAction(sessionId: string, questionId: string, answer: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { is_correct: false, points_awarded: 0, error: 'Hindi naka-sign in.' }
    }

    let answerToSubmit = answer.trim()

    // Query question to support flexible matching for enumeration and scramble
    const { data: q } = await supabase
      .from('live_session_questions')
      .select('correct_answer, choices')
      .eq('id', questionId)
      .single()

    if (q) {
      const qType = resolveQuestionType(q)
      if (qType === 'enumeration') {
        const rawTarget = String(q.correct_answer || '')
        const accepted = rawTarget.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
        const userItems = answerToSubmit.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
        const uniqueUser = Array.from(new Set(userItems))
        const matches = uniqueUser.filter((u) => accepted.includes(u))

        // If user provided valid answers matching the expected items in any order
        if (matches.length > 0 && matches.length === uniqueUser.length && uniqueUser.length >= Math.min(2, accepted.length)) {
          answerToSubmit = q.correct_answer
        }
      } else if (qType === 'sentence_scramble') {
        const normalizeSentence = (s: string) =>
          (s || '').toLowerCase().replace(/['"’“”,.!?\-–—]/g, ' ').replace(/\s+/g, ' ').trim()
        if (normalizeSentence(answerToSubmit) === normalizeSentence(q.correct_answer)) {
          answerToSubmit = q.correct_answer
        }
      } else if (qType === 'word_scramble') {
        if (answerToSubmit.trim().toUpperCase() === String(q.correct_answer || '').trim().toUpperCase()) {
          answerToSubmit = q.correct_answer
        }
      }
    }

    const { data, error } = await supabase.rpc('submit_answer', {
      p_session_id: sessionId,
      p_question_id: questionId,
      p_answer: answerToSubmit,
      p_submitter_id: user.id
    })

    if (error) {
      return { is_correct: false, points_awarded: 0, error: error.message }
    }

    return data
  } catch (err: any) {
    return { is_correct: false, points_awarded: 0, error: err?.message || 'Hindi naisumite ang sagot.' }
  }
}

export async function castLeaderVoteAction(sessionId: string, groupId: string, candidateId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Hindi naka-sign in.' }
    }

    const { data, error } = await supabase.rpc('cast_leader_vote', {
      p_session_id: sessionId,
      p_group_id: groupId,
      p_candidate_id: candidateId,
      p_voter_id: user.id
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nabigo sa pagboto.' }
  }
}
