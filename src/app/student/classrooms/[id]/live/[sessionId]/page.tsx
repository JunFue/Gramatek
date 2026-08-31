import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { StudentLivePlayerClient } from './StudentLivePlayerClient'

export default async function StudentLiveSessionPage({
  params
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id: classroomId, sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/signin?next=/student/classrooms/${classroomId}/live/${sessionId}`)
  }

  // 1. Verify classroom exists
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('id', classroomId)
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

  // 3. Fetch User profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <StudentLivePlayerClient
        classroomId={classroomId}
        classroomName={classroom.name}
        initialSession={session}
        currentUserId={user.id}
        userName={profile?.full_name || 'Mag-aaral'}
        userAvatar={profile?.avatar_url || null}
      />
    </div>
  )
}
