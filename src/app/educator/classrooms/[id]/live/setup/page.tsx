import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { SetupWizardClient } from './SetupWizardClient'

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

  // 2. Fetch all Quizzes and Drafts created by this educator
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select(`
      id,
      title,
      description,
      is_published,
      classroom_id,
      classrooms ( name ),
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
    .eq('educator_id', user.id)
    .order('created_at', { ascending: false })

  // Transform available drafts
  const availableDrafts = (quizzes || []).map((quiz: any) => ({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    is_published: quiz.is_published,
    classroom_id: quiz.classroom_id,
    classroom_name: quiz.classrooms?.name || 'Ibang Silid',
    cards: (quiz.cards || []).map((card: any) => ({
      id: card.id,
      quiz_id: quiz.id,
      quiz_title: quiz.title,
      question_text: card.question_text,
      question_type: card.question_type || 'multiple_choice',
      options: card.options || [],
      correct_answer: card.correct_answer,
      time_limit: card.time_limit_override || null
    }))
  }))

  // 3. Fetch active unended session if any
  const { data: activeSession } = await supabase
    .from('live_sessions')
    .select('id, status')
    .eq('classroom_id', classroomId)
    .neq('status', 'ended')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
      <SetupWizardClient
        classroomId={classroomId}
        classroomName={classroom.name}
        availableDrafts={availableDrafts}
        duplicateFromId={duplicate_from}
        activeSession={activeSession || null}
      />
    </div>
  )
}
