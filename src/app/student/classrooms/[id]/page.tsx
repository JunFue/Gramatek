import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, FileQuestion, BookOpen } from 'lucide-react'

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
      profiles ( full_name ),
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
    
  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in relative z-10">
      
      <Link href="/student" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="glass-strong rounded-3xl p-8 mb-10 border border-white/10 relative overflow-hidden">
        <div className="absolute top-1/2 right-10 w-48 h-48 bg-brand-accent/20 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
               <BookOpen className="w-5 h-5 text-brand-accent" />
             </div>
             <div>
               <h1 className="text-3xl font-heading font-bold text-white">{classroom.name}</h1>
               <p className="text-brand-accent font-medium text-sm">Instructor: {classroom.profiles?.full_name}</p>
             </div>
          </div>
          <p className="text-slate-400 max-w-2xl text-lg mt-4">{classroom.description}</p>
        </div>
      </div>

      <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2 mb-6">
        <FileQuestion className="w-6 h-6 text-brand-accent" />
        Available Quizzes
      </h2>

      {quizzes && quizzes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {quizzes.map((quiz) => {
            // Find attempts for this specific quiz
            const quizAttempts = attempts?.filter(a => a.quiz_id === quiz.id) || []
            const bestScore = quizAttempts.length > 0 ? Math.max(...quizAttempts.map(a => a.score)) : null
            const hasAttempted = quizAttempts.length > 0

            return (
              <div key={quiz.id} className="glass rounded-2xl p-6 border border-white/5 flex flex-col relative overflow-hidden group">
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <h3 className="text-xl font-heading font-bold text-white">{quiz.title}</h3>
                  {hasAttempted && (
                    <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-md text-xs font-bold">
                       Best: {bestScore} pts
                    </span>
                  )}
                </div>
                
                <p className="text-slate-400 text-sm mb-6 flex-1 line-clamp-2 relative z-10">{quiz.description}</p>
                
                <div className="pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                   <div className="text-slate-500 text-sm">
                     {Math.floor(quiz.time_limit_seconds / 60)} min per card
                   </div>
                   
                   <Link href={`/student/quiz/${quiz.id}/play`} className="px-5 py-2 bg-brand-accent hover:bg-emerald-500 text-white font-medium rounded-full flex items-center gap-2 transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20">
                     <Play className="w-4 h-4 fill-white" />
                     {hasAttempted ? 'Play Again' : 'Play Now'}
                   </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-subtle rounded-2xl p-12 text-center text-slate-400">
           No quizzes have been published in this classroom yet. Check back later!
        </div>
      )}

    </div>
  )
}
