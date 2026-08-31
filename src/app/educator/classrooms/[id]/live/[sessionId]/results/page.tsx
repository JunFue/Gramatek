import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { EducatorLiveResultsClient } from './EducatorLiveResultsClient'

export default async function EducatorLiveResultsPage({
  params
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id: classroomId, sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // 1. Fetch Classroom
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('id', classroomId)
    .eq('educator_id', user.id)
    .single()

  if (!classroom) {
    notFound()
  }

  // 2. Fetch Session
  const { data: session } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('classroom_id', classroomId)
    .single()

  if (!session) {
    notFound()
  }

  // 3. Fetch Questions
  const { data: questions } = await supabase
    .from('live_session_questions')
    .select('*')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true })

  // 4. Fetch Participants
  const { data: participants } = await supabase
    .from('live_session_participants')
    .select(`
      *,
      profiles (
        full_name,
        avatar_url
      )
    `)
    .eq('session_id', sessionId)

  // 5. Fetch Groups
  const { data: groups } = await supabase
    .from('live_session_groups')
    .select(`
      *,
      profiles:leader_id (
        full_name,
        avatar_url
      )
    `)
    .eq('session_id', sessionId)

  // 6. Fetch Answers
  const { data: answers } = await supabase
    .from('live_session_answers')
    .select(`
      *,
      profiles ( full_name, avatar_url ),
      live_session_groups ( label )
    `)
    .eq('session_id', sessionId)

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto animate-fade-in">
      <EducatorLiveResultsClient
        classroomId={classroomId}
        classroomName={classroom.name}
        session={session}
        questions={questions || []}
        participants={participants || []}
        groups={groups || []}
        answers={answers || []}
      />
    </div>
  )
}
