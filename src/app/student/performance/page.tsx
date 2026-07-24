import { createClient } from '@/lib/supabase/server'
import { Flame, Target, Compass, Sparkles, AlertCircle } from 'lucide-react'

export default async function StudentPerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all attempts for this student
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes(title)')
    .eq('student_id', user?.id)
    .order('completed_at', { ascending: true }) // Ascending for chart over time

  const validAttempts = attempts || []
  const totalAttempts = validAttempts.length
  
  // Calculate Average
  let sumPct = 0
  let maxStreak = 0
  
  validAttempts.forEach(a => {
    if (a.total_questions > 0) {
      sumPct += (a.score / a.total_questions) * 100
    }
    if (a.streak_max > maxStreak) {
      maxStreak = a.streak_max
    }
  })
  const avgScore = totalAttempts > 0 ? Math.round(sumPct / totalAttempts) : 0

  // Build simple SVG line chart data
  const chartHeight = 200
  const chartWidth = 600
  let pathD = ""
  
  if (totalAttempts > 1) {
    const spacingX = chartWidth / (totalAttempts - 1)
    
    validAttempts.forEach((a, i) => {
      const pct = (a.score / a.total_questions) * 100
      // Invert Y axis for SVG (0 is top)
      const x = i * spacingX
      const y = chartHeight - (pct / 100) * chartHeight
      
      if (i === 0) {
        pathD += `M ${x} ${y} `
      } else {
        pathD += `L ${x} ${y} `
      }
    })
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in relative z-10">
      <header className="mb-10">
        <h1 className="text-3xl font-heading font-bold text-white mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-brand-accent" /> My Performance
        </h1>
        <p className="text-slate-400">Track your progress and growth over time.</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-strong rounded-3xl p-8 border border-white/10 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-slate-400 font-medium text-lg">Avg Score</h3>
          </div>
          <p className="text-5xl font-heading font-black text-white relative z-10">{avgScore}%</p>
        </div>

        <div className="glass-strong rounded-3xl p-8 border border-white/10 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-slate-400 font-medium text-lg">Best Streak</h3>
          </div>
          <p className="text-5xl font-heading font-black text-white relative z-10">{maxStreak}</p>
        </div>

        <div className="glass-strong rounded-3xl p-8 border border-white/10 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <Compass className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-slate-400 font-medium text-lg">Total Quizzes</h3>
          </div>
          <p className="text-5xl font-heading font-black text-white relative z-10">{totalAttempts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart */}
        <div className="lg:col-span-2 glass rounded-3xl p-8 border border-white/5">
          <h2 className="text-xl font-heading font-bold text-white mb-6">Score Growth Over Time</h2>
          
          {totalAttempts > 1 ? (
             <div className="relative w-full overflow-hidden bg-slate-900/50 rounded-2xl border border-white/5 p-6 aspect-[21/9] flex items-center justify-center">
               <svg viewBox={`0 -20 ${chartWidth} ${chartHeight + 40}`} className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map(line => {
                    const y = chartHeight - (line / 100) * chartHeight;
                    return (
                      <g key={line}>
                         <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                         <text x="-10" y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="12" textAnchor="end">{line}%</text>
                      </g>
                    )
                  })}

                  {/* Data Line */}
                  <path d={pathD} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Data Points */}
                  {validAttempts.map((a, i) => {
                    const pct = (a.score / a.total_questions) * 100
                    const x = i * (chartWidth / (totalAttempts - 1))
                    const y = chartHeight - (pct / 100) * chartHeight
                    return <circle key={i} cx={x} cy={y} r="6" fill="#10b981" stroke="#0f172a" strokeWidth="3" />
                  })}
               </svg>
             </div>
          ) : (
            <div className="h-[250px] bg-slate-900/50 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-slate-500">
               <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
               <p>Take at least 2 quizzes to see your growth chart.</p>
            </div>
          )}
        </div>

        {/* History List */}
        <div className="glass rounded-3xl p-8 border border-white/5 flex flex-col h-[400px]">
          <h2 className="text-xl font-heading font-bold text-white mb-6 shrink-0">Recent Attempts</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {[...validAttempts].reverse().map(attempt => {
              const pct = (attempt.score / attempt.total_questions) * 100
              const isPassing = pct >= 60

              return (
                <div key={attempt.id} className="bg-slate-900/40 rounded-xl p-4 flex items-center justify-between border border-white/5">
                   <div>
                     <h4 className="text-white text-sm font-medium line-clamp-1">{attempt.quizzes?.title || 'Unknown'}</h4>
                     <p className="text-xs text-slate-400 mt-1">{new Date(attempt.completed_at).toLocaleDateString()}</p>
                   </div>
                   <div className={`font-bold ${isPassing ? 'text-emerald-400' : 'text-red-400'}`}>
                     {Math.round(pct)}%
                   </div>
                </div>
              )
            })}
             {validAttempts.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-10">No history available.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
