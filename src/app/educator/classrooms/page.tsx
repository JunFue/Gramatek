import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'

export default async function ClassroomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*, classroom_members(count)')
    .eq('educator_id', user?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">My Classrooms</h1>
          <p className="text-slate-400">Manage all your active and archived classrooms.</p>
        </div>
        <Link href="/educator/classrooms/new" className="px-6 py-2.5 bg-brand-primary hover:bg-blue-500 text-white font-medium rounded-full flex items-center gap-2 transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/20 shrink-0 self-start md:self-auto">
          <Plus className="w-5 h-5" />
          Create Classroom
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms && classrooms.length > 0 ? (
          classrooms.map((classroom) => (
            <Link key={classroom.id} href={`/educator/classrooms/${classroom.id}`} className="glass card-hover rounded-2xl p-6 flex flex-col relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-2xl font-heading font-bold text-white truncate pr-4">{classroom.name}</h3>
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 ${classroom.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {classroom.is_active ? 'Active' : 'Archived'}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-6 line-clamp-2 relative z-10 flex-1">{classroom.description || 'No description provided.'}</p>
              
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>{classroom.classroom_members?.[0]?.count || 0} / {classroom.enrollment_limit} Students</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-mono bg-white/5 px-2 py-1 rounded">Code: {classroom.enrollment_code}</span>
                  <span className="text-brand-primary group-hover:translate-x-1 transition-transform">View Hub →</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full glass-subtle rounded-2xl p-12 text-center flex flex-col items-center justify-center">
             <p className="text-slate-400 mb-4">You haven't created any classrooms yet.</p>
             <Link href="/educator/classrooms/new" className="text-brand-primary font-medium hover:underline">Create your first one</Link>
          </div>
        )}
      </div>

    </div>
  )
}
