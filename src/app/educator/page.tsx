import { createClient } from '@/lib/supabase/server'
import { Users, FileQuestion, Plus, BookOpen } from 'lucide-react'
import Link from 'next/link'

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
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <header className="mb-10">
        <h1 className="text-3xl font-heading font-bold text-white mb-2">Welcome back!</h1>
        <p className="text-slate-400">Here's what's happening in your classrooms today.</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-primary" />
            </div>
            <h3 className="text-slate-400 font-medium">Classrooms</h3>
          </div>
          <p className="text-4xl font-heading font-bold text-white">{classroomsCount || 0}</p>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <FileQuestion className="w-5 h-5 text-brand-secondary" />
            </div>
            <h3 className="text-slate-400 font-medium">Quizzes</h3>
          </div>
          <p className="text-4xl font-heading font-bold text-white">{quizzesCount || 0}</p>
        </div>

        {/* Quick Actions */}
        <Link href="/educator/classrooms/new" className="glass-subtle card-hover rounded-2xl p-6 flex flex-col items-center justify-center text-center group border border-dashed border-white/20">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-brand-primary group-hover:text-white text-slate-400 transition-all">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-white font-medium">New Classroom</span>
        </Link>

        <Link href="/educator/quizzes/new" className="glass-subtle card-hover rounded-2xl p-6 flex flex-col items-center justify-center text-center group border border-dashed border-white/20">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-brand-secondary group-hover:text-white text-slate-400 transition-all">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-white font-medium">New Quiz</span>
        </Link>
      </div>

      {/* Recent Classrooms */}
      <h2 className="text-xl font-heading font-bold text-white mb-6">Recent Classrooms</h2>
      
      {recentClassrooms && recentClassrooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentClassrooms.map((classroom) => (
            <Link key={classroom.id} href={`/educator/classrooms/${classroom.id}`} className="glass card-hover rounded-2xl p-6 flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-[50px] -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-100" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-xl font-heading font-bold text-white truncate pr-4">{classroom.name}</h3>
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 ${classroom.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {classroom.is_active ? 'Active' : 'Archived'}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-6 line-clamp-2 relative z-10 flex-1">{classroom.description || 'No description provided.'}</p>
              
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-sm relative z-10">
                <span className="text-slate-500 font-mono bg-white/5 px-2 py-1 rounded">Code: {classroom.enrollment_code}</span>
                <span className="text-brand-primary group-hover:translate-x-1 transition-transform">Manage →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="glass-subtle rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <BookOpen className="w-12 h-12 text-slate-500 mb-4" />
          <h3 className="text-xl font-heading font-semibold text-white mb-2">No classrooms yet</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">Create your first classroom to get an enrollment code and start inviting students.</p>
          <Link href="/educator/classrooms/new" className="px-6 py-2.5 bg-brand-primary hover:bg-blue-500 text-white rounded-full font-medium transition-colors">
            Create Classroom
          </Link>
        </div>
      )}

    </div>
  )
}
