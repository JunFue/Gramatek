/**
 * Standard Grading Scale & Analytics Utilities for Gramatek
 * 
 * Standard Philippine K-12 / Educational Mastery Grading Tiers:
 * - 90% – 100%: Napakahusay / Outstanding (A)
 * - 85% – 89.9%: Lubhang Kasiya-siya / Very Satisfactory (B+)
 * - 80% – 84.9%: Kasiya-siya / Satisfactory (B)
 * - 75% – 79.9%: Katamtaman / Fair (C)
 * - < 75%: Nangangailangan ng Pagsasanay / Did Not Meet Expectations (D)
 */

export interface GradeTier {
  key: 'A' | 'B_PLUS' | 'B' | 'C' | 'D'
  letter: string
  labelFil: string
  labelEn: string
  minScore: number
  maxScore: number
  badgeBg: string
  badgeText: string
  badgeBorder: string
  badgeColorClass: string
  isPassing: boolean
}

export const GRADE_TIERS: GradeTier[] = [
  {
    key: 'A',
    letter: 'A',
    labelFil: 'Napakahusay',
    labelEn: 'Outstanding',
    minScore: 90,
    maxScore: 100,
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    badgeColorClass: 'bg-emerald-500',
    isPassing: true,
  },
  {
    key: 'B_PLUS',
    letter: 'B+',
    labelFil: 'Lubhang Kasiya-siya',
    labelEn: 'Very Satisfactory',
    minScore: 85,
    maxScore: 89.99,
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    badgeColorClass: 'bg-blue-500',
    isPassing: true,
  },
  {
    key: 'B',
    letter: 'B',
    labelFil: 'Kasiya-siya',
    labelEn: 'Satisfactory',
    minScore: 80,
    maxScore: 84.99,
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    badgeColorClass: 'bg-indigo-500',
    isPassing: true,
  },
  {
    key: 'C',
    letter: 'C',
    labelFil: 'Katamtaman',
    labelEn: 'Fair',
    minScore: 75,
    maxScore: 79.99,
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    badgeColorClass: 'bg-amber-500',
    isPassing: true,
  },
  {
    key: 'D',
    letter: 'D',
    labelFil: 'Nangangailangan ng Pagsasanay',
    labelEn: 'Needs Improvement',
    minScore: 0,
    maxScore: 74.99,
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-200',
    badgeColorClass: 'bg-rose-500',
    isPassing: false,
  },
]

export function getGradeTier(percentage: number): GradeTier {
  const rounded = Math.max(0, Math.min(100, Math.round(percentage * 10) / 10))
  if (rounded >= 90) return GRADE_TIERS[0]
  if (rounded >= 85) return GRADE_TIERS[1]
  if (rounded >= 80) return GRADE_TIERS[2]
  if (rounded >= 75) return GRADE_TIERS[3]
  return GRADE_TIERS[4]
}

export interface StudentQuizProgress {
  quizId: string
  quizTitle: string
  hasAttempted: boolean
  bestScore: number | null
  maxScore: number | null
  bestPercentage: number | null
  attemptsCount: number
  latestCompletedAt: string | null
  gradeTier: GradeTier | null
}

export interface StudentClassroomSummary {
  studentId: string
  studentName: string
  avatarUrl: string | null
  joinedAt: string
  quizzesCompleted: number
  totalQuizzes: number
  completionRate: number // 0 - 100%
  averagePercentage: number // 0 - 100%
  overallGradeTier: GradeTier | null
  quizzes: Record<string, StudentQuizProgress>
  totalAttempts: number
  maxStreak: number
}

export function calculateStudentClassroomSummary(
  student: {
    student_id: string
    joined_at: string
    profiles?: any
  },
  classroomQuizzes: Array<{ id: string; title: string }>,
  attempts: Array<{
    id: string
    quiz_id: string
    student_id: string
    score: number
    total_questions: number
    completed_at: string
    streak_max?: number
  }>
): StudentClassroomSummary {
  const studentAttempts = attempts.filter(a => a.student_id === student.student_id)
  const quizMap: Record<string, StudentQuizProgress> = {}
  
  let completedCount = 0
  let totalScorePercentageSum = 0
  let maxStreak = 0

  studentAttempts.forEach(a => {
    if ((a.streak_max || 0) > maxStreak) {
      maxStreak = a.streak_max || 0
    }
  })

  classroomQuizzes.forEach(q => {
    const qAttempts = studentAttempts.filter(a => a.quiz_id === q.id)
    if (qAttempts.length > 0) {
      completedCount++
      let bestScore = 0
      let maxScore = 0
      let bestPct = 0
      let latestDate = qAttempts[0].completed_at

      qAttempts.forEach(qa => {
        const pct = qa.total_questions > 0 ? (qa.score / qa.total_questions) * 100 : 0
        if (pct >= bestPct) {
          bestPct = pct
          bestScore = qa.score
          maxScore = qa.total_questions
        }
        if (new Date(qa.completed_at).getTime() > new Date(latestDate).getTime()) {
          latestDate = qa.completed_at
        }
      })

      totalScorePercentageSum += bestPct

      quizMap[q.id] = {
        quizId: q.id,
        quizTitle: q.title,
        hasAttempted: true,
        bestScore,
        maxScore,
        bestPercentage: Math.round(bestPct),
        attemptsCount: qAttempts.length,
        latestCompletedAt: latestDate,
        gradeTier: getGradeTier(bestPct),
      }
    } else {
      quizMap[q.id] = {
        quizId: q.id,
        quizTitle: q.title,
        hasAttempted: false,
        bestScore: null,
        maxScore: null,
        bestPercentage: null,
        attemptsCount: 0,
        latestCompletedAt: null,
        gradeTier: null,
      }
    }
  })

  const totalQuizzes = classroomQuizzes.length
  const completionRate = totalQuizzes > 0 ? Math.round((completedCount / totalQuizzes) * 100) : 0
  const averagePercentage = completedCount > 0 ? Math.round(totalScorePercentageSum / completedCount) : 0
  const overallGradeTier = completedCount > 0 ? getGradeTier(averagePercentage) : null

  const profileObj = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles

  return {
    studentId: student.student_id,
    studentName: profileObj?.full_name || 'Mag-aaral',
    avatarUrl: profileObj?.avatar_url || null,
    joinedAt: student.joined_at,
    quizzesCompleted: completedCount,
    totalQuizzes,
    completionRate,
    averagePercentage,
    overallGradeTier,
    quizzes: quizMap,
    totalAttempts: studentAttempts.length,
    maxStreak,
  }
}

