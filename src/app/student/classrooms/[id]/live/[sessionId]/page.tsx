import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, ArrowLeft } from 'lucide-react'
import { Translate } from '@/components/Translate'
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

  // If session is still in setup (educator still configuring in wizard)
  if (session.status === 'setup') {
    return (
      <div className="p-4 md:p-8 max-w-md mx-auto my-12 animate-fade-in">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-black text-slate-900 leading-tight">
              <Translate fil="Naghahanda Pa ang Guro" en="Educator is Setting Up" />
            </h2>
            <p className="text-slate-600 text-sm font-medium leading-relaxed">
              <Translate
                fil="Kasalukuyan pang inihahanda at inaayos ng guro ang mga tanong at patakaran para sa Live Session na ito. Hindi pa bukas ang lobby para sa pagsali. Mangyaring maghintay sa silid-aralan hanggang sa buksan ang opisyal na Lobby."
                en="The educator is currently configuring the questions and gameplay for this live session. The lobby is not yet open. Please wait in your classroom until the official lobby opens."
              />
            </p>
          </div>
          <Link
            href={`/student/classrooms/${classroomId}`}
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-brand-primary hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <Translate fil="Bumalik sa Silid-aralan" en="Back to Classroom" />
          </Link>
        </div>
      </div>
    )
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
