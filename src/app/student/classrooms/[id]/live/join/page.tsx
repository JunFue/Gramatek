import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export default async function StudentClassroomLiveJoinDirectPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: classroomId } = await params
  const supabase = await createClient()

  // Find latest active live session for this classroom
  const { data: session } = await supabase
    .from('live_sessions')
    .select('id')
    .eq('classroom_id', classroomId)
    .in('status', ['lobby', 'question', 'reveal'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (session) {
    redirect(`/student/classrooms/${classroomId}/live/${session.id}`)
  }

  redirect(`/student/classrooms/${classroomId}`)
}
