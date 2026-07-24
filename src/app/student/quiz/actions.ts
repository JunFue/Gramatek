'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  // Save Attempt
  const attemptData: any = {
    quiz_id,
    student_id: user.id,
    score,
    total_questions,
    time_taken_seconds,
    answers
  }

  if (metadata) {
    attemptData.game_mode = metadata.game_mode
    attemptData.streak_max = metadata.streak_max
    attemptData.streak_score = metadata.streak_score
    attemptData.eliminated_at_card = metadata.eliminated_at_card
  }

  const { error } = await supabase
    .from('quiz_attempts')
    .insert(attemptData)

  if (error) {
    console.error('Failed to save attempt:', error)
    throw new Error('Failed to save attempt')
  }

  // Find the classroom ID to revalidate
  const { data: quiz } = await supabase.from('quizzes').select('classroom_id').eq('id', quiz_id).single()
  
  if (quiz) {
    revalidatePath(`/student/classrooms/${quiz.classroom_id}`)
  }
  
  return { success: true }
}
