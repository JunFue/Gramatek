import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { Translate } from '@/components/Translate'

export default async function ClassroomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*, classroom_members(count)')
    .eq('educator_id', user?.id)
    .order('created_at', { ascending: false })

  const classroomIds = (classrooms || []).map((c: any) => c.id)

  let activeSessionsMap: Record<string, any> = {}
  if (classroomIds.length > 0) {
    const { data: activeSessions } = await supabase
      .from('live_sessions')
      .select('id, status, code, mode, classroom_id')
      .in('classroom_id', classroomIds)
      .neq('status', 'ended')

    if (activeSessions) {
      for (const s of activeSessions) {
        activeSessionsMap[s.classroom_id] = s
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in space-y-6 sm:space-y-8 md:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 mb-1 sm:mb-2"><Translate fil="Aking mga Silid-aralan" en="My Classrooms" /></h1>
          <p className="text-slate-600 text-xs sm:text-sm">Pamahalaan ang lahat ng iyong aktibo at naka-archive na silid-aralan.</p>
        </div>
        <Link href="/educator/classrooms/new" className="px-5 sm:px-6 py-2.5 sm:py-3 bg-brand-primary hover:bg-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shrink-0 w-full sm:w-auto text-xs sm:text-sm">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <Translate fil="Gumawa ng Silid-aralan" en="Create Classroom" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {classrooms && classrooms.length > 0 ? (
          classrooms.map((classroom) => {
            const activeSession = activeSessionsMap[classroom.id]

            return (
              <div key={classroom.id} className={`bg-white border rounded-2xl p-5 sm:p-6 flex flex-col relative overflow-hidden group shadow-md transition-all ${
                activeSession ? 'border-amber-400 ring-2 ring-amber-300/50' : 'border-slate-200 hover:border-brand-primary/50'
              }`}>
                {activeSession && (
                  <div className="bg-amber-500 text-white px-3 py-1 -mx-5 -mt-5 mb-3 sm:-mx-6 sm:-mt-6 sm:mb-4 flex items-center justify-between text-xs font-black shadow-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      LIVE SESSION BUKAS ({activeSession.status === 'lobby' ? 'LOBBY' : 'QUESTION'})
                    </span>
                    <Link
                      href={`/educator/classrooms/${classroom.id}/live/${activeSession.id}/host`}
                      className="underline hover:text-amber-100 cursor-pointer"
                    >
                      Bumalik sa Host ➔
                    </Link>
                  </div>
                )}

                <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
                  <h3 className="text-lg sm:text-xl font-heading font-bold text-slate-900 truncate pr-3">{classroom.name}</h3>
                  <span className={`px-2.5 py-0.5 sm:py-1 rounded-md text-xs font-bold shrink-0 ${classroom.is_active ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                    {classroom.is_active ? 'Aktibo' : 'Naka-archive'}
                  </span>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6 line-clamp-2 relative z-10 flex-1 font-medium">{classroom.description || 'Walang paglalarawan.'}</p>
                
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Users className="w-4 h-4 text-brand-primary" />
                      <span>{classroom.classroom_members?.[0]?.count || 0} / {classroom.enrollment_limit} <Translate fil="Mag-aaral" en="Students" /></span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 font-bold">Kodigo: {classroom.enrollment_code}</span>
                    <Link
                      href={`/educator/classrooms/${classroom.id}`}
                      className="text-brand-primary font-bold hover:translate-x-1 transition-transform flex items-center gap-1"
                    >
                      <Translate fil="Tingnan" en="View Hub" /> →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-md">
             <p className="text-slate-600 mb-4 font-medium text-xs sm:text-sm"><Translate fil="Wala ka pang nalilikhang mga silid-aralan." en="You haven't created any classrooms yet." /></p>
             <Link href="/educator/classrooms/new" className="text-brand-primary font-bold hover:underline text-xs sm:text-sm"><Translate fil="Lumikha ng iyong una" en="Create your first one" /></Link>
          </div>
        )}
      </div>

    </div>
  )
}
