'use client'

import Link from 'next/link'
import { Trophy, ArrowLeft, CheckCircle2, XCircle, Clock, Sparkles, Lock } from 'lucide-react'
import { Translate } from '@/components/Translate'
import { LiveSession, LiveSessionQuestion, LiveSessionParticipant, LiveSessionAnswer } from '@/types/live-session'
import { LiveLeaderboard } from '@/components/live/LiveLeaderboard'

interface StudentLiveResultsClientProps {
  classroomId: string
  classroomName: string
  session: LiveSession
  currentUserId: string
  participant: LiveSessionParticipant | null
  questions: LiveSessionQuestion[]
  studentAnswers: LiveSessionAnswer[]
}

export function StudentLiveResultsClient({
  classroomId,
  classroomName,
  session,
  currentUserId,
  participant,
  questions,
  studentAnswers
}: StudentLiveResultsClientProps) {
  const isResultsRevealed = session.reveal_mode !== 'end_of_session' || !!session.results_revealed_at

  const totalScore = participant?.total_score || 0
  const correctCount = studentAnswers.filter((a) => a.is_correct).length
  const totalAnswered = studentAnswers.length
  const totalQuestions = questions.length

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href={`/student/classrooms/${classroomId}`}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary font-bold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <Translate fil={`Bumalik sa ${classroomName}`} en={`Back to ${classroomName}`} />
      </Link>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black text-slate-900">
            <Translate fil="Resulta ng Iyong Pagsusulit" en="Your Live Session Results" />
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            {classroomName} • {session.mode === 'group' ? 'Pangkatang Mode' : 'Indibidwal'}
          </p>
        </div>

        {/* Score Card Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto pt-2">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Kabuuang Marka</span>
            <span className="font-heading font-black text-2xl text-brand-primary">
              {totalScore.toLocaleString()}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Tamang Sagot</span>
            <span className="font-heading font-black text-2xl text-emerald-600">
              {correctCount} / {totalQuestions}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Bahagdan</span>
            <span className="font-heading font-black text-2xl text-slate-800">
              {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Standings or Hidden Results Notice */}
      {!isResultsRevealed ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-black text-slate-800 text-lg">
            <Translate fil="Nakatago ang Talaan ng Marka" en="Leaderboard Results Hidden" />
          </h3>
          <p className="text-slate-500 text-xs font-medium max-w-sm mx-auto leading-relaxed">
            <Translate
              fil="Ihahayag ng guro ang opisyal na talaan ng marka para sa buong klase sa tamang oras."
              en="The educator will reveal the official class standings and correct answers at the scheduled time."
            />
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <LiveLeaderboard
            sessionId={session.id}
            mode={session.mode}
            revealMode={session.reveal_mode}
            resultsRevealedAt={session.results_revealed_at}
            isHost={false}
            currentUserId={currentUserId}
          />

          {/* Per Question Review */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md space-y-4">
            <h3 className="font-heading font-black text-slate-900 text-lg pb-3 border-b border-slate-100">
              <Translate fil="Pagsusuri sa mga Tanong" en="Question Review" />
            </h3>

            <div className="space-y-3">
              {questions.map((q, idx) => {
                const answerRow = studentAnswers.find((a) => a.question_id === q.id)
                const isCorrect = answerRow?.is_correct
                const hasAnswer = !!answerRow

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      !hasAnswer
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : isCorrect
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/70 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        !hasAnswer ? 'bg-slate-200 text-slate-700' : isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 leading-snug">
                          {q.prompt}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Ang iyong sagot: <span className="font-bold text-slate-800">{answerRow ? answerRow.answer : 'Walang isinumite'}</span> • Tamang sagot: <span className="font-bold text-emerald-700">{q.correct_answer}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                        !hasAnswer ? 'bg-slate-200 text-slate-700' : isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {!hasAnswer ? 'Walang Sagot' : isCorrect ? `+${answerRow.points_awarded} pts` : 'Mali (0 pts)'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
