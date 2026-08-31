import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { SetupWizardClient } from './SetupWizardClient'
import { PREBUILT_QUIZZES } from '@/lib/data/filipino-trivia'

export default async function LiveSessionSetupPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ duplicate_from?: string }>
}) {
  const { id: classroomId } = await params
  const { duplicate_from } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // 1. Verify Classroom ownership
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name, enrollment_limit')
    .eq('id', classroomId)
    .eq('educator_id', user.id)
    .single()

  if (!classroom) {
    notFound()
  }

  // 2. Fetch all Quiz Cards from quizzes in this classroom
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select(`
      id,
      title,
      cards:quiz_cards (
        id,
        question_text,
        question_type,
        options,
        correct_answer,
        time_limit_override,
        order_index
      )
    `)
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  // Transform available cards
  const availableCards: Array<{
    id: string
    quiz_title: string
    question_text: string
    options: any
    correct_answer: any
    time_limit?: number | null
  }> = []

  quizzes?.forEach((quiz) => {
    quiz.cards?.forEach((card: any) => {
      availableCards.push({
        id: card.id,
        quiz_title: quiz.title,
        question_text: card.question_text,
        options: card.options,
        correct_answer: card.correct_answer,
        time_limit: card.time_limit_override
      })
    })
  })

  // Also include pre-built trivia cards for easy instant testing/selection
  const prebuiltCards: Array<{
    id: string
    quiz_title: string
    question_text: string
    options: any
    correct_answer: any
    time_limit?: number | null
  }> = []

  PREBUILT_QUIZZES.forEach((quiz) => {
    quiz.cards.forEach((card) => {
      prebuiltCards.push({
        id: card.id,
        quiz_title: quiz.title,
        question_text: card.question_text,
        options: card.options || [],
        correct_answer: card.correct_answer,
        time_limit: card.points ? quiz.time_limit_seconds : null
      })
    })
  })

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
      <SetupWizardClient
        classroomId={classroomId}
        classroomName={classroom.name}
        availableCards={availableCards}
        prebuiltCards={prebuiltCards}
        duplicateFromId={duplicate_from}
      />
    </div>
  )
}
