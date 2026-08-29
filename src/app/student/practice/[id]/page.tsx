import { PREBUILT_QUIZZES } from '@/lib/data/filipino-trivia'
import { QuizPlayer } from '@/components/QuizPlayer'
import { notFound } from 'next/navigation'

export default function PracticeGamePlayer({ params, searchParams }: { params: { id: string }, searchParams: { mode?: string } }) {
  const staticQuiz = PREBUILT_QUIZZES.find(q => q.id === params.id)
  if (!staticQuiz) return notFound()

  // Construct a database-like Quiz object
  const quiz = {
    id: staticQuiz.id,
    title: staticQuiz.title,
    description: staticQuiz.description,
    time_limit_seconds: staticQuiz.time_limit_seconds,
    game_mode: searchParams.mode || 'mastery',
    max_attempts: 1,
    streak_multiplier: searchParams.mode === 'survival',
    survival_strikes: 3,
    is_practice: true
  }

  return (
    <QuizPlayer 
       quiz={quiz}
       cards={staticQuiz.cards}
       pastAttemptsCount={0}
    />
  )
}
