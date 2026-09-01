'use client'

import { useState, useMemo } from 'react'
import { 
  BarChart3, Users, Target, TrendingUp, BookOpen, 
  ChevronRight, Award, AlertTriangle, Star, 
  Search, CheckCircle2, ShieldAlert, Sparkles, Filter, Download
} from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'
import { 
  GRADE_TIERS, 
  GradeTier,
  getGradeTier, 
  calculateClassroomAnalyticsSummary, 
  ClassroomAnalyticsSummary,
  generateGradebookCSV
} from '@/lib/utils/grading'

interface RawClassroom {
  id: string
  name: string
  enrollment_code: string
  created_at: string
  classroom_members?: Array<{
    student_id: string
    joined_at: string
    profiles?: any
  }>
  quizzes?: Array<{
    id: string
    title: string
    is_published: boolean
    created_at: string
  }>
}

interface RawAttempt {
  id: string
  quiz_id: string
  student_id: string
  score: number
  total_questions: number
  time_taken_seconds: number
  completed_at: string
  streak_max?: number
  profiles?: any
  quizzes?: {
    id: string
    title: string
    classroom_id: string | null
    classrooms?: {
      id: string
      name: string
    } | null
  } | null
}

interface EducatorAnalyticsClientProps {
  classrooms: RawClassroom[]
  attempts: RawAttempt[]
}