export interface ClassroomAnalyticsSummary {
  classroomId: string
  classroomName: string
  totalStudents: number
  totalQuizzes: number
  totalAttempts: number
  averageScorePercentage: number
  overallCompletionRate: number
  gradeTierDistribution: Record<GradeTier['key'], number>
  students: StudentClassroomSummary[]
  topPerformers: StudentClassroomSummary[]
  needsAttention: StudentClassroomSummary[]
}

export function calculateClassroomAnalyticsSummary(
  classroom: { id: string; name: string },
  members: Array<{
    student_id: string
    joined_at: string
    profiles?: any
  }>,
  quizzes: Array<{ id: string; title: string }>,
  attempts: Array<{
    id: string
    quiz_id: string
    student_id: string
    score: number
    total_questions: number
    completed_at: string
    streak_max?: number
  }>
): ClassroomAnalyticsSummary {
  const studentSummaries = members.map(m =>
    calculateStudentClassroomSummary(m, quizzes, attempts)
  )

  let sumAvgScores = 0
  let activeStudentCountWithAttempts = 0
  let totalCompletions = 0
  const totalPossibleCompletions = members.length * quizzes.length

  const gradeDist: Record<GradeTier['key'], number> = {
    A: 0,
    B_PLUS: 0,
    B: 0,
    C: 0,
    D: 0,
  }

  studentSummaries.forEach(s => {
    totalCompletions += s.quizzesCompleted
    if (s.quizzesCompleted > 0 && s.overallGradeTier) {
      sumAvgScores += s.averagePercentage
      activeStudentCountWithAttempts++
      gradeDist[s.overallGradeTier.key]++
    }
  })

  const classAvgScore = activeStudentCountWithAttempts > 0
    ? Math.round(sumAvgScores / activeStudentCountWithAttempts)
    : 0

  const overallCompletionRate = totalPossibleCompletions > 0
    ? Math.round((totalCompletions / totalPossibleCompletions) * 100)
    : 0

  // Top performers: students with >= 85% average, sorted by score descending
  const topPerformers = [...studentSummaries]
    .filter(s => s.quizzesCompleted > 0 && s.averagePercentage >= 85)
    .sort((a, b) => b.averagePercentage - a.averagePercentage)

  // Needs attention: students with < 75% or low completion (< 50% of available quizzes if any)
  const needsAttention = [...studentSummaries]
    .filter(s => (quizzes.length > 0 && s.quizzesCompleted < Math.ceil(quizzes.length * 0.5)) || (s.quizzesCompleted > 0 && s.averagePercentage < 75))
    .sort((a, b) => a.averagePercentage - b.averagePercentage)

  return {
    classroomId: classroom.id,
    classroomName: classroom.name,
    totalStudents: members.length,
    totalQuizzes: quizzes.length,
    totalAttempts: attempts.filter(a => quizzes.some(q => q.id === a.quiz_id)).length,
    averageScorePercentage: classAvgScore,
    overallCompletionRate,
    gradeTierDistribution: gradeDist,
    students: studentSummaries,
    topPerformers,
    needsAttention,
  }
}

/**
 * Generate a clean CSV string for educator gradebook export
 */
export function generateGradebookCSV(
  classroomName: string,
  quizzes: Array<{ id: string; title: string }>,
  students: StudentClassroomSummary[]
): string {
  const headers = [
    'Pangalan ng Mag-aaral',
    'Petsa ng Pagsali',
    'Mga Natapos na Pagsusulit',
    'Kabuuang Progreso (%)',
    'Karaniwang Iskor (%)',
    'Grado / Antas',
    ...quizzes.map(q => `"${q.title.replace(/"/g, '""')}"`),
  ]

  const rows = students.map(s => {
    const quizColumns = quizzes.map(q => {
      const qProgress = s.quizzes[q.id]
      if (!qProgress || !qProgress.hasAttempted) {
        return 'Hindi Pa Nasagutan'
      }
      return `${qProgress.bestScore}/${qProgress.maxScore} (${qProgress.bestPercentage}%)`
    })

    return [
      `"${s.studentName.replace(/"/g, '""')}"`,
      new Date(s.joinedAt).toLocaleDateString(),
      `${s.quizzesCompleted}/${s.totalQuizzes}`,
      `${s.completionRate}%`,
      `${s.averagePercentage}%`,
      s.overallGradeTier ? `${s.overallGradeTier.letter} - ${s.overallGradeTier.labelFil}` : 'Wala Pang Grado',
      ...quizColumns,
    ].join(',')
  })

  return [
    `"Talaan ng Grado - ${classroomName.replace(/"/g, '""')}"`,
    `"Inilabas noong: ${new Date().toLocaleString()}"`,
    '',
    headers.join(','),
    ...rows,
  ].join('\n')
}
