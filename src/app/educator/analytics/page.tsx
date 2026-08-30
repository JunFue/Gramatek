import { createClient } from '@/lib/supabase/server'
import { BarChart3, TrendingUp, Users, Target, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

export default async function EducatorAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all classrooms for this educator
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('educator_id', user?.id)

  const classroomIds = classrooms?.map(c => c.id) || []

  // Fetch top-level stats
  const { count: studentCount } = await supabase
    .from('classroom_members')
    .select('*', { count: 'exact', head: true })
    .in('classroom_id', classroomIds)

  // Fetch all attempts for quizzes owned by this educator
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('id, score, total_questions, student_id, quiz_id, created_at:completed_at, quizzes(title)')
    .in('quiz_id', (await supabase.from('quizzes').select('id').eq('educator_id', user?.id)).data?.map(q => q.id) || [])
    .order('completed_at', { ascending: false })

  const validAttempts = attempts || []
  
  const totalAttempts = validAttempts.length
  
  // Calculate Average Score Percentage across all attempts
  let sumPct = 0
  validAttempts.forEach(a => {
    if (a.total_questions > 0) {
      sumPct += (a.score / a.total_questions) * 100
    }
  })
  const avgScore = totalAttempts > 0 ? Math.round(sumPct / totalAttempts) : 0

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in relative z-10">
      <header className="mb-10">
        <h1 className="text-3xl font-heading font-bold text-slate-900 mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-brand-primary" /> <Translate fil="Pandaigdigang Analitika" en="Global Analytics" />
        </h1>
        <p className="text-slate-600 font-medium"><Translate fil="Pangkalahatang-ideya ng pagganap ng mag-aaral sa lahat ng iyong silid-aralan." en="Overview of student performance across all your classrooms." /></p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
              <Users className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-slate-600 font-bold text-lg"><Translate fil="Kabuuang Mag-aaral" en="Total Students" /></h3>
          </div>
          <p className="text-5xl font-heading font-black text-slate-900 relative z-10">{studentCount || 0}</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
              <Target className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-slate-600 font-bold text-lg"><Translate fil="Karaniwang Iskor" en="Avg Score" /></h3>
          </div>
          <p className="text-5xl font-heading font-black text-slate-900 relative z-10">{avgScore}%</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
              <TrendingUp className="w-6 h-6 text-violet-500" />
            </div>
            <h3 className="text-slate-600 font-bold text-lg"><Translate fil="Kabuuang Pagtatangka" en="Total Attempts" /></h3>
          </div>
          <p className="text-5xl font-heading font-black text-slate-900 relative z-10">{totalAttempts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Activity Feed */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h2 className="text-xl font-heading font-bold text-slate-900 mb-6"><Translate fil="Mga Huling Aktibidad" en="Recent Activity" /></h2>
          
          <div className="space-y-4">
            {validAttempts.slice(0, 5).map(attempt => {
              const pct = (attempt.score / attempt.total_questions) * 100
              const isPassing = pct >= 60

              return (
                <div key={attempt.id} className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-200 shadow-sm">
                   <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border ${isPassing ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                       {Math.round(pct)}%
                     </div>
                     <div>
                       <h4 className="text-slate-900 font-bold">{(attempt.quizzes as any)?.title || 'Unknown Quiz'}</h4>
                       <p className="text-sm font-medium text-slate-500"><Translate fil="Iskor" en="Score" />: {attempt.score}/{attempt.total_questions}</p>
                     </div>
                   </div>
                   <div className="text-right text-xs font-bold text-slate-400">
                     {new Date(attempt.created_at).toLocaleDateString()}
                   </div>
                </div>
              )
            })}
            
            {validAttempts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <Translate fil="Wala pang nagtatangkang kumuha ng pagsusulit." en="No quiz attempts yet." />
              </div>
            )}
          </div>
        </div>

        {/* Placeholder for deeper drill downs */}
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
          <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-heading font-bold text-slate-600 mb-2">Student Drill-Downs (Phase 2)</h2>
          <p className="text-slate-500 max-w-sm font-medium">Detailed student-by-student mastery tracking and growth over time will be dropping in the next major update.</p>
        </div>

      </div>

    </div>
  )
}
