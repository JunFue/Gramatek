import { PREBUILT_QUIZZES, getPrebuiltQuizById } from '@/lib/data/filipino-trivia'
import { QuizPlayer } from '@/components/QuizPlayer'
import { notFound } from 'next/navigation'

export default async function PracticeGamePlayer({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }> 
}) {
  const { id } = await params
  const { mode } = await searchParams

  const staticQuiz = getPrebuiltQuizById(id)
  if (!staticQuiz) return notFound()

  // Construct a database-like Quiz object
  const quiz = {
    id: staticQuiz.id,
    uuid: staticQuiz.uuid,
    title: staticQuiz.title,
    description: staticQuiz.description,
    time_limit_seconds: staticQuiz.time_limit_seconds,
    game_mode: mode || 'mastery',
    max_attempts: 1,
    streak_multiplier: mode === 'survival',
    survival_strikes: 3,
    is_practice: true,
    total_points: staticQuiz.total_points,
    points_per_item: staticQuiz.points_per_item
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50">
      <QuizPlayer 
         quiz={quiz}
         cards={staticQuiz.cards}
         pastAttemptsCount={0}
      />
    </div>
  )
}
