import { createClient } from '@/lib/supabase/server'
import { Users, FileQuestion, Plus, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

export default async function EducatorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch some stats (simplified for MVP)
  const { count: classroomsCount } = await supabase.from('classrooms').select('*', { count: 'exact', head: true }).eq('educator_id', user?.id)
  const { count: quizzesCount } = await supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('educator_id', user?.id)

  const { data: recentClassrooms } = await supabase
    .from('classrooms')
    .select('*')
    .eq('educator_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in relative z-10">
      <header className="mb-10">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 mb-2">
          <Translate fil="Maligayang Pagbabalik!" en="Welcome back!" />
        </h1>
        <p className="text-slate-600 font-medium">Narito ang mga kaganapan sa iyong mga silid-aralan ngayong araw.</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Users className="w-5 h-5 text-brand-primary" />
            </div>
            <h3 className="text-slate-600 font-bold text-sm">Mga Silid-aralan (Classrooms)</h3>
          </div>
          <p className="text-4xl font-heading font-black text-slate-900">{classroomsCount || 0}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
              <FileQuestion className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="text-slate-600 font-bold text-sm">Mga Pagsusulit (Quizzes)</h3>
          </div>
          <p className="text-4xl font-heading font-black text-slate-900">{quizzesCount || 0}</p>
        </div>

        {/* Quick Actions */}
        <Link href="/educator/classrooms/new" className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center group border border-dashed border-slate-300 transition-all shadow-sm hover:shadow-md">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-3 group-hover:bg-brand-primary group-hover:text-white text-slate-500 transition-all border border-slate-200 group-hover:border-brand-primary shadow-sm">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-slate-800 font-bold text-sm"><Translate fil="Bagong Silid-aralan" en="New Classroom" /></span>
        </Link>

        <Link href="/educator/quizzes/new" className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center group border border-dashed border-slate-300 transition-all shadow-sm hover:shadow-md">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-3 group-hover:bg-brand-primary group-hover:text-white text-slate-500 transition-all border border-slate-200 group-hover:border-brand-primary shadow-sm">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-slate-800 font-bold text-sm"><Translate fil="Bagong Pagsusulit" en="New Quiz" /></span>
        </Link>
      </div>

      {/* Recent Classrooms */}
      <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">
        <Translate fil="Mga Kasalukuyang Silid-aralan" en="Recent Classrooms" />
      </h2>
      
      {recentClassrooms && recentClassrooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentClassrooms.map((classroom) => (
            <Link key={classroom.id} href={`/educator/classrooms/${classroom.id}`} className="bg-white border border-slate-200 hover:border-brand-primary/50 rounded-2xl p-6 flex flex-col relative overflow-hidden group shadow-md transition-all">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-xl font-heading font-bold text-slate-900 truncate pr-4">{classroom.name}</h3>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${classroom.is_active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                  {classroom.is_active ? 'Aktibo' : 'Naka-archive'}
                </span>
              </div>
              <p className="text-slate-600 text-sm mb-6 line-clamp-2 relative z-10 flex-1 font-medium">{classroom.description || 'Walang paglalarawan.'}</p>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm relative z-10">
                <span className="text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 font-bold">Kodigo: {classroom.enrollment_code}</span>
                <span className="text-brand-primary font-bold group-hover:translate-x-1 transition-transform">
                  <Translate fil="Pamahalaan" en="Manage" /> →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-md">
          <BookOpen className="w-12 h-12 text-slate-400 mb-4" />
          <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">
            <Translate fil="Wala pang silid-aralan" en="No classrooms yet" />
          </h3>
          <p className="text-slate-600 max-w-md mx-auto mb-6 font-medium">Gumawa ng iyong unang silid-aralan upang makakuha ng kodigo para sa mga mag-aaral.</p>
          <Link href="/educator/classrooms/new" className="px-6 py-3 bg-brand-primary hover:bg-blue-600 text-white rounded-xl font-bold transition-colors shadow-md">
            <Translate fil="Gumawa ng Silid-aralan" en="Create Classroom" />
          </Link>
        </div>
      )}

    </div>
  )
}
