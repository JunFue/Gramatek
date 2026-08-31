import { QuizBuilder } from '@/components/QuizBuilder'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export default async function EditQuizPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 1. Fetch Quiz details
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .eq('educator_id', user.id)
    .single()

  if (quizError || !quiz) {
    notFound()
  }

  // 2. Fetch Quiz Cards
  const { data: cards } = await supabase
    .from('quiz_cards')
    .select('*')
    .eq('quiz_id', id)
    .order('order_index', { ascending: true })

  // 3. Fetch educator's classrooms
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('educator_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <QuizBuilder 
      classrooms={classrooms || []} 
      initialQuiz={quiz} 
      initialCards={cards || []} 
    />
  )
}
