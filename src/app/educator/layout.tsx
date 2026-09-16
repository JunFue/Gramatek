import { createClient } from '@/lib/supabase/server'
import { EducatorSidebar } from '@/components/EducatorSidebar'
import { EducatorLiveSessionBanner } from '@/components/live/EducatorLiveSessionBanner'
import { redirect } from 'next/navigation'

export default async function EducatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  // Fetch any active unended live session created by or in classrooms of this educator
  const { data: educatorClassrooms } = await supabase
    .from('classrooms')
    .select('id')
    .eq('educator_id', user.id)

  const classroomIds = (educatorClassrooms || []).map((c: any) => c.id)

  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  let activeLiveSession: any = null

  if (classroomIds.length > 0) {
    const { data: sessions } = await supabase
      .from('live_sessions')
      .select(`
        id,
        status,
        mode,
        classroom_id,
        classrooms ( id, name, enrollment_code )
      `)
      .in('classroom_id', classroomIds)
      .in('status', ['lobby', 'question', 'reveal'])
      .gte('created_at', twelveHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    activeLiveSession = sessions?.[0] || null
  }

  return (
    <div className="h-[100dvh] w-full bg-transparent flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar & Mobile Navigation Shell */}
      <EducatorSidebar profile={profile} activeSession={activeLiveSession} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Global Active Live Session Banner for Educator */}
        <EducatorLiveSessionBanner initialSession={activeLiveSession} />

        <main className={`flex-1 relative z-10 h-full overflow-y-auto bg-transparent text-foreground custom-scrollbar ${
          activeLiveSession ? 'pb-20 md:pb-0' : 'pt-16 pb-20 md:pt-0 md:pb-0'
        }`}>
          {children}
        </main>
      </div>
    </div>
  )
}

