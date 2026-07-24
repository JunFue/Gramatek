import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { QuizPlayer } from '@/components/QuizPlayer'

export default async function PlayQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Verify access and get quiz info
  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`
      *,
      classrooms!inner ( id, classroom_members!inner(student_id) )
    `)
    .eq('id', id)
    .eq('is_published', true)
    .eq('classrooms.classroom_members.student_id', user.id)
    .single()

  if (!quiz) notFound()

  // 1. Mastery Mode check
  let pastAttemptsCount = 0
  if (quiz.game_mode === 'mastery' && quiz.max_attempts) {
    const { count } = await supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', id)
      .eq('student_id', user.id)

    pastAttemptsCount = count || 0
    if (pastAttemptsCount >= quiz.max_attempts) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="glass p-10 rounded-3xl max-w-md w-full border border-white/10">
            <h1 className="text-2xl font-heading font-bold text-white mb-4">Attempt Limit Reached</h1>
            <p className="text-slate-400 mb-8">You have used all {quiz.max_attempts} attempts for this Mastery Mode quiz.</p>
            <a href={`/student/quiz/${id}/results`} className="px-6 py-3 bg-brand-primary text-white rounded-xl font-medium inline-block">View Results</a>
          </div>
        </div>
      )
    }
  }

  // 2. Scheduled Mission check
  if (quiz.game_mode === 'scheduled') {
    const now = new Date()
    const start = quiz.scheduled_start ? new Date(quiz.scheduled_start) : null
    const end = quiz.scheduled_end ? new Date(quiz.scheduled_end) : null

    if (start && now < start) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="glass p-10 rounded-3xl max-w-md w-full border border-white/10">
            <h1 className="text-2xl font-heading font-bold text-white mb-4">Mission Locked</h1>
            <p className="text-slate-400 mb-8">This mission opens on {start.toLocaleString()}.</p>
            <a href={`/student/classrooms/${quiz.classroom_id}`} className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium inline-block">Go Back</a>
          </div>
        </div>
      )
    }
    if (end && now > end) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="glass p-10 rounded-3xl max-w-md w-full border border-white/10 border-red-500/20">
            <h1 className="text-2xl font-heading font-bold text-white mb-4">Mission Expired</h1>
            <p className="text-slate-400 mb-8">This mission closed on {end.toLocaleString()}.</p>
            <a href={`/student/classrooms/${quiz.classroom_id}`} className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium inline-block">Go Back</a>
          </div>
        </div>
      )
    }
  }

  // Get cards
  const { data: cards } = await supabase
    .from('quiz_cards')
    .select('*')
    .eq('quiz_id', id)
    .order('order_index', { ascending: true })

  if (!cards || cards.length === 0) {
    return <div className="p-8 text-center text-white">This quiz has no questions yet!</div>
  }

  // Handle shuffle
  let playableCards = [...cards]
  if (quiz.shuffle_questions) {
    playableCards = playableCards.sort(() => Math.random() - 0.5)
  }
  if (quiz.shuffle_options) {
    playableCards = playableCards.map(c => {
      if (c.question_type === 'multiple_choice' && c.options) {
        // Create an array of indices [0, 1, 2, 3] and shuffle them
        const indices = c.options.map((_: any, i: number) => i).sort(() => Math.random() - 0.5)
        const shuffledOptions = indices.map((idx: number) => c.options![idx])
        // Need to update the correct_answer index relative to the shuffle
        const newCorrectIndex = indices.indexOf(c.correct_answer)
        return { ...c, options: shuffledOptions, correct_answer: newCorrectIndex }
      }
      return c
    })
  }

  return (
    <div className="absolute inset-0 bg-background z-50">
      <QuizPlayer quiz={quiz} cards={playableCards} pastAttemptsCount={pastAttemptsCount} />
    </div>
  )
}
