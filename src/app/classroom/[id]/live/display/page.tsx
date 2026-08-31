import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export default async function ClassroomLiveDisplayPage({
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
    .neq('status', 'ended')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (session) {
    redirect(`/educator/classrooms/${classroomId}/live/${session.id}/display`)
  }

  // Fallback: check most recent ended session
  const { data: latest } = await supabase
    .from('live_sessions')
    .select('id')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest) {
    redirect(`/educator/classrooms/${classroomId}/live/${latest.id}/display`)
  }

  notFound()
}
