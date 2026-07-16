import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, FileQuestion, Users, CheckCircle2, History } from 'lucide-react'

export default async function QuizResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) notFound()

  // 1. Fetch Quiz Info
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('title, description, classroom_id')
    .eq('id', id)
    .single()

  if (!quiz) notFound()

  // 3. Fetch past attempts for this student in this quiz
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', id)
    .eq('student_id', user.id)
    .order('completed_at', { ascending: false })

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in relative z-10">
      
      <Link href={`/student/classrooms/${quiz.classroom_id}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Classroom
      </Link>

      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-accent/20 flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-brand-accent" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-white mb-2">{quiz.title} - Results</h1>
        <p className="text-slate-400">View your past attempts and high scores.</p>
      </div>

      <div className="space-y-4">
        {attempts && attempts.length > 0 ? (
          attempts.map((attempt, idx) => {
            const isHighScore = idx === 0 && Math.max(...attempts.map(a => a.score)) === attempt.score
            
            return (
              <div key={attempt.id} className={`glass-strong rounded-2xl p-6 border flex items-center justify-between ${isHighScore ? 'border-brand-accent shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-900/10' : 'border-white/10'}`}>
                
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-400 mb-1">
                    {new Date(attempt.completed_at).toLocaleString()}
                  </span>
                  
                  {isHighScore && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-400 mt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Personal Best
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-3xl font-bold font-heading text-white">
                    <span className={isHighScore ? 'text-emerald-400' : ''}>{attempt.score}</span> 
                    <span className="text-slate-500 text-xl font-normal"> / {attempt.total_questions}</span>
                  </div>
                </div>

              </div>
            )
          })
        ) : (
          <div className="glass-subtle rounded-2xl p-12 text-center text-slate-400">
             You haven't attempted this quiz yet.
             <div className="mt-6">
               <Link href={`/student/quiz/${id}/play`} className="px-6 py-3 bg-brand-accent text-white font-medium rounded-full shadow-lg hover:shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                 Play Now
               </Link>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
