import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DisplayClient } from './DisplayClient'

export default async function LiveSessionDisplayPage({
  params
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id: classroomId, sessionId } = await params
  const supabase = await createClient()

  // 1. Fetch Classroom details
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name, enrollment_code')
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 flex flex-col justify-between animate-fade-in">
      <DisplayClient
        classroomId={classroomId}
        classroomName={classroom.name}
        enrollmentCode={classroom.enrollment_code}
        initialSession={session}
      />
    </div>
  )
}
