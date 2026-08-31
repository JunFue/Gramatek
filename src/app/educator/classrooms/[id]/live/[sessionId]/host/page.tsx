import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { HostControlPanelClient } from './HostControlPanelClient'

export default async function LiveSessionHostPage({
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

  // 1. Fetch Classroom details
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name, enrollment_code')
    .eq('id', classroomId)
    .eq('educator_id', user.id)
    .single()

  if (!classroom) {
    notFound()
  }

  // 2. Fetch Session details
  const { data: session } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('classroom_id', classroomId)
    .single()

  if (!session) {
    notFound()
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <HostControlPanelClient
        classroomId={classroomId}
        classroomName={classroom.name}
        enrollmentCode={classroom.enrollment_code}
        initialSession={session}
      />
    </div>
  )
}