export function EducatorAnalyticsClient({ classrooms, attempts }: EducatorAnalyticsClientProps) {
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Compute analytics for each classroom
  const classroomSummaries = useMemo<Record<string, ClassroomAnalyticsSummary>>(() => {
    const map: Record<string, ClassroomAnalyticsSummary> = {}
    classrooms.forEach(c => {
      const cMembers = c.classroom_members || []
      const cQuizzes = (c.quizzes || []).filter(q => q.is_published)
      const summary = calculateClassroomAnalyticsSummary(
        { id: c.id, name: c.name },
        cMembers,
        cQuizzes,
        attempts
      )
      map[c.id] = summary
    })
    return map
  }, [classrooms, attempts])

  // Active view: either global aggregated or single classroom
  const activeClassroom = selectedClassroomId !== 'all' ? classrooms.find(c => c.id === selectedClassroomId) : null
  const activeSummary = selectedClassroomId !== 'all' ? classroomSummaries[selectedClassroomId] : null

  // Aggregated global metrics when 'all' is selected
  const globalMetrics = useMemo(() => {
    let totalStudents = 0
    let totalQuizzes = 0
    let totalAttemptsCount = attempts.length
    let totalSumPct = 0
    let studentAverageCount = 0

    const gradeDist: Record<GradeTier['key'], number> = {
      A: 0,
      B_PLUS: 0,
      B: 0,
      C: 0,
      D: 0,
    }

    const allStudentsList: any[] = []

    Object.values(classroomSummaries).forEach(cs => {
      totalStudents += cs.totalStudents
      totalQuizzes += cs.totalQuizzes
      cs.students.forEach(s => {
        allStudentsList.push({ ...s, classroomName: cs.classroomName, classroomId: cs.classroomId })
        if (s.quizzesCompleted > 0 && s.overallGradeTier) {
          totalSumPct += s.averagePercentage
          studentAverageCount++
          gradeDist[s.overallGradeTier.key]++
        }
      })
    })

    const avgScore = studentAverageCount > 0 ? Math.round(totalSumPct / studentAverageCount) : 0
    const overallGradeTier = studentAverageCount > 0 ? getGradeTier(avgScore) : null

    // Top performers across all rooms
    const topPerformers = [...allStudentsList]
      .filter(s => s.quizzesCompleted > 0 && s.averagePercentage >= 85)
      .sort((a, b) => b.averagePercentage - a.averagePercentage)

    // At risk across all rooms
    const needsAttention = [...allStudentsList]
      .filter(s => (s.totalQuizzes > 0 && s.quizzesCompleted < Math.ceil(s.totalQuizzes * 0.5)) || (s.quizzesCompleted > 0 && s.averagePercentage < 75))
      .sort((a, b) => a.averagePercentage - b.averagePercentage)

    return {
      totalStudents,
      totalQuizzes,
      totalAttempts: totalAttemptsCount,
      averageScorePercentage: avgScore,
      overallGradeTier,
      gradeTierDistribution: gradeDist,
      topPerformers,
      needsAttention,
    }
  }, [classroomSummaries, attempts])

  // Filtered attempts for Recent Submissions feed
  const filteredAttempts = useMemo(() => {
    return attempts.filter(a => {
      // Filter by classroom if selected
      if (selectedClassroomId !== 'all') {
        const attemptClassroomId = a.quizzes?.classroom_id
        if (attemptClassroomId !== selectedClassroomId) return false
      }

      // Filter by search query (student name or quiz title)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const profObj = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
        const sName = (profObj?.full_name || '').toLowerCase()
        const qTitle = (a.quizzes?.title || '').toLowerCase()
        const cName = (a.quizzes?.classrooms?.name || '').toLowerCase()
        return sName.includes(q) || qTitle.includes(q) || cName.includes(q)
      }

      return true
    })
  }, [attempts, selectedClassroomId, searchQuery])

  // Handle Export CSV for active classroom
  const handleExportCSV = () => {
    if (activeClassroom && activeSummary) {
      const csvContent = generateGradebookCSV(
        activeClassroom.name,
        (activeClassroom.quizzes || []).filter(q => q.is_published),
        activeSummary.students
      )
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `Gradebook_${activeClassroom.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const currentGradeDist = selectedClassroomId === 'all'
    ? globalMetrics.gradeTierDistribution
    : activeSummary?.gradeTierDistribution || { A: 0, B_PLUS: 0, B: 0, C: 0, D: 0 }

  const totalGradedStudents = Object.values(currentGradeDist).reduce((sum, v) => sum + v, 0)

  const currentAvgScore = selectedClassroomId === 'all'
    ? globalMetrics.averageScorePercentage
    : activeSummary?.averageScorePercentage || 0

  const currentAvgTier = getGradeTier(currentAvgScore)

  const currentTotalStudents = selectedClassroomId === 'all'
    ? globalMetrics.totalStudents
    : activeSummary?.totalStudents || 0

  const currentTotalAttempts = selectedClassroomId === 'all'
    ? globalMetrics.totalAttempts
    : activeSummary?.totalAttempts || 0

  const currentTopPerformers = selectedClassroomId === 'all'
    ? globalMetrics.topPerformers.slice(0, 5)
    : (activeSummary?.topPerformers || []).slice(0, 5)

  const currentNeedsAttention = selectedClassroomId === 'all'
    ? globalMetrics.needsAttention.slice(0, 5)
    : (activeSummary?.needsAttention || []).slice(0, 5)

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative z-10 space-y-6 sm:space-y-8 md:space-y-10">
      
      {/* Header & Classroom Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 mb-1 flex items-center gap-2 sm:gap-3">
            <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-brand-primary shrink-0" />
            <Translate fil="Sentro ng Analitika at Grado" en="Analytics & Grading Hub" />
          </h1>
          <p className="text-slate-600 font-medium text-xs sm:text-sm md:text-base">
            <Translate 
              fil="Subaybayan ang pag-unlad, antas ng kasanayan, at grado ng mga mag-aaral sa bawat silid-aralan." 
              en="Oversee student progress, mastery tiers, and grading across all your classrooms." 
            />
          </p>
        </div>

        {/* Classroom Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setSelectedClassroomId('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              selectedClassroomId === 'all'
                ? 'bg-brand-primary text-white shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Translate fil="Lahat ng Silid" en="All Classrooms" />
          </button>

          {classrooms.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClassroomId(c.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                selectedClassroomId === c.id
                  ? 'bg-brand-primary text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active Classroom Context Header (if filtered) */}
      {activeClassroom && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-xs text-emerald-900 font-extrabold uppercase tracking-wider">
                <Translate fil="Naka-filter sa Silid" en="Filtered Classroom" />
              </p>
              <h3 className="text-lg font-heading font-black text-slate-900">{activeClassroom.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <Translate fil="I-export ang CSV ng Grado" en="Export Gradebook CSV" />
            </button>
            <Link
              href={`/educator/classrooms/${activeClassroom.id}`}
              className="px-4 py-2 bg-brand-primary hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1"
            >
              <Translate fil="Pumunta sa Silid" en="Go to Classroom" /> →
            </Link>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        
        {/* Total Students */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-sm truncate">
              <Translate fil="Nakatala na Mag-aaral" en="Total Students" />
            </h3>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-black text-slate-900">{currentTotalStudents}</p>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-sm truncate">
              <Translate fil="Karaniwang Grado" en="Class Average" />
            </h3>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl sm:text-4xl font-heading font-black text-slate-900">{currentAvgScore}%</p>
            {totalGradedStudents > 0 && (
              <span className={`px-2 py-0.5 rounded-md text-xs font-black ${currentAvgTier.badgeBg} ${currentAvgTier.badgeText}`}>
                {currentAvgTier.letter} • {currentAvgTier.labelFil}
              </span>
            )}
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-sm truncate">
              <Translate fil="Antas ng Pagtatapos" en="Completion Rate" />
            </h3>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-black text-slate-900">
            {selectedClassroomId === 'all'
              ? `${Math.round((Object.values(classroomSummaries).reduce((acc, c) => acc + c.overallCompletionRate, 0) / (classrooms.length || 1)))}%`
              : `${activeSummary?.overallCompletionRate || 0}%`
            }
          </p>
        </div>

        {/* Total Submissions */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center border border-violet-100 shrink-0">
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="text-slate-600 font-bold text-xs sm:text-sm truncate">
              <Translate fil="Kabuuang Pagsusumite" en="Total Attempts" />
            </h3>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-black text-slate-900">{currentTotalAttempts}</p>
        </div>

      </div>

      {/* Grade Tier Distribution Visualizer */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-primary" />
              <Translate fil="Distribusyon ng Grado at Kasanayan" en="Grade & Mastery Distribution" />
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              <Translate 
                fil="Pamantayan batay sa porsyento ng iskor ng mga mag-aaral." 
                en="Based on student percentage scores according to educational rubric." 
              />
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
            {totalGradedStudents} <Translate fil="may nakatalang grado" en="students graded" />
          </span>
        </div>

        {/* Multi-segment distribution bar */}
        <div className="h-6 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
          {GRADE_TIERS.map(tier => {
            const count = currentGradeDist[tier.key] || 0
            const pct = totalGradedStudents > 0 ? (count / totalGradedStudents) * 100 : 0
            if (pct === 0) return null
            return (
              <div
                key={tier.key}
                style={{ width: `${pct}%` }}
                className={`${tier.badgeColorClass} h-full transition-all duration-500 hover:opacity-90 relative group`}
                title={`${tier.labelFil} (${tier.letter}): ${count} mag-aaral (${Math.round(pct)}%)`}
              />
            )
          })}
        </div>

        {/* Legend grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2">
          {GRADE_TIERS.map(tier => {
            const count = currentGradeDist[tier.key] || 0
            const pct = totalGradedStudents > 0 ? Math.round((count / totalGradedStudents) * 100) : 0
            return (
              <div key={tier.key} className={`p-3 rounded-2xl border ${tier.badgeBorder} ${tier.badgeBg} flex flex-col justify-between`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${tier.badgeText}`}>
                    {tier.letter} ({tier.minScore}% - {tier.maxScore >= 100 ? '100%' : `${Math.floor(tier.maxScore)}%`})
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${tier.badgeColorClass}`} />
                </div>
                <p className="text-[11px] font-bold text-slate-700 truncate">{tier.labelFil}</p>
                <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-black/5">
                  <span className="text-lg font-heading font-black text-slate-900">{count}</span>
                  <span className="text-xs font-bold text-slate-500">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Classroom Comparison Grid (Shown when 'All Classrooms' is selected) */}
      {selectedClassroomId === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-heading font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-primary" />
              <Translate fil="Paghahambing ng mga Silid-aralan" en="Classrooms Performance Matrix" />
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map(c => {
              const summary = classroomSummaries[c.id]
              const tier = getGradeTier(summary?.averageScorePercentage || 0)

              return (
                <div 
                  key={c.id} 
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-heading font-black text-base text-slate-900 truncate pr-2">{c.name}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-black shrink-0 ${tier.badgeBg} ${tier.badgeText}`}>
                        {summary?.averageScorePercentage || 0}% • {tier.letter}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-3 p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400"><Translate fil="Mag-aaral" en="Students" /></p>
                        <p className="text-sm font-black text-slate-800">{summary?.totalStudents || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400"><Translate fil="Pagsusulit" en="Quizzes" /></p>
                        <p className="text-sm font-black text-slate-800">{summary?.totalQuizzes || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400"><Translate fil="Progreso" en="Progress" /></p>
                        <p className="text-sm font-black text-slate-800">{summary?.overallCompletionRate || 0}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedClassroomId(c.id)}
                      className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      <Translate fil="I-filter ang Datos" en="Filter Stats" /> ➔
                    </button>
                    <Link
                      href={`/educator/classrooms/${c.id}`}
                      className="text-xs font-extrabold text-slate-600 hover:text-brand-primary flex items-center gap-1"
                    >
                      <Translate fil="Tingnan ang Gradebook" en="View Gradebook" /> →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Two Column: Top Performers & Students Needing Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Spotlight: Top Performers */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-heading font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <Translate fil="Nangungunang Mag-aaral (Top Performers)" en="Top Performing Students" />
            </h3>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
              ⭐ 85%+ Average
            </span>
          </div>

          {currentTopPerformers.length > 0 ? (
            <div className="space-y-2.5">
              {currentTopPerformers.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                      #{i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">{s.studentName}</p>
                      <p className="text-[11px] font-semibold text-slate-400 truncate">
                        {s.classroomName ? `${s.classroomName} • ` : ''}{s.quizzesCompleted}/{s.totalQuizzes} pagsusulit natapos
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black">
                      {s.averagePercentage}% • {s.overallGradeTier?.letter}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              <Translate fil="Wala pang nakakamit ng 85%+ average." en="No students with 85%+ average yet." />
            </div>
          )}
        </div>

        {/* Spotlight: Students Needing Attention */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-heading font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <Translate fil="Nangangailangan ng Tulong / Paalala" en="Needs Attention / At Risk" />
            </h3>
            <span className="text-xs font-bold bg-rose-50 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200">
              ⚠️ Mababa ang Progreso
            </span>
          </div>

          {currentNeedsAttention.length > 0 ? (
            <div className="space-y-2.5">
              {currentNeedsAttention.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">{s.studentName}</p>
                      <p className="text-[11px] font-semibold text-slate-500 truncate">
                        {s.classroomName ? `${s.classroomName} • ` : ''}{s.quizzesCompleted}/{s.totalQuizzes} pagsusulit natapos
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-black">
                      {s.averagePercentage > 0 ? `${s.averagePercentage}%` : 'Walang Sagot'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1 opacity-70" />
              <Translate fil="Mahusay! Lahat ng mag-aaral ay nasa tamang antas ng pag-unlad." en="Great! All students are performing on track." />
            </div>
          )}
        </div>

      </div>

      {/* Recent Submissions Feed */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
            <span>📜</span>
            <Translate fil="Talaan ng mga Huling Pagtatangka" en="Recent Attempts & Submissions" />
          </h2>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hanapin ang mag-aaral o pagsusulit..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredAttempts.length > 0 ? (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4"><Translate fil="Mag-aaral" en="Student" /></th>
                  <th className="py-3 px-4"><Translate fil="Pagsusulit" en="Quiz" /></th>
                  <th className="py-3 px-4"><Translate fil="Silid-aralan" en="Classroom" /></th>
                  <th className="py-3 px-4 text-center"><Translate fil="Iskor" en="Score" /></th>
                  <th className="py-3 px-4 text-center"><Translate fil="Grado" en="Grade" /></th>
                  <th className="py-3 px-4 text-right"><Translate fil="Petsa" en="Date" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttempts.slice(0, 15).map((attempt) => {
                  const pct = attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0
                  const tier = getGradeTier(pct)

                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {(Array.isArray(attempt.profiles) ? attempt.profiles[0]?.full_name : attempt.profiles?.full_name) || 'Mag-aaral'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">
                        {attempt.quizzes?.title || 'Pagsusulit'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {attempt.quizzes?.classrooms?.name || 'Pangkalahatan'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {attempt.score} / {attempt.total_questions}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-black ${tier.badgeBg} ${tier.badgeText}`}>
                          {pct}% ({tier.letter})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-medium text-xs">
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium"><Translate fil="Walang nakitang rekord ng pagtatangka." en="No attempt records found." /></p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
