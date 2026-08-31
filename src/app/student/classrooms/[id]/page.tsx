import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, BookOpen } from 'lucide-react'
import { Translate } from '@/components/Translate'

export default async function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()

 if (!user) notFound()

 // 1. Fetch Classroom Info & Verify Enrollment
 const { data: classroom } = await supabase
 .from('classrooms')
 .select(`
 *,
 profiles!classrooms_educator_id_fkey ( full_name ),
 classroom_members!inner(student_id)
 `)
 .eq('id', id)
 .eq('classroom_members.student_id', user.id)
 .single()

 if (!classroom) notFound()

 // 2. Fetch Quizzes
 const { data: quizzes } = await supabase
 .from('quizzes')
 .select('id, title, description, time_limit_seconds')
 .eq('classroom_id', id)
 .eq('is_published', true)
 .order('created_at', { ascending: false })

 // 3. Fetch past attempts for this student in this classroom's quizzes
 const { data: attempts } = await supabase
 .from('quiz_attempts')
 .select('*, quizzes!inner(classroom_id)')
 .eq('student_id', user.id)
 .eq('quizzes.classroom_id', id)

  // 4. Check for active Live Session
  const { data: activeLiveSession } = await supabase
    .from('live_sessions')
    .select('id, status, mode')
    .eq('classroom_id', id)
    .neq('status', 'ended')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

 return (
 <div className="p-8 max-w-6xl mx-auto animate-fade-in relative z-10 transition-colors duration-300">
 
      {/* Active Live Session Banner */}
      {activeLiveSession && (
        <div className="mb-6 p-5 rounded-3xl bg-linear-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-950">LIVE NGAYON</p>
              <h3 className="text-lg font-heading font-black">May Aktibong Live Session sa Silid na Ito!</h3>
            </div>
          </div>

          <Link
            href={`/student/classrooms/${id}/live/${activeLiveSession.id}`}
            className="px-6 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-full shadow-md flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <span>Sumali sa Live Session Na ➔</span>
          </Link>
        </div>
      )}

 <Link href="/student" className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-primary font-extrabold transition-all hover:-translate-x-1 mb-6">
 <ArrowLeft className="w-4 h-4" />
 <Translate fil="Bumalik sa Dashboard" en="Back to Dashboard" />
 </Link>

 <div className="glass-strong rounded-3xl p-8 mb-10 border border-white/80 relative overflow-hidden shadow-xl">
 <div className="absolute top-1/2 right-10 w-48 h-48 bg-brand-accent/20 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
 
 <div className="relative z-10">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shadow-md">
 <BookOpen className="w-6 h-6 text-brand-primary " />
 </div>
 <div>
 <h1 className="text-3xl font-heading font-black text-slate-800 ">{classroom.name}</h1>
 <p className="text-brand-primary font-extrabold text-sm"><Translate fil="Guro" en="Educator" />: {classroom.profiles?.full_name}</p>
 </div>
 </div>
 <p className="text-slate-600 font-semibold max-w-2xl text-lg mt-4">{classroom.description || <Translate fil="Walang ibinigay na paglalarawan." en="No description provided." />}</p>
 </div>
 </div>

 <h2 className="text-2xl font-heading font-extrabold text-brand-primary flex items-center gap-2 mb-6">
 <span>🎮</span> <Translate fil="Mga May-akdang Pagsusulit" en="Available Quizzes" />
 </h2>

 {quizzes && quizzes.length > 0 ? (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {quizzes.map((quiz) => {
 const quizAttempts = attempts?.filter(a => a.quiz_id === quiz.id) || []
 const bestScore = quizAttempts.length > 0 ? Math.max(...quizAttempts.map(a => a.score)) : null
 const hasAttempted = quizAttempts.length > 0

 return (
 <div key={quiz.id} className="glass-strong card-hover rounded-3xl p-6 border border-white/80 flex flex-col relative overflow-hidden group shadow-lg">
 
 <div className="flex justify-between items-start mb-2 relative z-10">
 <h3 className="text-xl font-heading font-extrabold text-slate-800 ">{quiz.title}</h3>
 {hasAttempted && (
 <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-black border border-blue-200 shadow-sm">
 ⭐ Best: {bestScore} pts
 </span>
 )}
 </div>
 
 <p className="text-slate-600 text-sm font-semibold mb-6 flex-1 line-clamp-2 relative z-10">{quiz.description}</p>
 
 <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between relative z-10">
 <div className="text-slate-500 font-extrabold text-sm flex items-center gap-1.5">
 <span>⏱️</span> {Math.floor(quiz.time_limit_seconds / 60)} min kada kard
 </div>
 
 <Link href={`/student/quiz/${quiz.id}/play`} className="px-6 py-2.5 bg-brand-accent hover:bg-emerald-500 text-white font-extrabold rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20">
 <Play className="w-4 h-4 fill-white" />
 {hasAttempted ? <Translate fil="Muling Maglaro" en="Play Again" /> : <Translate fil="Maglaro Na ➔" en="Play Now ➔" />}
 </Link>
 </div>
 </div>
 )
 })}
 </div>
 ) : (
 <div className="glass-strong rounded-3xl p-12 text-center text-slate-600 font-semibold border border-white/80 shadow-lg">
 <Translate fil="Wala pang nailalathalang pagsusulit sa silid-aralan na ito. Balikan sa ibang pagkakataon! 🎈" en="No published quizzes yet in this classroom. Check back later! 🎈" />
 </div>
 )}

 </div>
 )
}
