import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CopyButton } from '@/components/ui/CopyButton'
import { User, FileQuestion, ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch Classroom details
  const { data: classroom } = await supabase
    .from('classrooms')
    .select(`
      *,
      members:classroom_members (
        student_id,
        joined_at,
        profiles ( full_name, avatar_url )
      )
    `)
    .eq('id', id)
    .eq('educator_id', user?.id)
    .single()

  if (!classroom) {
    notFound()
  }

  // 2. Fetch quizzes for this classroom
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, is_published, time_limit_seconds, created_at')
    .eq('classroom_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in relative">
      <Link href="/educator/classrooms" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 relative z-10">
        <ArrowLeft className="w-4 h-4" />
        Back to Classrooms
      </Link>

      <div className="glass-strong rounded-3xl p-8 mb-8 border border-white/10 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 right-10 w-48 h-48 bg-brand-primary/20 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-heading font-bold text-white">{classroom.name}</h1>
              <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${classroom.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {classroom.is_active ? 'Active' : 'Archived'}
              </span>
            </div>
            <p className="text-slate-400 max-w-2xl text-lg">{classroom.description || 'No description provided.'}</p>
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 shrink-0 shadow-inner flex flex-col items-center justify-center min-w-[200px]">
             <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Enrollment Code</p>
             <div className="flex items-center gap-3">
               <span className="text-3xl font-mono font-bold text-brand-primary tracking-widest">{classroom.enrollment_code}</span>
               <CopyButton text={classroom.enrollment_code} />
             </div>
             <p className="text-slate-500 text-xs mt-2">
               {classroom.members?.length || 0} / {classroom.enrollment_limit} enrolled
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Main Content Area (Quizzes) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-brand-secondary" />
              Classroom Quizzes
            </h2>
            <Link href={`/educator/quizzes/new?classroom=${classroom.id}`} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-full transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Quiz
            </Link>
          </div>

          {quizzes && quizzes.length > 0 ? (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <Link href={`/educator/quizzes/${quiz.id}`} key={quiz.id} className="block glass card-hover rounded-xl p-5 border border-white/5 group">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-white font-medium text-lg group-hover:text-brand-primary transition-colors">{quiz.title}</h3>
                      <div className="flex items-center gap-3 text-slate-400 text-sm mt-1">
                        <span>{Math.floor(quiz.time_limit_seconds / 60)} min limit</span>
                        <span>•</span>
                        <span>Created {new Date(quiz.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${quiz.is_published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {quiz.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-subtle rounded-xl p-10 text-center flex flex-col items-center">
               <FileQuestion className="w-10 h-10 text-slate-600 mb-3" />
               <p className="text-slate-400 mb-4">No quizzes have been created yet.</p>
               <Link href={`/educator/quizzes/new?classroom=${classroom.id}`} className="text-brand-primary hover:underline font-medium">Create the first quiz</Link>
            </div>
          )}
        </div>

        {/* Sidebar Area (Students) */}
        <div>
          <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-brand-accent" />
            Enrolled Students
          </h2>
          
          <div className="glass rounded-xl border border-white/5 overflow-hidden">
            {classroom.members && classroom.members.length > 0 ? (
              <ul className="divide-y divide-white/5">
                {classroom.members.map((member: any, i: number) => (
                  <li key={i} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0">
                      {member.profiles?.avatar_url ? (
                        <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-800"><User className="w-5 h-5" /></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{member.profiles?.full_name || 'Unknown Student'}</p>
                      <p className="text-slate-500 text-xs">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center bg-white/[0.02]">
                <p className="text-slate-400 text-sm">No students have joined yet.</p>
                <p className="text-slate-500 text-xs mt-2">Share the code <strong className="text-slate-300">{classroom.enrollment_code}</strong></p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
