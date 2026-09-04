'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, User, Play, SkipForward, ArrowRight, Eye, 
  Trophy, LogOut, ExternalLink, QrCode, Crown, UserMinus, 
  CheckCircle2, Sparkles, RefreshCw, AlertTriangle, Loader2,
  ChevronRight, ArrowLeft, Clock, Check, Award, BookCheck
} from 'lucide-react'
import { Translate } from '@/components/Translate'
import { LiveSession } from '@/types/live-session'
import { useLiveSession } from '@/lib/hooks/useLiveSession'
import { useGroups } from '@/lib/hooks/useGroups'
import { useServerTimeOffset } from '@/lib/hooks/useServerTimeOffset'
import { QRCodeDisplay } from '@/components/live/QRCodeDisplay'
import { LiveLeaderboard } from '@/components/live/LiveLeaderboard'
import { FirstCorrectBadge } from '@/components/live/FirstCorrectBadge'
import { CountdownTimer } from '@/components/live/CountdownTimer'
import { 
  startLiveSessionAction, 
  advanceQuestionAction, 
  goToQuestionAction, 
  removeParticipantAction,
  forceAssignLeaderAction,
  revealAnswerAction,
  revealFinalResultsAction,
  endSessionAction,
  recordLiveSessionScoresAction
} from '@/app/educator/live/actions'
import { createClient } from '@/lib/supabase/client'

interface HostControlPanelClientProps {
  classroomId: string
  classroomName: string
  enrollmentCode: string
  initialSession: LiveSession
}

