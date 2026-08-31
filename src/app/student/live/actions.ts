'use server'

import { createClient } from '@/lib/supabase/server'

export async function joinLiveSessionAction(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('join_live_session', {
    p_session_id: sessionId,
    p_student_id: user.id
  })

  if (error) throw new Error(error.message)
  return data
}

export async function submitAnswerAction(sessionId: string, questionId: string, answer: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('submit_answer', {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_answer: answer,
    p_submitter_id: user.id
  })

  if (error) throw new Error(error.message)
  return data
}

export async function castLeaderVoteAction(sessionId: string, groupId: string, candidateId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('cast_leader_vote', {
    p_session_id: sessionId,
    p_group_id: groupId,
    p_candidate_id: candidateId,
    p_voter_id: user.id
  })

  if (error) throw new Error(error.message)
  return data
}
