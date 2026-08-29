import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CopyButton } from '@/components/ui/CopyButton'
import { User, FileQuestion, ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

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
      <Link href="/educator/classrooms" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-6 relative z-10 font-bold">
        <ArrowLeft className="w-4 h-4" />
        <Translate fil="Bumalik sa Mga Silid-aralan" en="Back to Classrooms" />
      </Link>

      <div className="bg-white rounded-3xl p-8 mb-8 border border-slate-200 shadow-md relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 right-10 w-48 h-48 bg-brand-primary/10 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-heading font-bold text-slate-900">{classroom.name}</h1>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${classroom.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {classroom.is_active ? 'Aktibo' : 'Naka-archive'}
              </span>
            </div>
            <p className="text-slate-600 max-w-2xl text-lg font-medium">{classroom.description || 'Walang ibinigay na paglalarawan.'}</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shrink-0 flex flex-col items-center justify-center min-w-[200px]">
             <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1"><Translate fil="Kodigo sa Pagpapatala" en="Enrollment Code" /></p>
             <div className="flex items-center gap-3">
               <span className="text-3xl font-mono font-black text-brand-primary tracking-widest">{classroom.enrollment_code}</span>
               <CopyButton text={classroom.enrollment_code} />
             </div>
             <p className="text-slate-500 text-xs mt-2 font-medium">
               {classroom.members?.length || 0} / {classroom.enrollment_limit} <Translate fil="nakatala" en="enrolled" />
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Main Content Area (Quizzes) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-brand-primary" />
              <Translate fil="Mga Pagsusulit" en="Classroom Quizzes" />
            </h2>
            <Link href={`/educator/quizzes/new?classroom=${classroom.id}`} className="px-4 py-2 bg-slate-100/50 hover:bg-slate-100 text-brand-primary border border-slate-200 text-sm font-bold rounded-full transition-colors flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              <Translate fil="Gumawa ng Pagsusulit" en="Create Quiz" />
            </Link>
          </div>

          {quizzes && quizzes.length > 0 ? (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <Link href={`/educator/quizzes/${quiz.id}`} key={quiz.id} className="block bg-white hover:border-brand-primary/50 shadow-sm rounded-xl p-5 border border-slate-200 group transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-slate-900 font-bold text-lg group-hover:text-brand-primary transition-colors">{quiz.title}</h3>
                      <div className="flex items-center gap-3 text-slate-500 font-medium text-sm mt-1">
                        <span>{Math.floor(quiz.time_limit_seconds / 60)} min <Translate fil="bypasa" en="limit" /></span>
                        <span>•</span>
                        <span>Nilikha {new Date(quiz.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${quiz.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {quiz.is_published ? 'Nailathala' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center flex flex-col items-center shadow-sm">
               <FileQuestion className="w-10 h-10 text-slate-400 mb-3" />
               <p className="text-slate-600 mb-4 font-medium"><Translate fil="Wala pang nilikhang mga pagsusulit." en="No quizzes have been created yet." /></p>
               <Link href={`/educator/quizzes/new?classroom=${classroom.id}`} className="text-brand-primary hover:underline font-bold"><Translate fil="Gumawa ng unang pagsusulit" en="Create the first quiz" /></Link>
            </div>
          )}
        </div>

        {/* Sidebar Area (Students) */}
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-900 flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-blue-500" />
            <Translate fil="Mga Nakatalang Mag-aaral" en="Enrolled Students" />
          </h2>
          
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {classroom.members && classroom.members.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {classroom.members.map((member: any, i: number) => (
                  <li key={i} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      {member.profiles?.avatar_url ? (
                        <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400"><User className="w-5 h-5" /></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-800 text-sm font-bold truncate">{member.profiles?.full_name || 'Hindi kilala'}</p>
                      <p className="text-slate-500 text-xs font-medium">Sumali noong {new Date(member.joined_at).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center bg-slate-50">
                <p className="text-slate-600 text-sm font-medium"><Translate fil="Wala pang sumaling mag-aaral." en="No students have joined yet." /></p>
                <p className="text-slate-500 text-xs mt-2 font-medium"><Translate fil="Ibahagi ang kodigong" en="Share the code" /> <strong className="text-slate-800">{classroom.enrollment_code}</strong></p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