export function HostControlPanelClient({
  classroomId,
  classroomName,
  enrollmentCode,
  initialSession
}: HostControlPanelClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { serverOffset } = useServerTimeOffset()

  const {
    session,
    questions,
    currentQuestion,
    loading: sessionLoading,
    refreshData
  } = useLiveSession(initialSession.id, initialSession)

  const {
    groups,
    participants,
    loading: groupsLoading,
    randomizeGroups,
    forceAssignLeader
  } = useGroups(initialSession.id)

  const [numGroupsToCreate, setNumGroupsToCreate] = useState<number>(2)
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false)
  const [submissionCount, setSubmissionCount] = useState<number>(0)
  const [submissions, setSubmissions] = useState<Array<{
    student_id: string | null
    group_id: string | null
    submitted_at: string
    response_ms: number
    is_correct?: boolean
  }>>([])
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'pending'>('all')
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [recordingScores, setRecordingScores] = useState<boolean | null>(initialSession.scores_recorded_to_progress ?? null)

  useEffect(() => {
    if (session?.scores_recorded_to_progress !== undefined) {
      setRecordingScores(session.scores_recorded_to_progress)
    }
  }, [session?.scores_recorded_to_progress])

  const supabase = createClient()

  // Track submissions count and records for current question
  useEffect(() => {
    if (!currentQuestion || !session) {
      setSubmissionCount(0)
      setSubmissions([])
      return
    }

    const fetchSubmissions = async () => {
      const { data } = await supabase
        .from('live_session_answers')
        .select('student_id, group_id, submitted_at, response_ms, is_correct')
        .eq('session_id', session.id)
        .eq('question_id', currentQuestion.id)

      if (data) {
        setSubmissions(data)
        setSubmissionCount(data.length)
      }
    }

    fetchSubmissions()

    const channel = supabase.channel(`host-submissions-${currentQuestion.id}`)
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
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

  const showToast = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessToast(msg)
      setTimeout(() => setSuccessToast(null), 3000)
    } else {
      setErrorToast(msg)
      setTimeout(() => setErrorToast(null), 4000)
    }
  }

  // Actions
  const handleStartSession = () => {
    startTransition(async () => {
      try {
        await startLiveSessionAction(initialSession.id)
        await advanceQuestionAction(initialSession.id)
        showToast('success', 'Nagsimula na ang sesyon!')
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa pagsisimula.')
      }
    })
  }

  const handleAdvance = () => {
    startTransition(async () => {
      try {
        await advanceQuestionAction(initialSession.id)
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa paglipat ng tanong.')
      }
    })
  }

  const handleGoToQuestion = (qIndex: number) => {
    startTransition(async () => {
      try {
        await goToQuestionAction(initialSession.id, qIndex)
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa pagtalon sa tanong.')
      }
    })
  }

  const handleRemoveParticipant = (studentId: string, studentName: string) => {
    startTransition(async () => {
      try {
        await removeParticipantAction(initialSession.id, studentId)
        showToast('success', `Inalis si ${studentName} mula sa sesyon.`)
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa pag-alis.')
      }
    })
  }

  const handleForceAssignLeader = (groupId: string, studentId: string) => {
    startTransition(async () => {
      try {
        await forceAssignLeader(groupId, studentId)
        showToast('success', 'Matagumpay na itinalaga ang Lider!')
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa pagtatalaga.')
      }
    })
  }

  const handleRandomizeGroups = () => {
    startTransition(async () => {
      try {
        await randomizeGroups(numGroupsToCreate)
        showToast('success', `Nahati sa ${numGroupsToCreate} mga pangkat!`)
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa paghahati.')
      }
    })
  }

  const handleRevealAnswer = () => {
    if (!currentQuestion) return
    startTransition(async () => {
      try {
        await revealAnswerAction(initialSession.id, currentQuestion.id)
        showToast('success', 'Nailahad na ang sagot!')
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa paglahad.')
      }
    })
  }

  const handleRevealFinalResults = () => {
    startTransition(async () => {
      try {
        await revealFinalResultsAction(initialSession.id)
        showToast('success', 'Nailahad na ang pinal na resulta para sa lahat!')
        router.push(`/educator/classrooms/${classroomId}/live/${initialSession.id}/results`)
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa paglahad ng resulta.')
      }
    })
  }

  const handleEndSession = () => {
    startTransition(async () => {
      try {
        await endSessionAction(initialSession.id)
        if (session?.reveal_mode !== 'end_of_session') {
          router.push(`/educator/classrooms/${classroomId}/live/${initialSession.id}/results`)
        }
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa pagtapos.')
      }
    })
  }

  const handleRecordScores = (record: boolean) => {
    startTransition(async () => {
      try {
        await recordLiveSessionScoresAction(initialSession.id, record)
        setRecordingScores(record)
        showToast(
          'success',
          record
            ? 'Naitala na ang mga marka sa progreso ng mga mag-aaral! 🎉'
            : 'Naitakda bilang hindi naka-record sa grado (Palaro Lamang).'
        )
      } catch (err: any) {
        showToast('error', err?.message || 'Nabigo sa pag-update ng marka.')
      }
    })
  }

  const currentStatus = session?.status || initialSession.status
  const isLobby = currentStatus === 'setup' || currentStatus === 'lobby'
  const isLive = currentStatus === 'question' || currentStatus === 'reveal'
  const isEnded = currentStatus === 'ended'

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/student/classrooms/${classroomId}/live/${initialSession.id}`
    : `/student/classrooms/${classroomId}/live/${initialSession.id}`

  const displayUrl = `/educator/classrooms/${classroomId}/live/${initialSession.id}/display`

  const activeParticipants = participants.filter((p) => !p.removed_at)
  const totalTargetSubmissions = session?.mode === 'group' ? groups.length : activeParticipants.length

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successToast && (
        <div className="fixed top-6 right-6 z-[150] px-5 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-2xl flex items-center gap-2 animate-slide-up">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-6 right-6 z-[150] px-5 py-3.5 rounded-2xl bg-rose-600 text-white font-bold text-sm shadow-2xl flex items-center gap-2 animate-slide-up">
          <AlertTriangle className="w-5 h-5" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Top Navigation & Status Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isLobby ? 'bg-amber-100 text-amber-800' : isLive ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-slate-100 text-slate-700'
            }`}>
              ● {currentStatus}
            </span>
            <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-black">
              {session?.mode === 'group' ? 'Pangkatang Mode' : 'Indibidwal na Mode'}
            </span>
            <span className="text-xs font-bold text-slate-400">
              Kapasidad: {activeParticipants.length} / {session?.capacity}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-heading font-black text-slate-900">
            {classroomName} • <Translate fil="Control Panel ng Guro" en="Teacher Host Panel" />
          </h1>
        </div>

        {/* Display Screen Link */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsQRModalOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-full transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-brand-primary" />
            <Translate fil="QR & Link ng Pagsali" en="Join QR & Link" />
          </button>

          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold text-xs rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <Translate fil="Buksan ang Display Screen" en="Open Display View" />
          </a>
        </div>
      </div>

      {/* ================= LOBBY PHASE ================= */}
      {isLobby && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Main Column: Group & Session Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Start Live Session Action Banner */}
            <div className="bg-linear-to-br from-brand-primary to-brand-secondary text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider mb-2 inline-block">
                  Lobby Handa Na
                </span>
                <h2 className="text-2xl font-heading font-black">
                  <Translate fil="Handa nang Simulan ang Sesyon?" en="Ready to Start Session?" />
                </h2>
                <p className="text-white/80 text-sm font-medium mt-1">
                  {questions.length} mga tanong • {activeParticipants.length} sumaling mag-aaral
                </p>
              </div>

              <button
                type="button"
                disabled={isPending || questions.length === 0}
                onClick={handleStartSession}
                className="px-8 py-4 bg-white hover:bg-brand-light text-brand-primary font-heading font-black text-base rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-brand-primary" />}
                <Translate fil="Simulan ang Unang Tanong ➔" en="Start First Question ➔" />
              </button>
            </div>

            {/* Group Mode Management (if group mode) */}
            {session?.mode === 'group' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-heading font-black text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-brand-primary" />
                      <Translate fil="Pamamahala ng mga Pangkat" en="Group Management" />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Hatiin ang mga sumaling mag-aaral at magtalaga o magpaboto ng Lider.
                    </p>
                  </div>

                  {/* Randomize control */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Bilang ng Pangkat:</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={numGroupsToCreate}
                      onChange={(e) => setNumGroupsToCreate(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-center font-black text-sm"
                    />
                    <button
                      type="button"
                      disabled={isPending || activeParticipants.length === 0}
                      onClick={handleRandomizeGroups}
                      className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold text-xs rounded-full shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <Translate fil="I-randomize" en="Randomize" />
                    </button>
                  </div>
                </div>

                {/* Groups Grid */}
                {groups.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 font-bold text-sm">
                    <Translate
                      fil="Wala pang nilikhang pangkat. I-click ang 'I-randomize' sa itaas."
                      en="No groups created yet. Click 'Randomize' above."
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((group) => {
                      const groupMembers = activeParticipants.filter((p) => p.group_id === group.id)

                      return (
                        <div
                          key={group.id}
                          className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-heading font-black text-slate-900 text-base">
                              {group.label}
                            </h4>
                            <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-black">
                              {groupMembers.length} kasapi
                            </span>
                          </div>

                          {/* Leader status */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Crown className={`w-4 h-4 ${group.leader_id ? 'fill-amber-400 text-amber-600' : 'text-slate-300'}`} />
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-slate-400 block">LIDER</span>
                                <span className="text-xs font-black text-slate-800 truncate block">
                                  {group.leader?.full_name || 'Wala pang lider'}
                                </span>
                              </div>
                            </div>

                            {/* Manual leader override selector */}
                            <select
                              value={group.leader_id || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleForceAssignLeader(group.id, e.target.value)
                                }
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none"
                            >
                              <option value="">Italagang Lider...</option>
                              {groupMembers.map((m) => (
                                <option key={m.student_id} value={m.student_id}>
                                  {m.profiles?.full_name || 'Mag-aaral'}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Members tags */}
                          <div className="flex flex-wrap gap-1.5">
                            {groupMembers.map((m) => (
                              <span
                                key={m.student_id}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-700"
                              >
                                {m.profiles?.full_name || 'Mag-aaral'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Column: Joined Participants & Kick Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-primary" />
                  <h3 className="font-heading font-black text-slate-900 text-base">
                    <Translate fil="Mga Sumaling Mag-aaral" en="Joined Students" />
                  </h3>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-black">
                  {activeParticipants.length}
                </span>
              </div>

              {activeParticipants.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-medium text-xs">
                  <Translate fil="Wala pang sumasali. Ibahagi ang QR code." en="No students joined yet. Share the QR code." />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {activeParticipants.map((p) => {
                    const name = p.profiles?.full_name || 'Mag-aaral'
                    return (
                      <div
                        key={p.student_id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {p.profiles?.avatar_url ? (
                              <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <p className="text-xs font-black text-slate-900 truncate">{name}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.student_id, name)}
                          className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                          title="Alisin ang mag-aaral (Kick)"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= LIVE QUESTION PHASE ================= */}
      {isLive && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Main Area: Current Question & Teacher Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Host Live Action Toolbar */}
            <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 bg-brand-primary text-white rounded-full text-xs font-black">
                  Tanong {(session?.question_index || 0) + 1} / {questions.length}
                </span>

                {/* Submissions counter */}
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-extrabold">
                  {submissionCount} / {totalTargetSubmissions} nakasumite
                </span>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-2">
                {/* Reveal Answer Button (if manual_per_question) */}
                {session?.reveal_mode === 'manual_per_question' && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleRevealAnswer}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-full shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <Translate fil="Ilahad ang Sagot" en="Reveal Answer" />
                  </button>
                )}

                {/* Next / Skip Question */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleAdvance}
                  className="px-5 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-black text-xs rounded-full shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
                  <Translate fil="Susunod na Tanong" en="Next Question" />
                </button>

                {/* End Session */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleEndSession}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs rounded-full border border-slate-200 transition-colors cursor-pointer"
                >
                  <Translate fil="Tapusin" en="End" />
                </button>
              </div>
            </div>

            {/* Current Question Display Card */}
            {currentQuestion ? (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Aktibong Tanong</span>
                    {currentQuestion.revealed_at && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                        Nailahad Na
                      </span>
                    )}
                  </div>

                  {session?.pacing === 'timed' && session.question_started_at && (
                    <div className="w-48">
                      <CountdownTimer
                        startedAt={session.question_started_at}
                        durationSeconds={currentQuestion.time_limit_seconds || session.default_time_limit_seconds || 30}
                        serverOffset={serverOffset}
                        variant="bar"
                      />
                    </div>
                  )}
                </div>

                <h2 className="text-2xl md:text-3xl font-heading font-black text-slate-900 leading-snug">
                  {currentQuestion.prompt}
                </h2>

                {/* First Correct Badge if available */}
                <FirstCorrectBadge
                  sessionId={initialSession.id}
                  questionId={currentQuestion.id}
                />

                {/* Correct Answer Highlight for Host */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                      Tamang Sagot (Host View):
                    </span>
                    <span className="text-base font-black text-emerald-950">
                      {currentQuestion.correct_answer}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center font-bold text-slate-400">
                <Translate fil="Walang aktibong tanong." en="No active question." />
              </div>
            )}

            {/* Real-time Student Submission Status Monitor */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-slate-900 text-base">
                      <Translate fil="Status ng Pagsusumite ng mga Mag-aaral" en="Student Submission Status" />
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Real-time na subaybayan kung sino na ang nakapagpasa para sa tanong na ito.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3.5 py-1.5 bg-emerald-100 text-emerald-950 rounded-full text-xs font-black border border-emerald-300">
                    {submissionCount} / {totalTargetSubmissions} ({Math.round((submissionCount / Math.max(1, totalTargetSubmissions)) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((submissionCount / Math.max(1, totalTargetSubmissions)) * 100))}%` }}
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    submissionFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Lahat ({totalTargetSubmissions})
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('submitted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    submissionFilter === 'submitted'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  ✓ Nakasumite ({submissionCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    submissionFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  ⏳ Sumasagot Pa ({Math.max(0, totalTargetSubmissions - submissionCount)})
                </button>
              </div>

              {/* Submission Roster List (Individual vs Group Mode) */}
              {session?.mode === 'group' ? (
                /* Group Mode submission list */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {groups
                    .filter((g) => {
                      const hasSubmitted = submissions.some((s) => s.group_id === g.id)
                      if (submissionFilter === 'submitted') return hasSubmitted
                      if (submissionFilter === 'pending') return !hasSubmitted
                      return true
                    })
                    .map((group) => {
                      const subRecord = submissions.find((s) => s.group_id === group.id)
                      const isSubmitted = !!subRecord

                      return (
                        <div
                          key={group.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isSubmitted
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate">{group.label}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                              Lider: {group.leader?.full_name || 'Wala'}
                            </p>
                          </div>

                          <div>
                            {isSubmitted ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-[10px] font-black flex items-center gap-1 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Naisumite na
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-100/70 text-amber-800 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Sumasagot pa...
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                /* Individual Mode submission list */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {activeParticipants
                    .filter((p) => {
                      const hasSubmitted = submissions.some((s) => s.student_id === p.student_id)
                      if (submissionFilter === 'submitted') return hasSubmitted
                      if (submissionFilter === 'pending') return !hasSubmitted
                      return true
                    })
                    .map((p) => {
                      const name = p.profiles?.full_name || 'Mag-aaral'
                      const subRecord = submissions.find((s) => s.student_id === p.student_id)
                      const isSubmitted = !!subRecord

                      return (
                        <div
                          key={p.student_id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSubmitted
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-brand-light text-brand-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                              {p.profiles?.avatar_url ? (
                                <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate">{name}</span>
                          </div>

                          <div>
                            {isSubmitted ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md text-[10px] font-black flex items-center gap-1 border border-emerald-300 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {subRecord?.response_ms ? `${(subRecord.response_ms / 1000).toFixed(1)}s` : '✓'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100/70 text-amber-800 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                ⏳
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Jump-to-question Quick Navigator */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-3">
                <Translate fil="Tumalon sa Tanong (Host Navigator):" en="Jump to Question (Host Navigator):" />
              </span>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = currentQuestion?.id === q.id
                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleGoToQuestion(q.order_index)}
                      className={`w-10 h-10 rounded-xl font-heading font-black text-sm border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-brand-primary text-white border-brand-primary shadow-md scale-105'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-brand-light'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sidebar: Live Leaderboard */}
          <div className="space-y-6">
            <LiveLeaderboard
              sessionId={initialSession.id}
              mode={session?.mode}
              revealMode={session?.reveal_mode}
              resultsRevealedAt={session?.results_revealed_at}
              isHost={true}
            />
          </div>
        </div>
      )}

      {/* ================= ENDED PHASE ================= */}
      {isEnded && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-black text-slate-900 mb-2">
              <Translate fil="Tapos na ang Live Session!" en="Live Session Ended!" />
            </h2>
            <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
              {session?.reveal_mode === 'end_of_session' && !session.results_revealed_at ? (
                <Translate
                  fil="Nakatago pa ang mga resulta sa mga mag-aaral. I-click ang 'Ilahad ang Pinal na Resulta' para sa big reveal."
                  en="Results are still hidden from students. Click 'Reveal Final Results' for the big reveal."
                />
              ) : (
                <Translate
                  fil="Maaari mo nang suriin ang buong resulta, accuracy breakdown, at mag-download ng CSV export."
                  en="You can now review complete standings, question accuracy, and download the CSV report."
                />
              )}
            </p>
          </div>

          {/* Score Recording to Student Progress Option Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center font-bold shrink-0">
                <BookCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-heading font-black text-slate-900">
                  <Translate fil="Pagre-record ng Marka sa Progreso ng Mag-aaral" en="Record Scores to Student Progress" />
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  <Translate
                    fil="Pumili kung nais mong i-save ang mga nakuhang marka sa opisyal na grado at progreso ng klase, o panatilihin ito bilang palaro lamang."
                    en="Choose whether to save the scores to students' official grades and progress, or keep it as casual play."
                  />
                </p>
              </div>
            </div>

            {/* Current Recording Status */}
            {recordingScores === true && (
              <div className="p-3.5 rounded-2xl bg-emerald-100/70 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-black text-emerald-950">
                    <Translate fil="Naitala na sa Opisyal na Grado ng mga Mag-aaral" en="Recorded to Students' Official Grades" />
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRecordScores(false)}
                  className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Translate fil="Alisin sa Grado (Gawing Palaro Lamang)" en="Remove from Grades (Casual Only)" />
                </button>
              </div>
            )}

            {recordingScores === false && (
              <div className="p-3.5 rounded-2xl bg-slate-200/80 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-slate-700 shrink-0" />
                  <span className="text-xs font-black text-slate-800">
                    <Translate fil="Naitakda bilang Palaro Lamang (Hindi Naka-record sa Grado)" en="Casual Play (Not Recorded to Grades)" />
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRecordScores(true)}
                  className="px-3.5 py-1.5 bg-brand-primary hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Translate fil="Itala sa Grado ng Mag-aaral" en="Record to Student Grades" />
                </button>
              </div>
            )}

            {recordingScores === null && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRecordScores(true)}
                  className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-left font-black transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-black flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <Translate fil="Itala sa Progreso" en="Save to Progress" />
                    </p>
                    <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">
                      <Translate fil="Isama sa opisyal na grado at analytics" en="Include in grades & analytics" />
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-emerald-200" />
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRecordScores(false)}
                  className="p-4 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-left font-black transition-all shadow-xs hover:shadow-md active:scale-98 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-black flex items-center gap-1.5">
                      <span>✕</span>
                      <Translate fil="Huwag Itala (Palaro Lamang)" en="Don't Save (Casual Only)" />
                    </p>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                      <Translate fil="Mananatili sa leaderboard pero walang grade" en="Keep in leaderboard without grading" />
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {session?.reveal_mode === 'end_of_session' && !session.results_revealed_at && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleRevealFinalResults}
                className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-full shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-amber-200" />}
                <Translate fil="Ilahad ang Pinal na Resulta ✨" en="Reveal Final Results ✨" />
              </button>
            )}

            <Link
              href={`/educator/classrooms/${classroomId}/live/${initialSession.id}/results`}
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-primary hover:bg-brand-secondary text-white font-black rounded-full shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <Translate fil="Tingnan ang Buong Resulta & CSV" en="View Full Results & CSV" />
            </Link>
          </div>
        </div>
      )}

      {/* QR Code & Join Link Modal */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 relative animate-slide-up">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-xl font-heading font-black text-slate-900">
                <Translate fil="QR & Link sa Pagsali" en="Join QR & Link" />
              </h3>
              <button
                type="button"
                onClick={() => setIsQRModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <QRCodeDisplay
              url={joinUrl}
              code={enrollmentCode}
              size={240}
              showCopy={true}
            />

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsQRModalOpen(false)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs cursor-pointer"
              >
                <Translate fil="Isara" en="Close" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
