'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ActiveSessionData {
  id: string
  status: string
  mode: string
}

interface StudentLiveBannerProps {
  classroomId: string
  enrollmentCode?: string
  initialSession: ActiveSessionData | null
  isParticipant: boolean
}

export function StudentLiveBanner({
  classroomId,
  enrollmentCode,
  initialSession,
  isParticipant
}: StudentLiveBannerProps) {
  const [session, setSession] = useState<ActiveSessionData | null>(initialSession)
  const supabase = createClient()

  useEffect(() => {
    if (!initialSession || initialSession.status === 'ended') {
      setSession(null)
    } else {
      setSession(initialSession)
    }
  }, [initialSession])

  // Realtime subscription on live_sessions
  useEffect(() => {
    if (!classroomId) return

    const channel = supabase
      .channel(`student-classroom-live-${classroomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `classroom_id=eq.${classroomId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { id: string; status: string; mode: string }
            if (updated.status === 'ended') {
              setSession(null)
            } else if (['lobby', 'question', 'reveal'].includes(updated.status)) {
              setSession({
                id: updated.id,
                status: updated.status,
                mode: updated.mode
              })
            }
          } else if (payload.eventType === 'DELETE') {
            setSession(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classroomId, supabase])

  if (!session || session.status === 'ended') return null

  const isLobby = session.status === 'lobby'

  // If question is in progress and student was not already in lobby, hide
  if (!isLobby && !isParticipant) return null

  if (isLobby) {
    return (
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-black shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in border-2 border-emerald-300 relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/40 shadow-inner">
            <span className="w-4 h-4 rounded-full bg-white animate-ping" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-emerald-800 shadow-xs">
                🎉 LOBBY BUKAS
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/20 text-white border border-white/20">
                {session.mode === 'group' ? 'Pangkatang Laban' : 'Indibidwal'}
              </span>
              {enrollmentCode && (
                <span className="text-xs font-mono font-black bg-white/20 px-2 py-0.5 rounded-md">
                  PIN: {enrollmentCode}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-heading font-black">Bukas ang Lobby para sa Live Session!</h3>
            <p className="text-white/90 text-xs font-semibold mt-0.5">Sumali na sa lobby upang maghintay sa pagsisimula ng guro.</p>
          </div>
        </div>

        <Link
          href={`/student/classrooms/${classroomId}/live/${session.id}`}
          className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-black text-xs sm:text-sm rounded-full shadow-lg transition-all flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 cursor-pointer active:scale-95"
        >
          <span>Sumali sa Lobby Na ➔</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in border-2 border-amber-300 relative overflow-hidden">
      <div className="flex items-center gap-3.5 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/40 shadow-inner">
          <span className="w-4 h-4 rounded-full bg-white animate-ping" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-slate-900 shadow-xs">
              🔴 LIVE LARO / NAKATIGIL
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/20 text-white border border-white/20">
              {session.mode === 'group' ? 'Pangkatang Laban' : 'Indibidwal'}
            </span>
            {enrollmentCode && (
              <span className="text-xs font-mono font-black bg-white/20 px-2 py-0.5 rounded-md">
                PIN: {enrollmentCode}
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-heading font-black">Kasalukuyang Naglalaro ang Iyong Klase!</h3>
          <p className="text-white/90 text-xs font-semibold mt-0.5">Bumalik sa laro upang ipagpatuloy ang iyong pagsagot.</p>
        </div>
      </div>

      <Link
        href={`/student/classrooms/${classroomId}/live/${session.id}`}
        className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-black text-xs sm:text-sm rounded-full shadow-lg transition-all flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 cursor-pointer active:scale-95"
      >
        <span>Bumalik sa Laro ➔</span>
      </Link>
    </div>
  )
}
