'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveQuiz(
  classroom_id: string, 
  title: string, 
  description: string, 
  time_limit_seconds: number, 
  is_published: boolean, 
  cards: any[],
  config?: any // V2 Game Mode Config
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // 1. Create Quiz Record
  const quizData: any = {
    classroom_id,
    educator_id: user.id,
    title,
    description,
    time_limit_seconds,
    is_published
  }

  // Inject V2 fields if provided
  if (config) {
    quizData.game_mode = config.gameMode || 'mastery'
    quizData.max_attempts = config.maxAttempts
    quizData.scoring_method = config.scoringMethod || 'highest'
    quizData.scheduled_start = config.scheduledStart ? new Date(config.scheduledStart).toISOString() : null
    quizData.scheduled_end = config.scheduledEnd ? new Date(config.scheduledEnd).toISOString() : null
    quizData.survival_strikes = config.survivalStrikes || 3
    quizData.streak_multiplier = config.streakMultiplier || false
    quizData.shuffle_questions = config.shuffleQuestions || false
    quizData.shuffle_options = config.shuffleOptions || false
  }

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert(quizData)
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
      time_limit_override: c.timeLimitOverride || null
    }))

    const { error: cardsError } = await supabase
      .from('quiz_cards')
      .insert(cardsToInsert)

    if (cardsError) {
      console.error('Failed to save quiz cards:', cardsError)
      throw new Error('Failed to save quiz cards')
    }
  }

  // 3. Create Notifications if scheduled
  if (is_published && config?.gameMode === 'scheduled') {
    // Get all students in the classroom
    const { data: members } = await supabase
      .from('classroom_members')
      .select('student_id')
      .eq('classroom_id', classroom_id)

    if (members && members.length > 0) {
      const { data: classroom } = await supabase.from('classrooms').select('name').eq('id', classroom_id).single()
      const notifications = members.map(member => ({
        user_id: member.student_id,
        title: 'New Scheduled Mission',
        body: `A new mission "${title}" has been scheduled in ${classroom?.name}.`,
        link: `/student/classrooms/${classroom_id}`,
      }))

      await supabase.from('notifications').insert(notifications)
    }
  }

  // 4. Revalidate and Navigate back
  revalidatePath(`/educator/classrooms/${classroom_id}`)
  revalidatePath('/educator')
  redirect(`/educator/quizzes/${quiz.id}`)
}
