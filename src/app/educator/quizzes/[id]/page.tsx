import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { QuizDetailClient } from './QuizDetailClient'

export default async function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 1. Fetch Quiz + Classroom Info
  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`
      *,
      classrooms ( id, name, enrollment_code )
    `)
    .eq('id', id)
    .eq('educator_id', user.id)
    .single()

  if (!quiz) notFound()

  // 2. Fetch Cards
  const { data: cards } = await supabase
    .from('quiz_cards')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('order_index', { ascending: true })

  // 3. Fetch Attempts
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      profiles ( full_name, avatar_url )
    `)
    .eq('quiz_id', quiz.id)
    .order('score', { ascending: false })

  return (
    <QuizDetailClient 
      quiz={quiz} 
      cards={cards || []} 
      attempts={attempts || []} 
    />
  )
}
