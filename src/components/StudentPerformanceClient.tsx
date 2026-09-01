'use client'

import { useState, useEffect, useMemo } from 'react'
import { AlertCircle, Target, Flame, Sparkles, Compass, Trophy } from 'lucide-react'
import { Translate } from '@/components/Translate'
import Link from 'next/link'
import { getPrebuiltQuizTitle } from '@/lib/data/filipino-trivia'

export interface AttemptItem {
  id: string
  quiz_id?: string
  quiz_title?: string
  score: number
  total_questions: number
  completed_at: string
  game_mode?: string
  streak_max?: number
  streak_score?: number
  quizzes?: { title: string } | null
  answers?: any
}

export function StudentPerformanceClient({ initialAttempts }: { initialAttempts: AttemptItem[] }) {
  const [attempts, setAttempts] = useState<AttemptItem[]>(initialAttempts)

  useEffect(() => {
    // Read local practice attempts if any
    try {
      const localData = localStorage.getItem('gramatek_practice_attempts')
      if (localData) {
        const localAttempts: AttemptItem[] = JSON.parse(localData)
        
        // Merge and deduplicate by timestamp / id
        const merged = [...initialAttempts]
        const existingTimestamps = new Set(merged.map(a => new Date(a.completed_at).getTime()))
        
        localAttempts.forEach(la => {
          const t = new Date(la.completed_at).getTime()
          const isDuplicate = Array.from(existingTimestamps).some(et => Math.abs(et - t) < 5000)
          if (!isDuplicate) {
            merged.push(la)
            existingTimestamps.add(t)
          }
        })

        // Sort ascending for chronological chart
        merged.sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())
        setAttempts(merged)
      }
    } catch (e) {
      console.warn('Error reading local attempts:', e)
    }
  }, [initialAttempts])

  const totalAttempts = attempts.length
  
  // Calculate KPI stats
  const { avgScore, maxStreak } = useMemo(() => {
    let sumPct = 0
    let streak = 0

    attempts.forEach(a => {
      if (a.total_questions > 0) {
        sumPct += (a.score / a.total_questions) * 100
      }
      if ((a.streak_max || 0) > streak) {
        streak = a.streak_max || 0
      }
    })

    return {
      avgScore: totalAttempts > 0 ? Math.round(sumPct / totalAttempts) : 0,
      maxStreak: streak
    }
  }, [attempts, totalAttempts])

  // Build SVG chart path
  const chartHeight = 200
  const chartWidth = 600
  
  const pathD = useMemo(() => {
    if (totalAttempts < 2) return ""
    const spacingX = chartWidth / (totalAttempts - 1)
    let d = ""
    
    attempts.forEach((a, i) => {
      const pct = a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0
      const x = i * spacingX
      const y = chartHeight - (pct / 100) * chartHeight
      
      if (i === 0) {
        d += `M ${x} ${y} `
      } else {
        d += `L ${x} ${y} `
      }
    })
    return d
  }, [attempts, totalAttempts])

  const resolveTitle = (attempt: AttemptItem) => {
    return (
      attempt.quizzes?.title ||
      attempt.quiz_title ||
      attempt.answers?.quiz_title ||
      getPrebuiltQuizTitle(attempt.quiz_id) ||
      'Pagsasanay sa Wika'
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative z-10 space-y-6 sm:space-y-8 md:space-y-10">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-brand-light text-brand-primary font-extrabold text-xs rounded-full uppercase tracking-wider border border-brand-primary/20">
            🏆 <Translate fil="Iyong mga Medalya at Estatistika" en="Your Badges & Stats" />
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 animate-pulse shrink-0" /> 
          <Translate fil="Aking Pag-unlad" en="My Growth & Performance" />
        </h1>
        <p className="text-slate-600 font-semibold text-xs sm:text-sm md:text-base">
          <Translate 
            fil="Subaybayan ang iyong progreso, grado sa bawat antas, at paglago sa paglipas ng panahon." 
            en="Track your progress, scores on each level, and growth over time." 
          />
        </p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md sm:shadow-lg hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-light flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-base truncate"><Translate fil="Grap ng Iskor (Average)" en="Avg Score" /></h3>
          </div>
          <p className="text-3xl sm:text-5xl font-heading font-black text-slate-900">{avgScore}%</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md sm:shadow-lg hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-base truncate"><Translate fil="Pinakamagandang Streak" en="Best Streak" /></h3>
          </div>
          <p className="text-3xl sm:text-5xl font-heading font-black text-slate-900">{maxStreak} 🔥</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md sm:shadow-lg hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-base truncate"><Translate fil="Kabuuang Pagsusulit" en="Total Quizzes / Levels" /></h3>
          </div>
          <p className="text-3xl sm:text-5xl font-heading font-black text-slate-900">{totalAttempts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        
        {/* Score Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-lg sm:shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <span>📈</span> <Translate fil="Paglago ng Iskor sa Bawat Pagsusulit" en="Score Growth" />
            </h2>
            {totalAttempts > 0 && (
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-slate-200">
                {totalAttempts} {totalAttempts === 1 ? 'pagtatangka' : 'mga pagtatangka'}
              </span>
            )}
          </div>
          
          {totalAttempts > 1 ? (
            <div className="relative w-full overflow-hidden bg-slate-50 rounded-2xl border border-slate-200 p-3 sm:p-6 aspect-[21/9] flex items-center justify-center shadow-inner">
              <svg viewBox={`0 -20 ${chartWidth} ${chartHeight + 40}`} className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map(line => {
                  const y = chartHeight - (line / 100) * chartHeight;
                  return (
                    <g key={line}>
                      <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth="1" strokeDasharray="4 4" />
                      <text x="-12" y={y + 4} fill="rgba(0,0,0,0.4)" fontSize="11" textAnchor="end" className="font-bold">{line}%</text>
                    </g>
                  )
                })}

                {/* Data Line */}
                <path d={pathD} fill="none" stroke="#285840" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Data Points */}
                {attempts.map((a, i) => {
                  const pct = a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0
                  const x = i * (chartWidth / (totalAttempts - 1))
                  const y = chartHeight - (pct / 100) * chartHeight
                  return (
                    <g key={i} className="group cursor-pointer">
                      <circle cx={x} cy={y} r="6" fill="#285840" stroke="#ffffff" strokeWidth="3" className="shadow-md" />
                      <title>{`${resolveTitle(a)}: ${Math.round(pct)}% (${a.score}/${a.total_questions})`}</title>
                    </g>
                  )
                })}
              </svg>
            </div>
          ) : (
            <div className="h-[200px] sm:h-[250px] bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-600 font-semibold p-4 sm:p-6 text-center shadow-inner">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 text-brand-primary opacity-75" />
              <p className="max-w-md text-xs sm:text-sm">
                <Translate 
                  fil="Kumuha ng kahit dalawang (2) pagsusulit o antas upang makita ang iyong grap ng paglago!" 
                  en="Take at least two (2) quizzes or levels to see your growth chart!" 
                />
              </p>
              <Link 
                href="/student/practice" 
                className="mt-3 sm:mt-4 px-5 sm:px-6 py-2 sm:py-2.5 bg-brand-primary hover:bg-slate-600 text-white rounded-full text-xs sm:text-sm font-black transition-all shadow-sm"
              >
                <Translate fil="Maglaro sa Pagsasanay" en="Play Practice Hub" /> ➔
              </Link>
            </div>
          )}
        </div>

        {/* History List */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-lg sm:shadow-xl flex flex-col max-h-[460px]">
          <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 mb-4 sm:mb-6 shrink-0 flex items-center gap-2">
            <span>📜</span> <Translate fil="Mga Huling Pagtatangka" en="Recent Attempts" />
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {[...attempts].reverse().map(attempt => {
              const pct = attempt.total_questions > 0 ? (attempt.score / attempt.total_questions) * 100 : 0
              const isPassing = pct >= 60

              return (
                <div 
                  key={attempt.id} 
                  className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-200 shadow-sm hover:scale-[1.01] transition-transform"
                >
                  <div className="pr-3 flex-1 min-w-0">
                    <h4 className="text-slate-900 text-sm font-extrabold truncate">
                      {resolveTitle(attempt)}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 font-semibold">
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase tracking-wider">
                        {attempt.score}/{attempt.total_questions} pts
                      </span>
                    </div>
                  </div>
                  
                  <div className={`font-black text-lg shrink-0 ${isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Math.round(pct)}%
                  </div>
                </div>
              )
            })}

            {attempts.length === 0 && (
              <div className="text-center py-12 text-slate-500 font-medium">
                <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm"><Translate fil="Wala pang nakatalang pagtatangka." en="No history available." /></p>
                <Link href="/student/practice" className="text-xs font-bold text-brand-primary hover:underline mt-2 inline-block">
                  <Translate fil="Simulan ang unang pagsasanay dito" en="Start your first practice here" /> →
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
