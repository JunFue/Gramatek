import { createClient } from '@/lib/supabase/server'
import { Users, FileQuestion, Plus, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

export default async function EducatorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
        <h1 className="text-3xl font-heading font-extrabold text-brand-primary mb-2">
          <Translate fil="Maligayang Pagbabalik!" en="Welcome back!" />
        </h1>
        <p className="text-[#5a6b5a] font-bold"><Translate fil="Narito ang mga kaganapan sa iyong mga silid-aralan ngayong araw." en="Here's what's happening in your classrooms today." /></p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-light/40 flex items-center justify-center border border-brand-accent/20">
              <Users className="w-5 h-5 text-brand-primary" />
            </div>
            <h3 className="text-[#5a6b5a] font-bold text-sm"><Translate fil="Mga Silid-aralan" en="Classrooms" /></h3>
          </div>
          <p className="text-4xl font-heading font-black text-brand-primary">{classroomsCount || 0}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center border border-brand-accent/30">
              <FileQuestion className="w-5 h-5 text-brand-secondary" />
            </div>
            <h3 className="text-[#5a6b5a] font-bold text-sm"><Translate fil="Mga Pagsusulit" en="Quizzes" /></h3>
          </div>
          <p className="text-4xl font-heading font-black text-brand-primary">{quizzesCount || 0}</p>
        </div>

        {/* Quick Actions */}
        <Link href="/educator/classrooms/new" className="card hover:shadow-md p-6 flex flex-col items-center justify-center text-center group border-dashed transition-all">
          <div className="w-10 h-10 rounded-full bg-brand-light/30 flex items-center justify-center mb-3 group-hover:bg-brand-primary group-hover:text-white text-brand-secondary transition-all">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-brand-primary font-bold text-sm"><Translate fil="Bagong Silid-aralan" en="New Classroom" /></span>
        </Link>

        <Link href="/educator/quizzes/new" className="card hover:shadow-md p-6 flex flex-col items-center justify-center text-center group border-dashed transition-all">
          <div className="w-10 h-10 rounded-full bg-brand-light/30 flex items-center justify-center mb-3 group-hover:bg-brand-primary group-hover:text-white text-brand-secondary transition-all">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-brand-primary font-bold text-sm"><Translate fil="Bagong Pagsusulit" en="New Quiz" /></span>
        </Link>
      </div>

      {/* Recent Classrooms */}
      <div className="mb-6">
        <h2 className="text-2xl font-heading font-bold text-brand-primary">
          <Translate fil="Mga Kasalukuyang Silid-aralan" en="Recent Classrooms" />
        </h2>
      </div>
      
      {recentClassrooms && recentClassrooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentClassrooms.map((classroom) => (
            <Link key={classroom.id} href={`/educator/classrooms/${classroom.id}`} className="card-hover p-6 flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-heading font-bold text-brand-primary truncate pr-4">{classroom.name}</h3>
                <span className={classroom.is_active ? 'badge-active' : 'badge-inactive'}>
                  {classroom.is_active ? 'Aktibo' : 'Naka-archive'}
                </span>
              </div>
              <p className="text-[#5a6b5a] text-sm mb-6 line-clamp-2 flex-1 font-medium">{classroom.description || 'Walang paglalarawan.'}</p>
              
              <div className="pt-4 border-t border-[#d4ddd0] flex items-center justify-between text-sm">
                <span className="text-[#5a6b5a] font-mono bg-brand-light/20 px-2 py-1 rounded border border-brand-accent/20 font-bold">Kodigo: {classroom.enrollment_code}</span>
                <span className="text-brand-primary font-bold group-hover:translate-x-1 transition-transform">
                  <Translate fil="Pamahalaan" en="Manage" /> →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <BookOpen className="w-12 h-12 text-brand-accent mb-4" />
          <h3 className="text-xl font-heading font-bold text-brand-primary mb-2">
            <Translate fil="Wala pang silid-aralan" en="No classrooms yet" />
          </h3>
          <p className="text-[#5a6b5a] max-w-md mx-auto mb-6 font-medium"><Translate fil="Gumawa ng iyong unang silid-aralan." en="Create your first classroom." /></p>
          <Link href="/educator/classrooms/new" className="btn-primary">
            <Translate fil="Gumawa ng Silid-aralan" en="Create Classroom" />
          </Link>
        </div>
      )}

    </div>
  )
}
