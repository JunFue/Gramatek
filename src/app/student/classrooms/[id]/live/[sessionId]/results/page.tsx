import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { StudentLiveResultsClient } from './StudentLiveResultsClient'

export default async function StudentLiveResultsPage({
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

  // 3. Fetch Student Participant record
  const { data: participant } = await supabase
    .from('live_session_participants')
    .select(`
      *,
      profiles ( full_name, avatar_url )
    `)
    .eq('session_id', sessionId)
    .eq('student_id', user.id)
    .maybeSingle()

  // 4. Fetch Questions
  const { data: questions } = await supabase
    .from('live_session_questions')
    .select('*')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true })

  // 5. Fetch Answers for this student/group
  let answersQuery = supabase
    .from('live_session_answers')
    .select('*')
    .eq('session_id', sessionId)

  if (session.mode === 'group' && participant?.group_id) {
    answersQuery = answersQuery.eq('group_id', participant.group_id)
  } else {
    answersQuery = answersQuery.eq('student_id', user.id)
  }

  const { data: studentAnswers } = await answersQuery

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in">
      <StudentLiveResultsClient
        classroomId={classroomId}
        classroomName={classroom.name}
        session={session}
        currentUserId={user.id}
        participant={participant}
        questions={questions || []}
        studentAnswers={studentAnswers || []}
      />
    </div>
  )
}
