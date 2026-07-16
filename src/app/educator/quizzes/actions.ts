'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveQuiz(classroom_id: string, title: string, description: string, time_limit_seconds: number, is_published: boolean, cards: any[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // 1. Create Quiz Record
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      classroom_id,
      educator_id: user.id,
      title,
      description,
      time_limit_seconds,
      is_published
    })
    .select('id')
    .single()

  if (quizError || !quiz) {
    console.error('Failed to create quiz:', quizError)
    throw new Error('Failed to create quiz')
  }

  // 2. Insert Quiz Cards
  if (cards && cards.length > 0) {
    const cardsToInsert = cards.map((c, index) => ({
      quiz_id: quiz.id,
      question_type: c.type,
      question_text: c.text,
      options: c.options || [],
      correct_answer: c.correctAnswer,
      order_index: index,
    }))

    const { error: cardsError } = await supabase
      .from('quiz_cards')
      .insert(cardsToInsert)

    if (cardsError) {
      console.error('Failed to save quiz cards:', cardsError)
      // Note: We might want to rollback the quiz here in a real prod env
      throw new Error('Failed to save quiz cards')
    }
  }

  // 3. Revalidate and Navigate back
  revalidatePath(`/educator/classrooms/${classroom_id}`)
  revalidatePath('/educator')
  redirect(`/educator/quizzes/${quiz.id}`)
}
