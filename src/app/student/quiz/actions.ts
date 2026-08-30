'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PREBUILT_QUIZ_UUIDS, getPrebuiltQuizById } from '@/lib/data/filipino-trivia'

export async function submitQuizAttempt(
  quiz_id: string, 
  score: number, 
  total_questions: number, 
  time_taken_seconds: number, 
  answers: any,
  metadata?: any // V2 Game Mode data
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const prebuilt = getPrebuiltQuizById(quiz_id)
  const dbQuizId = prebuilt ? prebuilt.uuid : quiz_id

  // Save Attempt
  const attemptData: any = {
    quiz_id: dbQuizId,
    student_id: user.id,
    score,
    total_questions,
    time_taken_seconds,
    answers: {
      ...(typeof answers === 'object' && answers !== null ? answers : {}),
      is_practice: !!prebuilt,
      quiz_title: prebuilt?.title || undefined,
      level_id: prebuilt?.id || undefined,
    }
  }

  if (metadata) {
    attemptData.game_mode = metadata.game_mode
    attemptData.streak_max = metadata.streak_max
    attemptData.streak_score = metadata.streak_score
    attemptData.eliminated_at_card = metadata.eliminated_at_card
  }

  try {
    const { error } = await supabase
      .from('quiz_attempts')
      .insert(attemptData)

    if (error) {
      console.warn('Database attempt insert notice:', error.message)
      // If error is FK constraint or RLS in practice mode, return gracefully
      if (prebuilt) {
        return { success: true, is_practice: true, local_fallback: true }
      }
      throw new Error(`Failed to save attempt: ${error.message}`)
    }
  } catch (err: any) {
    if (prebuilt) {
      console.warn('Practice attempt saved locally:', err?.message)
      return { success: true, is_practice: true, local_fallback: true }
    }
    throw err
  }

  // Revalidate relevant pages
  revalidatePath('/student/performance')
  revalidatePath('/student/practice')
  revalidatePath('/student')

  // Find classroom ID if classroom quiz
  if (!prebuilt) {
    const { data: quiz } = await supabase.from('quizzes').select('classroom_id').eq('id', quiz_id).single()
    if (quiz?.classroom_id) {
      revalidatePath(`/student/classrooms/${quiz.classroom_id}`)
    }
  }
  
  return { success: true, is_practice: !!prebuilt }
}
