'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ActiveSessionItem {
  id: string
  status: string
  mode: string
  classroom_id: string
  classrooms?: {
    id: string
    name: string
    enrollment_code?: string
  }
  live_session_participants?: Array<{
    student_id: string
    removed_at?: string | null
  }>
}

interface StudentActiveSessionListProps {
  initialSessions: ActiveSessionItem[]
  currentUserId: string
}

export function StudentActiveSessionList({
  initialSessions,
  currentUserId
}: StudentActiveSessionListProps) {
  const [sessions, setSessions] = useState<ActiveSessionItem[]>(initialSessions || [])
  const supabase = createClient()

  useEffect(() => {
    setSessions(initialSessions || [])
  }, [initialSessions])

  // Realtime subscription to remove sessions when they end
  useEffect(() => {
    const channel = supabase
      .channel('student-dashboard-live-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { id: string; status: string }
            if (updated.status === 'ended') {
              setSessions((prev) => prev.filter((s) => s.id !== updated.id))
            } else {
              setSessions((prev) =>
                prev.map((s) => (s.id === updated.id ? { ...s, status: updated.status } : s))
              )
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as { id: string }
            setSessions((prev) => prev.filter((s) => s.id !== oldRecord.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const activeSessions = sessions.filter((s) => s.status !== 'ended')
  if (activeSessions.length === 0) return null

  return (
    <div className="space-y-3">
      {activeSessions.map((session) => {
        const isParticipant = (session.live_session_participants || []).some(
          (p) => p.student_id === currentUserId && !p.removed_at
        )
        const isLobby = session.status === 'lobby'

        // If question is in progress and student was not already in lobby, skip
        if (!isLobby && !isParticipant) {
          return null
        }

        return (
          <div
            key={session.id}
            className={`rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in border-2 relative overflow-hidden ${
              isLobby 
                ? 'bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 border-emerald-300' 
                : 'bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 border-amber-300'
            }`}
          >
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/40 shadow-inner">
                <span className="w-4 h-4 rounded-full bg-white animate-ping" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-slate-900 shadow-xs">
                    {isLobby ? '🎉 LOBBY BUKAS' : '🔴 LIVE LARO / SESYON'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/20 text-white border border-white/20">
                    {session.mode === 'group' ? 'Pangkatang Laban' : 'Indibidwal'}
                  </span>
                  {session.classrooms?.enrollment_code && (
                    <span className="text-xs font-mono font-black bg-white/20 px-2 py-0.5 rounded-md">
                      PIN: {session.classrooms.enrollment_code}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-heading font-black">
                  {session.classrooms?.name} • {isLobby ? 'May Bukas na Live Session!' : 'Kasalukuyang Naglalaro ang Iyong Klase!'}
                </h2>
                <p className="text-white/90 text-xs font-semibold mt-0.5">
                  {isLobby
                    ? 'Sumali na sa lobby upang maghintay sa pagsisimula ng guro.'
                    : 'Bumalik sa live session upang ipagpatuloy ang iyong pagsagot.'}
                </p>
              </div>
            </div>

            <Link
              href={`/student/classrooms/${session.classroom_id}/live/${session.id}`}
              className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-black text-xs sm:text-sm rounded-full shadow-lg transition-all flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 cursor-pointer active:scale-95"
            >
              <span>{isLobby ? 'Sumali sa Lobby Na ➔' : 'Bumalik sa Live Session ➔'}</span>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
