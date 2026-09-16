import { createClient } from '@/lib/supabase/server'
import { EducatorSidebar } from '@/components/EducatorSidebar'
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

  let activeLiveSession: any = null
  if (classroomIds.length > 0) {
    const { data: sessions } = await supabase
      .from('live_sessions')
      .select(`
        id,
        code,
        status,
        mode,
        classroom_id,
        classrooms ( id, name )
      `)
      .in('classroom_id', classroomIds)
      .neq('status', 'ended')
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
        {activeLiveSession && (
          <div className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-4 sm:px-6 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5 z-30 shrink-0 border-b border-white/20 mt-16 md:mt-0">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
              <span className="truncate">
                LIVE SESSION BUKAS: {activeLiveSession.classrooms?.name}
              </span>
              {activeLiveSession.code && (
                <span className="bg-black/20 px-2 py-0.5 rounded font-mono text-xs shrink-0">
                  PIN: {activeLiveSession.code}
                </span>
              )}
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-white text-slate-900 shrink-0">
                {activeLiveSession.status === 'lobby' ? 'LOBBY' : 'LIVE QUESTION'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/educator/classrooms/${activeLiveSession.classroom_id}/live/${activeLiveSession.id}/display`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all"
              >
                Display Screen ↗
              </a>
              <a
                href={`/educator/classrooms/${activeLiveSession.classroom_id}/live/${activeLiveSession.id}/host`}
                className="px-4 py-1.5 bg-white hover:bg-amber-50 text-slate-950 rounded-lg text-xs font-black shadow-sm transition-all active:scale-95"
              >
                Bumalik sa Host Panel ➔
              </a>
            </div>
          </div>
        )}

        <main className={`flex-1 relative z-10 h-full overflow-y-auto bg-transparent text-foreground custom-scrollbar ${
          activeLiveSession ? 'pb-20 md:pb-0' : 'pt-16 pb-20 md:pt-0 md:pb-0'
        }`}>
          {children}
        </main>
      </div>
    </div>
  )
}

