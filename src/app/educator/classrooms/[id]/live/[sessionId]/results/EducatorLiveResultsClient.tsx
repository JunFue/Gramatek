'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Trophy, Download, Copy, ArrowLeft, CheckCircle2, 
  XCircle, Clock, Users, User, Sparkles, Loader2 
} from 'lucide-react'
import { Translate } from '@/components/Translate'
import { LiveSession, LiveSessionQuestion, LiveSessionParticipant, LiveSessionGroup, LiveSessionAnswer } from '@/types/live-session'
import { duplicateSessionAction } from '@/app/educator/live/actions'

interface EducatorLiveResultsClientProps {
  classroomId: string
  classroomName: string
  session: LiveSession
  questions: LiveSessionQuestion[]
  participants: LiveSessionParticipant[]
  groups: LiveSessionGroup[]
  answers: LiveSessionAnswer[]
}

export function EducatorLiveResultsClient({
  classroomId,
  classroomName,
  session,
  questions,
  participants,
  groups,
  answers
}: EducatorLiveResultsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Calculate question metrics
  const questionStats = questions.map((q) => {
    const qAnswers = answers.filter((a) => a.question_id === q.id)
    const totalSubmissions = qAnswers.length
    const correctCount = qAnswers.filter((a) => a.is_correct).length
    const accuracy = totalSubmissions > 0 ? Math.round((correctCount / totalSubmissions) * 100) : 0
    const avgResponseMs = totalSubmissions > 0
      ? Math.round(qAnswers.reduce((acc, cur) => acc + (cur.response_ms || 0), 0) / totalSubmissions)
      : 0

    // Find first correct
    const sortedCorrect = [...qAnswers].filter((a) => a.is_correct).sort((a, b) => {
      return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    })
    const firstCorrectAnswer = sortedCorrect[0]
    const firstCorrectName = firstCorrectAnswer
      ? firstCorrectAnswer.group_id
        ? firstCorrectAnswer.live_session_groups?.label || 'Pangkat'
        : firstCorrectAnswer.profiles?.full_name || 'Mag-aaral'
      : null

    return {
      ...q,
      totalSubmissions,
      correctCount,
      accuracy,
      avgResponseMs,
      firstCorrectName,
      firstCorrectTime: firstCorrectAnswer ? Math.round(firstCorrectAnswer.response_ms / 100) / 10 : null
    }
  })

  // Calculate standings
  const standings = session.mode === 'group'
    ? groups.map((g) => {
        const gAnswers = answers.filter((a) => a.group_id === g.id)
        const totalResponseMs = gAnswers.reduce((acc, cur) => acc + (cur.response_ms || 0), 0)
        return {
          id: g.id,
          name: g.label,
          score: g.total_score,
          totalResponseMs,
          is_group: true
        }
      }).sort((a, b) => b.score !== a.score ? b.score - a.score : a.totalResponseMs - b.totalResponseMs)
    : participants.filter(p => !p.removed_at).map((p) => {
        const pAnswers = answers.filter((a) => a.student_id === p.student_id)
        const totalResponseMs = pAnswers.reduce((acc, cur) => acc + (cur.response_ms || 0), 0)
        return {
          id: p.student_id,
          name: p.profiles?.full_name || 'Mag-aaral',
          score: p.total_score,
          totalResponseMs,
          is_group: false
        }
      }).sort((a, b) => b.score !== a.score ? b.score - a.score : a.totalResponseMs - b.totalResponseMs)

  // Handle Session Duplication
  const handleDuplicateSession = () => {
    startTransition(async () => {
      try {
        const res = await duplicateSessionAction(session.id)
        if (res.success && res.newSessionId) {
          router.push(`/educator/classrooms/${classroomId}/live/setup?duplicate_from=${res.newSessionId}`)
        }
      } catch (err: any) {
        showToast(err?.message || 'Nabigo sa pagkopya ng sesyon.')
      }
    })
  }

  // Handle Client-side CSV Export
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF' // UTF-8 BOM

    // 1. Session Details Header
    csvContent += `Live Session Report - ${classroomName}\n`
    csvContent += `Mode,${session.mode},Pacing,${session.pacing},Date,${new Date(session.created_at).toLocaleDateString()}\n\n`

    // 2. Final Standings
    csvContent += 'FINAL STANDINGS\n'
    csvContent += 'Rank,Name,Total Score,Cumulative Response Time (ms)\n'
    standings.forEach((entry, idx) => {
      csvContent += `${idx + 1},"${entry.name.replace(/"/g, '""')}",${entry.score},${entry.totalResponseMs}\n`
    })

    csvContent += '\nPER-QUESTION BREAKDOWN\n'
    csvContent += 'Item,Prompt,Correct Answer,Accuracy %,Submissions,Avg Response Time (s),First Correct\n'
    questionStats.forEach((q, idx) => {
      csvContent += `${idx + 1},"${q.prompt.replace(/"/g, '""')}","${q.correct_answer.replace(/"/g, '""')}",${q.accuracy}%,${q.totalSubmissions},${Math.round(q.avgResponseMs / 100) / 10},"${(q.firstCorrectName || 'N/A').replace(/"/g, '""')}"\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `live_session_results_${classroomId}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Na-download na ang CSV report!')
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-6 right-6 z-[150] px-5 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-2xl flex items-center gap-2 animate-slide-up">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toast}</span>
        </div>
      )}

      {/* Back Button */}
      <Link
        href={`/educator/classrooms/${classroomId}`}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary font-bold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <Translate fil={`Bumalik sa ${classroomName}`} en={`Back to ${classroomName}`} />
      </Link>

      {/* Header Banner & Action Buttons */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
              Tapos na Sesyon
            </span>
            <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-black">
              {session.mode === 'group' ? 'Pangkatang Mode' : 'Indibidwal'}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-heading font-black text-slate-900">
            <Translate fil="Pinal na Resulta at Ulat ng Sesyon" en="Live Session Final Results & Report" />
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            {classroomName} • {questions.length} mga tanong • {standings.length} kalahok
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-full shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-brand-primary" />
            <Translate fil="I-export bilang CSV" en="Export CSV Report" />
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={handleDuplicateSession}
            className="px-5 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold text-xs rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            <Translate fil="I-duplicate ang Sesyon" en="Duplicate Session" />
          </button>
        </div>
      </div>

      {/* Grid: Standings Podium & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Final Standings Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-black text-slate-900">
                    <Translate fil="Pinal na Ranggo at Marka" en="Final Standings" />
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Inayos batay sa kabuuang puntos at bilis ng pagsagot.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {standings.map((entry, idx) => {
                const rank = idx + 1
                return (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      rank === 1
                        ? 'bg-yellow-50/80 border-yellow-300 shadow-sm'
                        : rank === 2
                        ? 'bg-slate-50/90 border-slate-300'
                        : rank === 3
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                        rank === 1 ? 'bg-yellow-400 text-amber-950 shadow-xs' : rank === 2 ? 'bg-slate-200 text-slate-800' : rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rank}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate">
                          {entry.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">
                          Kabuuang Bilis: {Math.round(entry.totalResponseMs / 100) / 10}s
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-heading font-black text-lg text-slate-900">
                        {entry.score.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-extrabold ml-1">pts</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Per-Question Accuracy Breakdown */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
            <h3 className="text-lg font-heading font-black text-slate-900 pb-3 border-b border-slate-100">
              <Translate fil="Pagsusuri kada Tanong" en="Question Breakdown" />
            </h3>

            <div className="space-y-3">
              {questionStats.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-primary text-white flex items-center justify-center font-black text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs font-extrabold text-slate-800 line-clamp-2 flex-1">
                      {q.prompt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 border-t border-slate-200/60">
                    <span className={`px-2 py-0.5 rounded-full font-black ${
                      q.accuracy >= 70 ? 'bg-emerald-100 text-emerald-800' : q.accuracy >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {q.accuracy}% Tumpak
                    </span>
                    <span>Avg: {Math.round(q.avgResponseMs / 100) / 10}s</span>
                  </div>

                  {q.firstCorrectName && (
                    <p className="text-[10px] text-amber-700 font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Una: {q.firstCorrectName} ({q.firstCorrectTime}s)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
