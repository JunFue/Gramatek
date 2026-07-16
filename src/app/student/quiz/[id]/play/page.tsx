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

  // Get cards
  const { data: cards } = await supabase
    .from('quiz_cards')
    .select('*')
    .eq('quiz_id', id)
    .order('order_index', { ascending: true })

  if (!cards || cards.length === 0) {
    return <div className="p-8 text-center text-white">This quiz has no questions yet!</div>
  }

  return (
    <div className="absolute inset-0 bg-background z-50">
      {/* Hide the layout sidebar entirely by jumping out with fixed positioning or treating this as a full screen route */}
      <QuizPlayer quiz={quiz} cards={cards} />
    </div>
  )
}
