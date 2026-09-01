'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  AlertCircle, Target, Flame, Sparkles, Compass, Trophy, 
  BookOpen, CheckCircle2, Play, ChevronRight, Award, 
  Gamepad2, CalendarClock, History, HelpCircle
} from 'lucide-react'
import { Translate } from '@/components/Translate'
import Link from 'next/link'
import { getPrebuiltQuizTitle } from '@/lib/data/filipino-trivia'
import { 
  GRADE_TIERS, 
  getGradeTier, 
  calculateStudentClassroomSummary,
  StudentClassroomSummary
} from '@/lib/utils/grading'

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
  quizzes?: { 
    id?: string
    title: string
    classroom_id?: string | null
    classrooms?: {
      id: string
      name: string
    } | null
  } | null
  answers?: any
}

export interface EnrolledClassroom {
  id: string
  name: string
  description: string | null
  profiles?: any
  quizzes?: Array<{
    id: string
    title: string
    is_published: boolean
    time_limit_seconds: number
  }>
}

interface StudentPerformanceClientProps {
  initialAttempts: AttemptItem[]
  enrolledClassrooms?: EnrolledClassroom[]
}

export function StudentPerformanceClient({ 
  initialAttempts,
  enrolledClassrooms = []
}: StudentPerformanceClientProps) {
  const searchParams = useSearchParams()
  const initialClassroomParam = searchParams.get('classroom')

  const [selectedFilter, setSelectedFilter] = useState<string>(
    initialClassroomParam && enrolledClassrooms.some(c => c.id === initialClassroomParam)
      ? initialClassroomParam
      : 'all'
  )

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

  // Resolve quiz title helper
  const resolveTitle = (attempt: AttemptItem) => {
    return (
      attempt.quizzes?.title ||
      attempt.quiz_title ||
      attempt.answers?.quiz_title ||
      getPrebuiltQuizTitle(attempt.quiz_id) ||
      'Pagsasanay sa Wika'
    )
  }

  // Calculate per-classroom summary for this student
  const classroomSummaries = useMemo<Record<string, StudentClassroomSummary>>(() => {
    const map: Record<string, StudentClassroomSummary> = {}
    enrolledClassrooms.forEach(c => {
      const publishedQuizzes = (c.quizzes || []).filter(q => q.is_published)
      const summary = calculateStudentClassroomSummary(
        { student_id: 'current_user', joined_at: new Date().toISOString() },
        publishedQuizzes,
        attempts as any
      )
      map[c.id] = summary
    })
    return map
  }, [enrolledClassrooms, attempts])

  // Filter attempts based on selected filter ('all' | 'practice' | classroomId)
  const filteredAttempts = useMemo(() => {
    if (selectedFilter === 'all') return attempts
    if (selectedFilter === 'practice') {
      return attempts.filter(a => {
        const isPrebuilt = !!getPrebuiltQuizTitle(a.quiz_id) || a.answers?.is_practice
        const isNoClassroom = !a.quizzes?.classroom_id
        return isPrebuilt || isNoClassroom
      })
    }
    return attempts.filter(a => a.quizzes?.classroom_id === selectedFilter)
  }, [attempts, selectedFilter])

  const totalFilteredAttempts = filteredAttempts.length

  // Calculate KPI stats for current active filter
  const { avgScore, maxStreak } = useMemo(() => {
    let sumPct = 0
    let streak = 0

    filteredAttempts.forEach(a => {
      if (a.total_questions > 0) {
        sumPct += (a.score / a.total_questions) * 100
      }
      if ((a.streak_max || 0) > streak) {
        streak = a.streak_max || 0
      }
    })

    return {
      avgScore: totalFilteredAttempts > 0 ? Math.round(sumPct / totalFilteredAttempts) : 0,
      maxStreak: streak
    }
  }, [filteredAttempts, totalFilteredAttempts])

  const currentGradeTier = getGradeTier(avgScore)

  // Active selected classroom object (if filtering a classroom)
  const activeClassroom = selectedFilter !== 'all' && selectedFilter !== 'practice'
    ? enrolledClassrooms.find(c => c.id === selectedFilter)
    : null

  const activeClassroomSummary = activeClassroom ? classroomSummaries[activeClassroom.id] : null

  // SVG Growth Chart Path
  const chartHeight = 200
  const chartWidth = 600
  
  const pathD = useMemo(() => {
    if (totalFilteredAttempts < 2) return ""
    const spacingX = chartWidth / (totalFilteredAttempts - 1)
    let d = ""
    
    filteredAttempts.forEach((a, i) => {
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
  }, [filteredAttempts, totalFilteredAttempts])

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative z-10 space-y-6 sm:space-y-8 md:space-y-10">
      
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-brand-light text-brand-primary font-extrabold text-xs rounded-full uppercase tracking-wider border border-brand-primary/20">
            🏆 <Translate fil="Iyong mga Medalya at Estatistika" en="Your Badges & Stats" />
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 animate-pulse shrink-0" /> 
          <Translate fil="Aking Pag-unlad at Grado" en="My Growth & Performance" />
        </h1>
        <p className="text-slate-600 font-semibold text-xs sm:text-sm md:text-base">
          <Translate 
            fil="Subaybayan ang iyong progreso, grado sa bawat silid-aralan, at paglago sa paglipas ng panahon." 
            en="Track your progress, grades in each classroom, and growth over time." 
          />
        </p>
      </header>

      {/* Classroom & Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-brand-primary text-white shadow-md font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Translate fil="🌟 Lahat ng Pagsusulit" en="🌟 All Quizzes" />
        </button>

        <button
          onClick={() => setSelectedFilter('practice')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            selectedFilter === 'practice'
              ? 'bg-brand-primary text-white shadow-md font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Translate fil="🎮 Pagsasanay (Solo Practice)" en="🎮 Practice Hub" />
        </button>

        {enrolledClassrooms.map(c => {
          const cSummary = classroomSummaries[c.id]
          const cTier = cSummary?.overallGradeTier

          return (
            <button
              key={c.id}
              onClick={() => setSelectedFilter(c.id)}
              className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                selectedFilter === c.id
                  ? 'bg-brand-primary text-white shadow-md font-black'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>🏫 {c.name}</span>
              {cSummary && cSummary.quizzesCompleted > 0 && cTier && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                  selectedFilter === c.id ? 'bg-white/20 text-white' : `${cTier.badgeBg} ${cTier.badgeText}`
                }`}>
                  {cSummary.averagePercentage}% • {cTier.letter}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Classroom Standing Banner (if viewing a specific classroom) */}
      {activeClassroom && activeClassroomSummary && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-brand-primary/30 shadow-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-brand-primary uppercase tracking-wider mb-1">
                <span>🏫 <Translate fil="Katayuan sa Silid-aralan" en="Classroom Standing" /></span>
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-900 mb-1">
                {activeClassroom.name}
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm font-medium">
                <Translate fil="Guro" en="Educator" />: {(Array.isArray(activeClassroom.profiles) ? activeClassroom.profiles[0]?.full_name : activeClassroom.profiles?.full_name) || 'Guro'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {activeClassroomSummary.quizzesCompleted > 0 && activeClassroomSummary.overallGradeTier ? (
                <div className={`p-4 rounded-2xl border ${activeClassroomSummary.overallGradeTier.badgeBorder} ${activeClassroomSummary.overallGradeTier.badgeBg} text-center min-w-[140px]`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Iyong Grado</p>
                  <p className={`text-2xl font-black ${activeClassroomSummary.overallGradeTier.badgeText}`}>
                    {activeClassroomSummary.averagePercentage}% ({activeClassroomSummary.overallGradeTier.letter})
                  </p>
                  <p className="text-[11px] font-bold text-slate-700">{activeClassroomSummary.overallGradeTier.labelFil}</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-center min-w-[140px]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Iyong Grado</p>
                  <p className="text-sm font-bold text-slate-500 mt-1">Wala pang nakatalang pagsusulit</p>
                </div>
              )}

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-center min-w-[140px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mga Natapos</p>
                <p className="text-2xl font-black text-slate-900">
                  {activeClassroomSummary.quizzesCompleted} / {activeClassroomSummary.totalQuizzes}
                </p>
                <p className="text-[11px] font-bold text-brand-primary">{activeClassroomSummary.completionRate}% Natapos</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full mt-5 overflow-hidden">
            <div 
              className="bg-brand-primary h-full rounded-full transition-all duration-500" 
              style={{ width: `${activeClassroomSummary.completionRate}%` }} 
            />
          </div>
        </div>
      )}

      {/* Cross-Classroom Overview Grid (shown when 'All' is selected and student is enrolled in classrooms) */}
      {selectedFilter === 'all' && enrolledClassrooms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-primary" />
              <Translate fil="Lagom ng Grado sa Bawat Silid-aralan" en="Grades Across Enrolled Classrooms" />
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {enrolledClassrooms.map(c => {
              const summary = classroomSummaries[c.id]
              const tier = summary?.overallGradeTier

              return (
                <div 
                  key={c.id} 
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-heading font-black text-base text-slate-900 truncate pr-2">{c.name}</h4>
                      {summary && summary.quizzesCompleted > 0 && tier ? (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-black shrink-0 ${tier.badgeBg} ${tier.badgeText}`}>
                          {summary.averagePercentage}% • {tier.letter}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-500 shrink-0">
                          Walang Iskor
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 font-medium mb-3">
                      Guro: {(Array.isArray(c.profiles) ? c.profiles[0]?.full_name : c.profiles?.full_name) || 'Guro'}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">Progreso:</span>
                      <span className="font-extrabold text-slate-800">
                        {summary?.quizzesCompleted || 0}/{summary?.totalQuizzes || 0} pagsusulit
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedFilter(c.id)}
                      className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      <Translate fil="Tingnan ang Detalye" en="Filter Progress" /> ➔
                    </button>
                    <Link
                      href={`/student/classrooms/${c.id}`}
                      className="text-xs font-extrabold text-slate-600 hover:text-brand-primary"
                    >
                      <Translate fil="Pumunta sa Silid" en="Go to Room" /> →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        
        {/* Avg Score */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-light flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-base truncate">
              <Translate fil="Karaniwang Iskor" en="Average Score" />
            </h3>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl sm:text-5xl font-heading font-black text-slate-900">{avgScore}%</p>
            {totalFilteredAttempts > 0 && (
              <span className={`px-2 py-0.5 rounded-md text-xs font-black ${currentGradeTier.badgeBg} ${currentGradeTier.badgeText}`}>
                {currentGradeTier.letter}
              </span>
            )}
          </div>
        </div>

        {/* Best Streak */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-base truncate">
              <Translate fil="Pinakamagandang Streak" en="Best Streak" />
            </h3>
          </div>
          <p className="text-3xl sm:text-5xl font-heading font-black text-slate-900">{maxStreak} 🔥</p>
        </div>

        {/* Total Attempts */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-base truncate">
              <Translate fil="Kabuuang Pagsusulit" en="Total Attempts" />
            </h3>
          </div>
          <p className="text-3xl sm:text-5xl font-heading font-black text-slate-900">{totalFilteredAttempts}</p>
        </div>

      </div>

      {/* Itemized Quiz Status (When filtering a specific classroom) */}
      {activeClassroom && activeClassroomSummary && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-primary" />
              <Translate fil="Mga Pagsusulit sa Silid na Ito" en="Classroom Quizzes Progress" />
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {(activeClassroom.quizzes || []).filter(q => q.is_published).map(q => {
              const qProg = activeClassroomSummary.quizzes[q.id]
              const hasAttempted = qProg?.hasAttempted

              return (
                <div key={q.id} className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-heading font-bold text-base text-slate-900">{q.title}</h4>
                      {hasAttempted ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${qProg.gradeTier?.badgeBg} ${qProg.gradeTier?.badgeText}`}>
                          ⭐ {qProg.bestScore}/{qProg.maxScore} ({qProg.bestPercentage}%)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          ⏳ Hindi Pa Nasasagutan
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">
                      {hasAttempted ? `${qProg.attemptsCount} pagtatangka` : 'Wala pang rekord'}
                    </span>
                    <Link
                      href={`/student/quiz/${q.id}/play`}
                      className="px-4 py-1.5 bg-brand-primary hover:bg-slate-700 text-white font-extrabold rounded-full flex items-center gap-1.5 shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      {hasAttempted ? <Translate fil="Muling Subukan" en="Retake" /> : <Translate fil="Maglaro Na" en="Play Now" />}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Score Growth Chart & Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        
        {/* Score Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <span>📈</span> <Translate fil="Paglago ng Iskor sa Bawat Pagsusulit" en="Score Growth Timeline" />
            </h2>
            {totalFilteredAttempts > 0 && (
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-slate-200">
                {totalFilteredAttempts} {totalFilteredAttempts === 1 ? 'pagtatangka' : 'mga pagtatangka'}
              </span>
            )}
          </div>
          
          {totalFilteredAttempts > 1 ? (
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
                {filteredAttempts.map((a, i) => {
                  const pct = a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0
                  const x = i * (chartWidth / (totalFilteredAttempts - 1))
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
                  fil="Kumuha ng kahit dalawang (2) pagsusulit sa kategoryang ito upang makita ang iyong grap ng paglago!" 
                  en="Take at least two (2) quizzes in this category to see your growth chart!" 
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
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md flex flex-col max-h-[460px]">
          <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 mb-4 sm:mb-6 shrink-0 flex items-center gap-2">
            <span>📜</span> <Translate fil="Mga Huling Pagtatangka" en="Recent Attempts" />
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {[...filteredAttempts].reverse().map(attempt => {
              const pct = attempt.total_questions > 0 ? (attempt.score / attempt.total_questions) * 100 : 0
              const tier = getGradeTier(pct)

              return (
                <div 
                  key={attempt.id} 
                  className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-200 shadow-sm hover:scale-[1.01] transition-transform"
                >
                  <div className="pr-3 flex-1 min-w-0">
                    <h4 className="text-slate-900 text-sm font-extrabold truncate">
                      {resolveTitle(attempt)}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 font-semibold">
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase tracking-wider">
                        {attempt.score}/{attempt.total_questions} pts
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-black ${tier.badgeBg} ${tier.badgeText}`}>
                      {Math.round(pct)}% ({tier.letter})
                    </span>
                  </div>
                </div>
              )
            })}

            {filteredAttempts.length === 0 && (
              <div className="text-center py-12 text-slate-500 font-medium">
                <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm"><Translate fil="Wala pang nakatalang pagtatangka sa kategoryang ito." en="No history available in this category." /></p>
                <Link href="/student/practice" className="text-xs font-bold text-brand-primary hover:underline mt-2 inline-block">
                  <Translate fil="Simulan ang unang pagsasanay dito" en="Start your first practice here" /> →
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grading Rubric Legend (Pamantayan sa Pagmamarka) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-primary" />
          <h3 className="text-base sm:text-lg font-heading font-black text-slate-900">
            <Translate fil="Pamantayan sa Pagmamarka at Antas ng Kasanayan" en="Grading Rubric & Proficiency Tiers" />
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {GRADE_TIERS.map(tier => (
            <div key={tier.key} className={`p-4 rounded-2xl border ${tier.badgeBorder} ${tier.badgeBg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-black ${tier.badgeText}`}>
                  {tier.letter} ({tier.minScore}% - {tier.maxScore >= 100 ? '100%' : `${Math.floor(tier.maxScore)}%`})
                </span>
                <span className={`w-2 h-2 rounded-full ${tier.badgeColorClass}`} />
              </div>
              <p className="text-xs font-extrabold text-slate-900">{tier.labelFil}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{tier.labelEn}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
