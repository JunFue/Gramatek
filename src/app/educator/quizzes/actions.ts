'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveQuiz(
  classroom_id: string, 
  title: string, 
  description: string, 
  time_limit_seconds: number, 
  is_published: boolean, 
  cards: any[],
  config?: any // Game Mode Config & Reveal Settings
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // 1. Create Quiz Record
  const quizData: any = {
    classroom_id,
    educator_id: user.id,
    title: title.trim(),
    description: description?.trim() || null,
    time_limit_seconds,
    is_published,
    feedback_timing: config?.feedbackTiming || 'immediate'
  }

  // Inject game mode fields if provided
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
    quizData.feedback_timing = config.feedbackTiming || 'immediate'
  }

  let insertRes = await supabase
    .from('quizzes')
    .insert(quizData)
    .select('id')
    .single()

  // If column feedback_timing is missing in DB schema, retry without it
  if (insertRes.error && (insertRes.error.message.includes('feedback_timing') || insertRes.error.code === 'PGRST204')) {
    const { feedback_timing, ...dataWithoutFeedback } = quizData
    insertRes = await supabase
      .from('quizzes')
      .insert(dataWithoutFeedback)
      .select('id')
      .single()
  }

  const { data: quiz, error: quizError } = insertRes

  if (quizError || !quiz) {
    console.error('Failed to create quiz:', quizError)
    return { error: quizError?.message || 'Failed to create quiz' }
  }

  // 2. Insert Quiz Cards
  if (cards && cards.length > 0) {
    const cardsToInsert = cards.map((c, index) => ({
      quiz_id: quiz.id,
      question_type: c.type || c.question_type,
      question_text: c.text || c.question_text,
      options: c.options || [],
      correct_answer: c.correctAnswer !== undefined ? c.correctAnswer : c.correct_answer,
      order_index: index,
      time_limit_override: c.timeLimitOverride || c.time_limit_override || null
    }))

    const { error: cardsError } = await supabase
      .from('quiz_cards')
      .insert(cardsToInsert)

    if (cardsError) {
      console.error('Failed to save quiz cards:', cardsError)
      if (cardsError.message?.includes('quiz_cards_question_type_check')) {
        return { 
          error: 'Kailangang patakbuhin ang Migration 007 sa Supabase SQL Editor upang suportahan ang mga bagong uri ng kard (Word Scramble, Tama/Mali, Sentence Scramble).' 
        }
      }
      return { error: cardsError?.message || 'Failed to save quiz cards' }
    }
  }

  // 3. Create Notifications if scheduled and published
  if (is_published && config?.gameMode === 'scheduled') {
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

  // 4. Revalidate and Return quizId for client navigation
  revalidatePath(`/educator/classrooms/${classroom_id}`)
  revalidatePath(`/student/classrooms/${classroom_id}`)
  revalidatePath('/educator')
  revalidatePath('/student')
  return { success: true, quizId: quiz.id }
}

export async function updateQuiz(
  quiz_id: string,
  classroom_id: string,
  title: string,
  description: string,
  time_limit_seconds: number,
  is_published: boolean,
  cards: any[],
  config?: any
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // 1. Verify ownership
  const { data: existingQuiz, error: fetchError } = await supabase
    .from('quizzes')
    .select('id, classroom_id, is_published')
    .eq('id', quiz_id)
    .eq('educator_id', user.id)
    .single()

  if (fetchError || !existingQuiz) {
    return { error: 'Quiz not found or you do not have permission to edit it.' }
  }

  // 2. Update Quiz Record
  const quizUpdates: any = {
    classroom_id,
    title: title.trim(),
    description: description?.trim() || null,
    time_limit_seconds,
    is_published,
    feedback_timing: config?.feedbackTiming || 'immediate'
  }

  if (config) {
    quizUpdates.game_mode = config.gameMode || 'mastery'
    quizUpdates.max_attempts = config.maxAttempts
    quizUpdates.scoring_method = config.scoringMethod || 'highest'
    quizUpdates.scheduled_start = config.scheduledStart ? new Date(config.scheduledStart).toISOString() : null
    quizUpdates.scheduled_end = config.scheduledEnd ? new Date(config.scheduledEnd).toISOString() : null
    quizUpdates.survival_strikes = config.survivalStrikes || 3
    quizUpdates.streak_multiplier = config.streakMultiplier || false
    quizUpdates.shuffle_questions = config.shuffleQuestions || false
    quizUpdates.shuffle_options = config.shuffleOptions || false
    quizUpdates.feedback_timing = config.feedbackTiming || 'immediate'
  }

  let { error: updateError } = await supabase
    .from('quizzes')
    .update(quizUpdates)
    .eq('id', quiz_id)
    .eq('educator_id', user.id)

  if (updateError && (updateError.message.includes('feedback_timing') || updateError.code === 'PGRST204')) {
    const { feedback_timing, ...updatesWithoutFeedback } = quizUpdates
    const retry = await supabase
      .from('quizzes')
      .update(updatesWithoutFeedback)
      .eq('id', quiz_id)
      .eq('educator_id', user.id)
    updateError = retry.error
  }

  if (updateError) {
    console.error('Failed to update quiz:', updateError)
    return { error: updateError.message || 'Failed to update quiz' }
  }

  // 3. Synchronize Quiz Cards: Delete existing cards and insert updated cards deck
  const { error: deleteCardsError } = await supabase
    .from('quiz_cards')
    .delete()
    .eq('quiz_id', quiz_id)

  if (deleteCardsError) {
    console.error('Failed to clear previous cards:', deleteCardsError)
    return { error: deleteCardsError.message || 'Failed to update quiz cards' }
  }

  if (cards && cards.length > 0) {
    const cardsToInsert = cards.map((c, index) => ({
      quiz_id,
      question_type: c.type || c.question_type,
      question_text: c.text || c.question_text,
      options: c.options || [],
      correct_answer: c.correctAnswer !== undefined ? c.correctAnswer : c.correct_answer,
      order_index: index,
      time_limit_override: c.timeLimitOverride || c.time_limit_override || null
    }))

    const { error: insertCardsError } = await supabase
      .from('quiz_cards')
      .insert(cardsToInsert)

    if (insertCardsError) {
      console.error('Failed to insert updated quiz cards:', insertCardsError)
      if (insertCardsError.message?.includes('quiz_cards_question_type_check')) {
        return { 
          error: 'Kailangang patakbuhin ang Migration 007 sa Supabase SQL Editor upang suportahan ang mga bagong uri ng kard (Word Scramble, Tama/Mali, Sentence Scramble).' 
        }
      }
      return { error: insertCardsError.message || 'Failed to update quiz cards' }
    }
  }

  // 4. Revalidate cache
  revalidatePath(`/educator/quizzes/${quiz_id}`)
  revalidatePath(`/educator/quizzes/${quiz_id}/edit`)
  revalidatePath(`/educator/classrooms/${classroom_id}`)
  if (existingQuiz.classroom_id !== classroom_id) {
    revalidatePath(`/educator/classrooms/${existingQuiz.classroom_id}`)
    revalidatePath(`/student/classrooms/${existingQuiz.classroom_id}`)
  }
  revalidatePath(`/student/classrooms/${classroom_id}`)
  revalidatePath(`/student/quiz/${quiz_id}/play`)
  revalidatePath('/educator')
  revalidatePath('/student')

  return { success: true, quizId: quiz_id }
}

