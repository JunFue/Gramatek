import { createClient } from '@/lib/supabase/server'
import { Users, FileQuestion, Plus, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

export default async function EducatorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { count: classroomsCount } = await supabase.from('classrooms').select('*', { count: 'exact', head: true }).eq('educator_id', user?.id)
  const { count: quizzesCount } = await supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('educator_id', user?.id)

  const { data: allClassrooms } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('educator_id', user?.id)

  const classroomIds = (allClassrooms || []).map((c: any) => c.id)

  let activeLiveSessions: any[] = []
  if (classroomIds.length > 0) {
    const { data: sessions } = await supabase
      .from('live_sessions')
      .select(`
        id,
        status,
        mode,
        created_at,
        classroom_id,
        classrooms ( id, name, enrollment_code ),
        live_session_participants ( student_id, removed_at )
      `)
      .in('classroom_id', classroomIds)
      .neq('status', 'ended')
      .order('created_at', { ascending: false })

    activeLiveSessions = sessions || []
  }

  const { data: recentClassrooms } = await supabase
    .from('classrooms')
    .select('*')
    .eq('educator_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative z-10 space-y-6 sm:space-y-8 md:space-y-10">
      {/* Active Live Session Alert Banners */}
      {activeLiveSessions && activeLiveSessions.length > 0 && (
        <div className="space-y-3">
          {activeLiveSessions.map((ls: any) => {
            const activeCount = (ls.live_session_participants || []).filter((p: any) => !p.removed_at).length
            const isLobby = ls.status === 'lobby' || ls.status === 'setup'
            return (
              <div 
                key={ls.id} 
                className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in border-2 border-white/30 relative overflow-hidden"
              >
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/40 shadow-inner">
                    <span className="w-4 h-4 rounded-full bg-white animate-ping" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-orange-600 shadow-xs">
                        {isLobby ? '⏳ LOBBY BUKAS' : '🔴 LIVE LARO / SESYON'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/20 text-white border border-white/20">
                        {ls.mode === 'group' ? 'Pangkatang Laban' : 'Indibidwal'}
                      </span>
                      {ls.classrooms?.enrollment_code && (
                        <span className="text-xs font-mono font-black bg-white/20 px-2 py-0.5 rounded-md">
                          PIN: {ls.classrooms.enrollment_code}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-heading font-black">
                      {ls.classrooms?.name} • May Kasalukuyang Aktibong Live Session!
                    </h2>
                    <p className="text-white/90 text-xs font-semibold mt-0.5">
                      {activeCount} mga mag-aaral ang kasalukuyang nakasali sa sesyong ito.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 relative z-10 self-start md:self-auto shrink-0">
                  <a
                    href={`/educator/classrooms/${ls.classroom_id}/live/${ls.id}/display`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-white/30 cursor-pointer"
                  >
                    <span>Display Screen ↗</span>
                  </a>
                  <Link
                    href={`/educator/classrooms/${ls.classroom_id}/live/${ls.id}/host`}
                    className="px-5 py-2.5 bg-white hover:bg-amber-50 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Bumalik sa Host Panel ➔</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <header>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-brand-primary mb-1 sm:mb-2">
          <Translate fil="Maligayang Pagbabalik!" en="Welcome back!" />
        </h1>
        <p className="text-[#5a6b5a] font-bold text-xs sm:text-sm md:text-base"><Translate fil="Narito ang mga kaganapan sa iyong mga silid-aralan ngayong araw." en="Here's what's happening in your classrooms today." /></p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-light/40 flex items-center justify-center border border-brand-accent/20 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />
            </div>
            <h3 className="text-[#5a6b5a] font-bold text-xs sm:text-sm truncate"><Translate fil="Mga Silid" en="Classrooms" /></h3>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-black text-brand-primary">{classroomsCount || 0}</p>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center border border-brand-accent/30 shrink-0">
              <FileQuestion className="w-4 h-4 sm:w-5 sm:h-5 text-brand-secondary" />
            </div>
            <h3 className="text-[#5a6b5a] font-bold text-xs sm:text-sm truncate"><Translate fil="Pagsusulit" en="Quizzes" /></h3>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-black text-brand-primary">{quizzesCount || 0}</p>
        </div>

        {/* Quick Actions */}
        <Link href="/educator/classrooms/new" className="card hover:shadow-md p-4 sm:p-6 flex flex-col items-center justify-center text-center group border-dashed transition-all active:scale-95">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-light/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-brand-primary group-hover:text-white text-brand-secondary transition-all">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-brand-primary font-bold text-xs sm:text-sm leading-tight"><Translate fil="Bagong Silid" en="New Room" /></span>
        </Link>

        <Link href="/educator/quizzes/new" className="card hover:shadow-md p-4 sm:p-6 flex flex-col items-center justify-center text-center group border-dashed transition-all active:scale-95">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-light/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-brand-primary group-hover:text-white text-brand-secondary transition-all">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-brand-primary font-bold text-xs sm:text-sm leading-tight"><Translate fil="Bagong Pagsusulit" en="New Quiz" /></span>
        </Link>
      </div>

      {/* Recent Classrooms */}
      <div>
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-brand-primary">
            <Translate fil="Mga Kasalukuyang Silid-aralan" en="Recent Classrooms" />
          </h2>
        </div>
        
        {recentClassrooms && recentClassrooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recentClassrooms.map((classroom) => (
              <Link key={classroom.id} href={`/educator/classrooms/${classroom.id}`} className="card-hover p-5 sm:p-6 flex flex-col group">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-heading font-bold text-brand-primary truncate pr-3">{classroom.name}</h3>
                  <span className={classroom.is_active ? 'badge-active' : 'badge-inactive'}>
                    {classroom.is_active ? 'Aktibo' : 'Naka-archive'}
                  </span>
                </div>
                <p className="text-[#5a6b5a] text-xs sm:text-sm mb-4 sm:mb-6 line-clamp-2 flex-1 font-medium">{classroom.description || 'Walang paglalarawan.'}</p>
                
                <div className="pt-3 sm:pt-4 border-t border-[#d4ddd0] flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#5a6b5a] font-mono bg-brand-light/20 px-2 py-1 rounded border border-brand-accent/20 font-bold">Kodigo: {classroom.enrollment_code}</span>
                  <span className="text-brand-primary font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <Translate fil="Pamahalaan" en="Manage" /> →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-brand-accent mb-4" />
            <h3 className="text-lg sm:text-xl font-heading font-bold text-brand-primary mb-2">
              <Translate fil="Wala pang silid-aralan" en="No classrooms yet" />
            </h3>
            <p className="text-[#5a6b5a] max-w-md mx-auto mb-6 font-medium text-xs sm:text-sm"><Translate fil="Gumawa ng iyong unang silid-aralan." en="Create your first classroom." /></p>
            <Link href="/educator/classrooms/new" className="btn-primary text-sm sm:text-base py-2.5 px-6">
              <Translate fil="Gumawa ng Silid-aralan" en="Create Classroom" />
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}
