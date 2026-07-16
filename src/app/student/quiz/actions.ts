'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitQuizAttempt(quiz_id: string, score: number, total_questions: number, time_taken_seconds: number, answers: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Save Attempt
  const { error } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id,
      student_id: user.id,
      score,
      total_questions,
      time_taken_seconds,
      answers
    })

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
