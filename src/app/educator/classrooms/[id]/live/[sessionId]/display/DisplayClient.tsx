'use client'

import { useState, useEffect } from 'react'
import { LiveSession } from '@/types/live-session'
import { useLiveSession } from '@/lib/hooks/useLiveSession'
import { useGroups } from '@/lib/hooks/useGroups'
import { useServerTimeOffset } from '@/lib/hooks/useServerTimeOffset'
import { QRCodeDisplay } from '@/components/live/QRCodeDisplay'
import { LiveLeaderboard } from '@/components/live/LiveLeaderboard'
import { FirstCorrectBadge } from '@/components/live/FirstCorrectBadge'
import { CountdownTimer } from '@/components/live/CountdownTimer'
import { normalizeChoices } from '@/lib/utils/randomize'
import { Trophy, Users, Clock, Sparkles, CheckCircle2 } from 'lucide-react'
import { Translate } from '@/components/Translate'
import { createClient } from '@/lib/supabase/client'

interface DisplayClientProps {
  classroomId: string
  classroomName: string
  enrollmentCode: string
  initialSession: LiveSession
}

export function DisplayClient({
  classroomId,
  classroomName,
  enrollmentCode,
  initialSession
}: DisplayClientProps) {
  const { serverOffset } = useServerTimeOffset()
  const { session, questions, currentQuestion } = useLiveSession(
    initialSession.id,
    initialSession
  )
  const { groups, participants } = useGroups(initialSession.id)
  const [submissionCount, setSubmissionCount] = useState<number>(0)
  const supabase = createClient()

  const currentStatus = session?.status || initialSession.status
  const isLobby = currentStatus === 'setup' || currentStatus === 'lobby'
  const isLive = currentStatus === 'question' || currentStatus === 'reveal'
  const isEnded = currentStatus === 'ended'

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/student/classrooms/${classroomId}/live/${initialSession.id}`
    : `/student/classrooms/${classroomId}/live/${initialSession.id}`

  const activeParticipants = participants.filter((p) => !p.removed_at)
  const totalExpected = session?.mode === 'group' ? groups.length : activeParticipants.length

  // Track aggregate answers count for current question
  useEffect(() => {
    if (!currentQuestion || !session) {
      setSubmissionCount(0)
      return
    }

    const fetchSubmissions = async () => {
      const { count } = await supabase
        .from('live_session_answers')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .eq('question_id', currentQuestion.id)

      setSubmissionCount(count || 0)
    }

    fetchSubmissions()

    const channel = supabase.channel(`display-submissions-${currentQuestion.id}`)
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_answers',
          filter: `question_id=eq.${currentQuestion.id}`
        },
        () => {
          fetchSubmissions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentQuestion, session, supabase])

  const choices = currentQuestion ? normalizeChoices(currentQuestion.choices) : []

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col justify-between flex-1 space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/30 border border-brand-primary text-emerald-400 flex items-center justify-center font-heading font-black text-2xl shadow-lg">
            G
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-white">
              {classroomName}
            </h1>
            <p className="text-xs font-bold text-slate-400">
              {session?.mode === 'group' ? 'Pangkatang Mode' : 'Indibidwal na Mode'} •{' '}
              {session?.pacing === 'timed' ? 'May Oras' : 'Manual'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-xs font-black text-slate-300">
            {activeParticipants.length} Kalahok
          </span>
          <span className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full text-xs font-black uppercase tracking-wider">
            ● Projector View
          </span>
        </div>
      </div>

      {/* Standby / Paused Projector Alert Banner */}
      {session?.is_paused && (
        <div className="bg-amber-500/20 border-2 border-amber-400/80 rounded-3xl p-6 text-center space-y-2 backdrop-blur-md animate-pulse">
          <div className="flex items-center justify-center gap-3 text-amber-400">
            <Clock className="w-6 h-6 animate-spin" />
            <h3 className="text-xl md:text-2xl font-heading font-black">
              <Translate fil="NAKA-PAUSE / STANDBY" en="PAUSED / STANDBY" />
            </h3>
          </div>
          <p className="text-amber-200/90 text-sm font-medium">
            <Translate
              fil="Kasalukuyang naka-standby ang live session. Magpapatuloy sa sandaling i-resume ng guro."
              en="Session is currently on standby. It will resume shortly."
            />
          </p>
        </div>
      )}

      {/* ================= LOBBY PHASE ================= */}
      {isLobby && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center my-auto animate-fade-in">
          {/* Left: QR Code & Code */}
          <div className="flex flex-col items-center text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-heading font-black text-white">
              <Translate fil="Sumali sa Live Session!" en="Join the Live Session!" />
            </h2>
            <p className="text-slate-400 text-base max-w-md">
              <Translate
                fil="I-scan ang QR code gamit ang camera ng iyong telepono o pumunta sa link para makasali."
                en="Scan the QR code using your phone camera or visit the link to join."
              />
            </p>

            <div className="p-6 bg-white rounded-3xl shadow-2xl inline-block border-4 border-emerald-500/30">
              <QRCodeDisplay
                url={joinUrl}
                code={enrollmentCode}
                size={260}
                showCopy={false}
              />
            </div>
          </div>

          {/* Right: Joiners Counter & Groups List */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <h3 className="text-xl font-heading font-black text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-400" />
                <Translate fil="Mga Nakasali Nang Mag-aaral" en="Joined Participants" />
              </h3>
              <span className="text-2xl font-mono font-black text-emerald-400">
                {activeParticipants.length} / {session?.capacity}
              </span>
            </div>

            {session?.mode === 'group' && groups.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                {groups.map((group) => {
                  const members = activeParticipants.filter((p) => p.group_id === group.id)
                  return (
                    <div key={group.id} className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-black text-white text-sm">{group.label}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{members.length} kasapi</span>
                      </div>
                      <p className="text-xs font-bold text-amber-400 truncate">
                        Lider: {group.leader?.full_name || 'Bumoto pa'}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 max-h-80 overflow-y-auto pr-2">
                {activeParticipants.map((p) => (
                  <span
                    key={p.student_id}
                    className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-full text-xs font-extrabold text-slate-200"
                  >
                    {p.profiles?.full_name || 'Mag-aaral'}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= LIVE QUESTION PHASE ================= */}
      {isLive && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 my-auto animate-fade-in">
          {/* Main Area: Question Prompt & Choices */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-8 backdrop-blur-md">
              {/* Question Header & Submissions counter */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-black text-sm rounded-full">
                  Tanong {(session?.question_index || 0) + 1} / {questions.length}
                </span>

                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-full text-xs font-black">
                    {submissionCount} / {totalExpected} nakasagot
                  </span>

                  {session?.pacing === 'timed' && session.question_started_at && !currentQuestion?.revealed_at && (
                    <div className="w-36">
                      <CountdownTimer
                        startedAt={session.question_started_at}
                        durationSeconds={currentQuestion?.time_limit_seconds || session.default_time_limit_seconds || 30}
                        serverOffset={serverOffset}
                        isPaused={session?.is_paused}
                        variant="compact"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Question Prompt */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-black text-white leading-tight">
                {currentQuestion?.prompt}
              </h2>

              {/* Choices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {choices.map((choice, idx) => {
                  const letter = String.fromCharCode(65 + idx)
                  const isCorrect = currentQuestion?.revealed_at &&
                    choice.text.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase()

                  return (
                    <div
                      key={choice.id}
                      className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${
                        isCorrect
                          ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-100 shadow-xl'
                          : 'bg-slate-900/80 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-xl font-black text-base flex items-center justify-center shrink-0 ${
                          isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-xl font-bold leading-snug pt-0.5">{choice.text}</span>
                    </div>
                  )
                })}
              </div>

              {/* First Correct Answer Recognition */}
              {currentQuestion && (
                <FirstCorrectBadge
                  sessionId={initialSession.id}
                  questionId={currentQuestion.id}
                />
              )}
            </div>
          </div>

          {/* Sidebar: Synchronized Leaderboard */}
          <div className="space-y-6">
            <LiveLeaderboard
              sessionId={initialSession.id}
              mode={session?.mode}
              revealMode={session?.reveal_mode}
              resultsRevealedAt={session?.results_revealed_at}
              isHost={false}
            />
          </div>
        </div>
      )}

      {/* ================= ENDED PHASE ================= */}
      {isEnded && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-10 shadow-2xl text-center max-w-3xl mx-auto space-y-8 my-auto animate-fade-in backdrop-blur-md">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center mx-auto shadow-xl">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-3xl md:text-5xl font-heading font-black text-white mb-3">
              <Translate fil="Tapos na ang Live Session! 🎉" en="Live Session Ended! 🎉" />
            </h2>
            <p className="text-slate-400 text-base">
              <Translate
                fil="Salamat sa inyong masiglang partisipasyon at pakikilahok!"
                en="Thank you for your active participation and teamwork!"
              />
            </p>
          </div>

          <div className="text-left">
            <LiveLeaderboard
              sessionId={initialSession.id}
              mode={session?.mode}
              revealMode={session?.reveal_mode}
              resultsRevealedAt={session?.results_revealed_at}
              isHost={false}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs font-bold text-slate-500 pt-6 border-t border-slate-800">
        Gramatek Live Synchronous Arena • Supabase Realtime Serverless Engine
      </div>
    </div>
  )
}
