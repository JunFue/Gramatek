'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, User, Trophy, ShieldAlert, AlertCircle, Clock, 
  Crown, CheckCircle2, ArrowLeft, Loader2, Sparkles, LogOut, Pause, X
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { Translate } from '@/components/Translate'
import { LiveSession, LiveSessionGroup, LiveSessionParticipant } from '@/types/live-session'
import { useLiveSession } from '@/lib/hooks/useLiveSession'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { useServerTimeOffset } from '@/lib/hooks/useServerTimeOffset'
import { QuestionCard } from '@/components/live/QuestionCard'
import { GroupRoster } from '@/components/live/GroupRoster'
import { LeaderVotePanel } from '@/components/live/LeaderVotePanel'
import { LiveLeaderboard } from '@/components/live/LiveLeaderboard'
import { FirstCorrectBadge } from '@/components/live/FirstCorrectBadge'
import { joinLiveSessionAction, submitAnswerAction } from '@/app/student/live/actions'
import { createClient } from '@/lib/supabase/client'

interface StudentLivePlayerClientProps {
  classroomId: string
  classroomName: string
  initialSession: LiveSession
  currentUserId: string
  userName: string
  userAvatar?: string | null
}

export function StudentLivePlayerClient({
  classroomId,
  classroomName,
  initialSession,
  currentUserId,
  userName,
  userAvatar
}: StudentLivePlayerClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { serverOffset } = useServerTimeOffset()

  const {
    session,
    questions,
    currentQuestion,
    loading: sessionLoading
  } = useLiveSession(initialSession.id, initialSession)

  const [joining, setJoining] = useState<boolean>(true)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isRemoved, setIsRemoved] = useState<boolean>(false)

  // Participant & Group state
  const [myParticipant, setMyParticipant] = useState<LiveSessionParticipant | null>(null)
  const [myGroup, setMyGroup] = useState<LiveSessionGroup | null>(null)
  const [groupMembers, setGroupMembers] = useState<LiveSessionParticipant[]>([])

  // Answer Submission state for current question
  const [myAnswer, setMyAnswer] = useState<string | null>(null)
  const [submissionResult, setSubmissionResult] = useState<{
    isCorrect?: boolean
    points?: number
  } | null>(null)

  // Live Leaderboard & Ranking State
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState<boolean>(false)

  const { leaderboard } = useLeaderboard(
    initialSession.id,
    session?.mode || initialSession.mode,
    session?.reveal_mode || initialSession.reveal_mode,
    session?.results_revealed_at,
    false
  )

  const isGroupMode = (session?.mode || initialSession.mode) === 'group'

  const myRankInfo = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return null
    const targetId = isGroupMode && myParticipant?.group_id ? myParticipant.group_id : currentUserId
    const index = leaderboard.findIndex((e) => e.id === targetId)
    if (index === -1) return null
    return {
      rank: index + 1,
      entry: leaderboard[index],
      totalParticipants: leaderboard.length
    }
  }, [leaderboard, isGroupMode, myParticipant?.group_id, currentUserId])

  // 1. Join live session RPC on mount
  useEffect(() => {
    let isMounted = true

    async function doJoin() {
      try {
        setJoining(true)
        const res = await joinLiveSessionAction(initialSession.id)
        if (isMounted) {
          if (res?.error) {
            setJoinError(res.error)
          } else {
            setJoinError(null)
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Join error:', err)
          setJoinError(err?.message || 'Hindi makasali sa sesyon.')
        }
      } finally {
        if (isMounted) {
          setJoining(false)
        }
      }
    }

    doJoin()

    return () => {
      isMounted = false
    }
  }, [initialSession.id])

  // 2. Fetch & Subscribe to participant info (to detect kick and score)
  const refreshParticipant = useCallback(async () => {
    try {
      const { data: p, error } = await supabase
        .from('live_session_participants')
        .select('*')
        .eq('session_id', initialSession.id)
        .eq('student_id', currentUserId)
        .maybeSingle()

      if (p) {
        setMyParticipant(p as LiveSessionParticipant)
        if (p.removed_at) {
          setIsRemoved(true)
        }

        // If group mode, fetch group details
        if (p.group_id) {
          const { data: g } = await supabase
            .from('live_session_groups')
            .select(`
              *,
              leader:leader_id (
                id,
                full_name,
                avatar_url
              )
            `)
            .eq('id', p.group_id)
            .single()

          if (g) setMyGroup(g as LiveSessionGroup)

          // Fetch fellow group members
          const { data: members } = await supabase
            .from('live_session_participants')
            .select(`
              *,
              profiles (
                full_name,
                avatar_url
              )
            `)
            .eq('session_id', initialSession.id)
            .eq('group_id', p.group_id)
            .is('removed_at', null)

          if (members) setGroupMembers(members as LiveSessionParticipant[])
        }
      }
    } catch (err) {
      console.error('Error fetching participant state:', err)
    }
  }, [initialSession.id, currentUserId, supabase])

  useEffect(() => {
    refreshParticipant()

    const channel = supabase.channel(`student-p-${initialSession.id}-${currentUserId}`)
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_participants',
          filter: `session_id=eq.${initialSession.id}`
        },
        () => {
          refreshParticipant()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_groups',
          filter: `session_id=eq.${initialSession.id}`
        },
        () => {
          refreshParticipant()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialSession.id, currentUserId, supabase, refreshParticipant])

  // 3. Fetch existing submitted answer when current question changes
  useEffect(() => {
    if (!currentQuestion) {
      setMyAnswer(null)
      setSubmissionResult(null)
      return
    }

    const activeQuestionId = currentQuestion.id
    let isMounted = true
    async function checkExistingAnswer() {
      try {
        let query = supabase
          .from('live_session_answers')
          .select('*')
          .eq('session_id', initialSession.id)
          .eq('question_id', activeQuestionId)

        if (initialSession.mode === 'group' && myParticipant?.group_id) {
          query = query.eq('group_id', myParticipant.group_id)
        } else {
          query = query.eq('student_id', currentUserId)
        }

        const { data: existing } = await query.maybeSingle()

        if (isMounted && existing) {
          setMyAnswer(existing.answer)
          setSubmissionResult({
            isCorrect: existing.is_correct,
            points: existing.points_awarded
          })
        } else if (isMounted) {
          setMyAnswer(null)
          setSubmissionResult(null)
        }
      } catch (err) {
        console.error('Error checking existing answer:', err)
      }
    }

    checkExistingAnswer()

    return () => {
      isMounted = false
    }
  }, [currentQuestion, initialSession.id, initialSession.mode, myParticipant?.group_id, currentUserId, supabase])

  // 4. Handle Answer Submission
  const handleSubmitAnswer = async (answerText: string) => {
    if (!currentQuestion) return

    const res = await submitAnswerAction(initialSession.id, currentQuestion.id, answerText)
    setMyAnswer(answerText)
    setSubmissionResult({
      isCorrect: res.is_correct,
      points: res.points_awarded
    })
  }

  const currentStatus = session?.status || initialSession.status
  const isLobby = currentStatus === 'lobby'
  const isLive = currentStatus === 'question' || currentStatus === 'reveal'
  const isEnded = currentStatus === 'ended'

  const isQuestionRevealed = !!(
    currentQuestion?.revealed_at ||
    session?.results_revealed_at ||
    (session?.reveal_mode === 'auto_per_question' && (currentStatus === 'reveal' || !!myAnswer))
  )

  const showLiveLeaderboard = (isQuestionRevealed || (session?.reveal_mode === 'auto_per_question' && !!myAnswer)) && session?.reveal_mode !== 'end_of_session'

  // Trigger celebration only when answer is officially revealed and is correct
  useEffect(() => {
    if (isQuestionRevealed && submissionResult?.isCorrect) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      })
    }
  }, [isQuestionRevealed, submissionResult?.isCorrect])

  // Render Kicked / Removed Screen
  if (isRemoved) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-2xl text-center max-w-md mx-auto my-12 space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-black text-rose-900 mb-1">
            <Translate fil="Inalis sa Sesyon" en="Removed from Session" />
          </h2>
          <p className="text-slate-600 text-sm font-medium leading-relaxed">
            <Translate
              fil="Inalis ka ng guro mula sa Live Session na ito. Hindi ka na makakapagsumite o makakapanood."
              en="You have been removed from this live session by the educator. You can no longer submit or participate."
            />
          </p>
        </div>
        <Link
          href={`/student/classrooms/${classroomId}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-extrabold text-xs rounded-full shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <Translate fil="Bumalik sa Silid-aralan" en="Back to Classroom" />
        </Link>
      </div>
    )
  }

  // Render Join Error (e.g. Session Already Started, Capacity Full, Not Enrolled)
  if (joinError) {
    const errorLower = joinError.toLowerCase()
    const isPreparing = errorLower.includes('naghahanda') || errorLower.includes('setup') || errorLower.includes('preparing') || errorLower.includes('hindi pa bukas') || currentStatus === 'setup'
    const isEndedSession = errorLower.includes('tapos na') || errorLower.includes('ended') || currentStatus === 'ended'
    const isStarted = !isPreparing && !isEndedSession && (errorLower.includes('already started') || errorLower.includes('in progress') || errorLower.includes('nagsimula na'))
    const isCapacityFull = errorLower.includes('capacity') || errorLower.includes('puno na')
    const isNotEnrolled = errorLower.includes('enrolled') || errorLower.includes('classroom') || errorLower.includes('miyembro')
    const isRemovedUser = errorLower.includes('removed') || errorLower.includes('inalis')

    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center max-w-md mx-auto my-12 space-y-6 animate-fade-in">
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-md ${
          isPreparing ? 'bg-amber-100 text-amber-600' : isEndedSession ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-600'
        }`}>
          {isPreparing ? <Clock className="w-8 h-8 animate-pulse" /> : <AlertCircle className="w-8 h-8" />}
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-heading font-black text-slate-900 leading-tight">
            {isPreparing ? (
              <Translate fil="Naghahanda Pa ang Guro" en="Educator is Setting Up" />
            ) : isEndedSession ? (
              <Translate fil="Tapos na ang Sesyon" en="Live Session Ended" />
            ) : isStarted ? (
              <Translate fil="Nagsimula na ang Sesyon" en="Session Already In Progress" />
            ) : isCapacityFull ? (
              <Translate fil="Puno na ang Sesyon" en="Session is Full" />
            ) : isNotEnrolled ? (
              <Translate fil="Hindi Nakatala sa Silid-aralan" en="Not Enrolled in Classroom" />
            ) : isRemovedUser ? (
              <Translate fil="Inalis sa Sesyon" en="Removed from Session" />
            ) : (
              <Translate fil="Hindi Makasali sa Sesyon" en="Unable to Join Session" />
            )}
          </h2>
          <p className="text-slate-600 text-sm font-medium leading-relaxed">
            {isPreparing ? (
              <Translate
                fil="Kasalukuyan pang inihahanda at inaayos ng guro ang mga tanong at gameplay para sa Live Session na ito. Hindi pa bukas ang lobby para sa pagsali. Mangyaring maghintay sa silid-aralan hanggang sa buksan ang opisyal na Lobby."
                en="The educator is currently configuring the questions and gameplay for this live session. The lobby is not yet open. Please wait in your classroom until the official lobby opens."
              />
            ) : isEndedSession ? (
              <Translate
                fil="Tapos na ang Live Session na ito ng klase. Maghintay sa susunod na laro o suriin ang iyong mga natapos na pagsusulit."
                en="This live session has already ended. Please wait for the educator's next session or check your past activities."
              />
            ) : isStarted ? (
              <Translate
                fil="Kasalukuyan nang naglalaro ang klase sa Live Session na ito at sarado na ang pagsali para sa mga bagong manlalaro. Maghintay sa susunod na laro ng guro."
                en="This live session is already in progress and is no longer accepting new participants. Please wait for the educator's next session."
              />
            ) : isCapacityFull ? (
              <Translate
                fil="Naabot na ang pinakamataas na bilang ng mga mag-aaral para sa sesyong ito."
                en="The maximum participant capacity for this live session has been reached."
              />
            ) : isNotEnrolled ? (
              <Translate
                fil="Kailangan mong maging opisyal na miyembro ng silid-aralang ito upang makasali sa Live Session."
                en="You must be an enrolled student in this classroom to join this live session."
              />
            ) : isRemovedUser ? (
              <Translate
                fil="Inalis ka ng guro mula sa Live Session na ito."
                en="You have been removed from this live session by the educator."
              />
            ) : (
              joinError
            )}
          </p>
        </div>
        <Link
          href={`/student/classrooms/${classroomId}`}
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-brand-primary hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <Translate fil="Bumalik sa Silid-aralan" en="Back to Classroom" />
        </Link>
      </div>
    )
  }

  // Render Loading
  if (joining || sessionLoading) {
    return (
      <div className="py-24 text-center space-y-4 animate-fade-in">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin mx-auto" />
        <p className="text-slate-600 font-extrabold text-base">
          <Translate fil="Sumasali sa Live Session..." en="Joining Live Session..." />
        </p>
      </div>
    )
  }

  // Role permissions
  const isLeader = !isGroupMode || Boolean(myGroup && myGroup.leader_id === currentUserId)
  const canSubmit = !isGroupMode || (myGroup ? (!myGroup.leader_id || myGroup.leader_id === currentUserId) : true)

  const seedKey = isGroupMode && myParticipant?.group_id ? myParticipant.group_id : currentUserId

  const isScoresHidden = session?.reveal_mode === 'end_of_session' && !session?.results_revealed_at

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center font-bold shadow-xs">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-base md:text-lg font-heading font-black text-slate-900 leading-tight">
              {userName}
            </h1>
            <p className="text-xs font-bold text-slate-500">
              {classroomName} • {isGroupMode ? myGroup?.label || 'Walang Pangkat' : 'Indibidwal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGroupMode && isLeader && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
              Lider
            </span>
          )}

          {!isScoresHidden && myRankInfo && (
            <button
              type="button"
              onClick={() => setIsLeaderboardModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-heading font-black text-xs md:text-sm rounded-full flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Tingnan ang Talaan ng Marka"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-700" />
              <span>Ranggo #{myRankInfo.rank}</span>
            </button>
          )}

          {isScoresHidden ? (
            <span className="px-3.5 py-1.5 bg-slate-100 text-slate-600 font-heading font-black text-xs md:text-sm rounded-full flex items-center gap-1">
              🔒 <Translate fil="Puntos Nakatago" en="Scores Hidden" />
            </span>
          ) : (
            <span className="px-3.5 py-1.5 bg-brand-primary/10 text-brand-primary font-heading font-black text-sm rounded-full">
              ⭐ {myParticipant?.total_score || 0} pts
            </span>
          )}
        </div>
      </div>

      {/* Paused / Standby Banner for Student */}
      {session?.is_paused && (
        <div className="bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-3xl p-6 shadow-xl border-2 border-amber-300 flex flex-col sm:flex-row items-center gap-4 animate-slide-up">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
            <Pause className="w-6 h-6 text-white" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-white/25 rounded-full text-[10px] font-black uppercase tracking-wider">
                Naka-Pause
              </span>
              <span className="text-xs font-bold text-white/90">
                Standby Mode
              </span>
            </div>
            <h3 className="text-lg font-heading font-black">
              <Translate fil="Naka-Standby: Sandaling Naka-pause ang Sesyon" en="Standby: Live Session Paused" />
            </h3>
            <p className="text-xs text-white/90 font-medium mt-0.5">
              <Translate
                fil="Kasalukuyang naka-pause ang pagsusulit habang nagre-reconnect o nag-aayos ang guro. Manatili sa pahinang ito, kusang magpapatuloy ang pagsusulit kapag nag-resume ang guro."
                en="The live quiz is temporarily paused while the educator reconnects or sets up. Please stay on this page; it will resume automatically."
              />
            </p>
          </div>
        </div>
      )}

      {/* ================= LOBBY PHASE ================= */}
      {isLobby && (
        <div className="space-y-6 animate-fade-in">
          {/* Waiting for host banner */}
          <div className="bg-linear-to-br from-brand-primary to-brand-secondary text-white rounded-3xl p-8 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Clock className="w-7 h-7 text-white" />
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-black">
                <Translate fil="Nasa Lobby Ka Na!" en="You're in the Lobby!" />
              </h2>
              <p className="text-white/80 text-sm font-medium mt-1 max-w-md mx-auto">
                <Translate
                  fil="Naghihintay sa guro na simulan ang live na sesyon. Ihanda ang iyong sarili!"
                  en="Waiting for the educator to start the live session. Get ready!"
                />
              </p>
            </div>
          </div>

          {/* If group mode: Show Group Roster & Voting Panel */}
          {isGroupMode && myGroup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GroupRoster
                group={myGroup}
                members={groupMembers}
                currentUserId={currentUserId}
              />

              <LeaderVotePanel
                sessionId={initialSession.id}
                group={myGroup}
                members={groupMembers}
                currentUserId={currentUserId}
                isHost={false}
              />
            </div>
          )}
        </div>
      )}

      {/* ================= LIVE QUESTION PHASE ================= */}
      {isLive && currentQuestion && (
        <div className="space-y-6 animate-fade-in">
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            pacing={session?.pacing || 'manual'}
            startedAt={session?.question_started_at}
            serverOffset={serverOffset}
            randomizeChoices={session?.randomize_choices}
            seedKey={seedKey}
            isRevealed={isQuestionRevealed}
            canSubmit={canSubmit}
            isGroupMode={isGroupMode}
            leaderName={myGroup?.leader?.full_name || undefined}
            myAnswer={myAnswer}
            submittedResult={submissionResult}
            readOnly={false}
            isPaused={session?.is_paused}
            onSubmit={handleSubmitAnswer}
          />

          {/* First correct answer highlight badge */}
          {isQuestionRevealed && (
            <div className="text-center animate-slide-up">
              <FirstCorrectBadge
                sessionId={initialSession.id}
                questionId={currentQuestion.id}
              />
            </div>
          )}

          {/* Automatic Live Leaderboard Display for Competitive Edge */}
          {showLiveLeaderboard && (
            <div className="space-y-4 animate-slide-up pt-2">
              <div className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                    <Trophy className="w-6 h-6 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-lg md:text-xl text-white leading-tight flex items-center gap-2">
                      <span><Translate fil="Talaan ng Marka (Kasalukuyang Labanan)" en="Live Leaderboard Standings" /></span>
                      <span className="px-2.5 py-0.5 bg-white/25 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                        Live
                      </span>
                    </h3>
                    <p className="text-xs text-white/90 font-medium mt-0.5">
                      <Translate
                        fil="Awtomatikong na-update ang mga puntos at ranggo pagkatapos masagot ang aytem!"
                        en="Points and rankings update live after answering each question!"
                      />
                    </p>
                  </div>
                </div>

                {myRankInfo && (
                  <div className="bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 self-start sm:self-center border border-white/20">
                    <span className="text-xs font-bold text-white/85">
                      <Translate fil="Iyong Ranggo:" en="Your Rank:" />
                    </span>
                    <span className="text-xl font-black text-yellow-300">
                      #{myRankInfo.rank}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-left max-w-2xl mx-auto">
                <LiveLeaderboard
                  sessionId={initialSession.id}
                  mode={session?.mode}
                  revealMode={session?.reveal_mode}
                  resultsRevealedAt={session?.results_revealed_at}
                  isHost={false}
                  currentUserId={currentUserId}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= ENDED PHASE ================= */}
      {isEnded && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-black text-slate-900 mb-1">
              <Translate fil="Tapos na ang Pagsusulit!" en="Session Completed!" />
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {session?.reveal_mode === 'end_of_session' && !session.results_revealed_at ? (
                <Translate
                  fil="Naghihintay sa guro na ilahad ang pinal na resulta at talaan ng marka..."
                  en="Waiting for educator to reveal the final results and leaderboard..."
                />
              ) : (
                <Translate
                  fil="Narito ang pinal na resulta at talaan ng marka para sa lahat:"
                  en="Here are the final results and leaderboard standings:"
                />
              )}
            </p>
          </div>

          <div className="text-left max-w-xl mx-auto">
            <LiveLeaderboard
              sessionId={initialSession.id}
              mode={session?.mode}
              revealMode={session?.reveal_mode}
              resultsRevealedAt={session?.results_revealed_at}
              isHost={false}
              currentUserId={currentUserId}
            />
          </div>

          <div className="pt-4">
            <Link
              href={`/student/classrooms/${classroomId}/live/${initialSession.id}/results`}
              className="px-8 py-3.5 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold text-sm rounded-full shadow-lg transition-all inline-flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <Translate fil="Tingnan ang Detalyadong Resulta" en="View Detailed Results" />
            </Link>
          </div>
        </div>
      )}

      {/* Modal for viewing leaderboard on demand */}
      {isLeaderboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-900 text-lg leading-tight">
                    <Translate fil="Kasalukuyang Talaan ng Marka" en="Current Leaderboard" />
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    <Translate fil="Live Standings" en="Live Standings" />
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaderboardModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <LiveLeaderboard
              sessionId={initialSession.id}
              mode={session?.mode}
              revealMode={session?.reveal_mode}
              resultsRevealedAt={session?.results_revealed_at}
              isHost={false}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      )}
    </div>
  )
}