export async function withdrawQuiz(quiz_id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: quiz, error: fetchError } = await supabase
    .from('quizzes')
    .select('id, classroom_id, title')
    .eq('id', quiz_id)
    .eq('educator_id', user.id)
    .single()

  if (fetchError || !quiz) {
    return { error: 'Quiz not found or unauthorized' }
  }

  const { error: updateError } = await supabase
    .from('quizzes')
    .update({ is_published: false })
    .eq('id', quiz_id)
    .eq('educator_id', user.id)

  if (updateError) {
    return { error: updateError.message || 'Failed to withdraw quiz' }
  }

  revalidatePath(`/educator/quizzes/${quiz_id}`)
  revalidatePath(`/educator/classrooms/${quiz.classroom_id}`)
  revalidatePath(`/student/classrooms/${quiz.classroom_id}`)
  revalidatePath('/educator')
  revalidatePath('/student')

  return { success: true, message: 'Nai-withdraw ang pagsusulit. Naka-draft na ito ngayon.' }
}

export async function publishQuiz(quiz_id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: quiz, error: fetchError } = await supabase
    .from('quizzes')
    .select('id, classroom_id, title, game_mode')
    .eq('id', quiz_id)
    .eq('educator_id', user.id)
    .single()

  if (fetchError || !quiz) {
    return { error: 'Quiz not found or unauthorized' }
  }

  const { error: updateError } = await supabase
    .from('quizzes')
    .update({ is_published: true })
    .eq('id', quiz_id)
    .eq('educator_id', user.id)

  if (updateError) {
    return { error: updateError.message || 'Failed to publish quiz' }
  }

  // If scheduled, notify classroom members
  if (quiz.game_mode === 'scheduled') {
    const { data: members } = await supabase
      .from('classroom_members')
      .select('student_id')
      .eq('classroom_id', quiz.classroom_id)

    if (members && members.length > 0) {
      const { data: classroom } = await supabase.from('classrooms').select('name').eq('id', quiz.classroom_id).single()
      const notifications = members.map(member => ({
        user_id: member.student_id,
        title: 'New Scheduled Mission',
        body: `A new mission "${quiz.title}" has been published in ${classroom?.name}.`,
        link: `/student/classrooms/${quiz.classroom_id}`,
      }))

      await supabase.from('notifications').insert(notifications)
    }
  }

  revalidatePath(`/educator/quizzes/${quiz_id}`)
  revalidatePath(`/educator/classrooms/${quiz.classroom_id}`)
  revalidatePath(`/student/classrooms/${quiz.classroom_id}`)
  revalidatePath('/educator')
  revalidatePath('/student')

  return { success: true, message: 'Matagumpay na nailathala ang pagsusulit!' }
}

export async function deleteQuiz(quiz_id: string, classroom_id?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error: deleteError } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quiz_id)
    .eq('educator_id', user.id)

  if (deleteError) {
    return { error: deleteError.message || 'Failed to delete quiz' }
  }

  if (classroom_id) {
    revalidatePath(`/educator/classrooms/${classroom_id}`)
    revalidatePath(`/student/classrooms/${classroom_id}`)
  }
  revalidatePath('/educator')
  revalidatePath('/student')

  return { success: true }
}
