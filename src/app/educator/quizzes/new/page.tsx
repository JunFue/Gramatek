import { QuizBuilder } from '@/components/QuizBuilder'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CreateQuizPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const resolvedSearchParams = await searchParams
  const defaultClassroomId = typeof resolvedSearchParams?.classroom === 'string' ? resolvedSearchParams.classroom : undefined

  // Fetch educator's classrooms
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('educator_id', user?.id)
    .order('created_at', { ascending: false })

  if (!classrooms || classrooms.length === 0) {
    // If they have no classrooms, they shouldn't be making a quiz
    redirect('/educator/classrooms/new')
  }

  return <QuizBuilder classrooms={classrooms} defaultClassroomId={defaultClassroomId} />
}
