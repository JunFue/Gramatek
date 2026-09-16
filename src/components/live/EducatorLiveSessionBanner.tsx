'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ActiveSessionData {
  id: string
  status: string
  mode: string
  classroom_id: string
  classrooms?: {
    id: string
    name: string
    enrollment_code?: string
  }
}

interface EducatorLiveSessionBannerProps {
  initialSession: ActiveSessionData | null
}

export function EducatorLiveSessionBanner({ initialSession }: EducatorLiveSessionBannerProps) {
  const [session, setSession] = useState<ActiveSessionData | null>(initialSession)
  const pathname = usePathname()
  const supabase = createClient()

  // Sync initialSession prop
  useEffect(() => {
    if (!initialSession || initialSession.status === 'ended') {
      setSession(null)
    } else {
      setSession(initialSession)
    }
  }, [initialSession])

  // Realtime subscription to dismiss banner immediately when session ends
  useEffect(() => {
    if (!session?.id) return

    const channel = supabase
      .channel(`educator-banner-session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { status?: string }
            if (updated.status === 'ended') {
              setSession(null)
            } else if (updated.status) {
              setSession((prev) => prev ? { ...prev, status: updated.status! } : null)
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
  }, [session?.id, supabase])

  // Don't render banner if no active session or if already inside live view routes
  if (!session || session.status === 'ended') return null
  if (pathname.includes('/live/')) return null

  const isLobby = session.status === 'lobby' || session.status === 'setup'

  return (
    <div className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-4 sm:px-6 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5 z-30 shrink-0 border-b border-white/20 mt-16 md:mt-0 animate-fade-in">
      <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
        <span className="truncate">
          LIVE SESSION BUKAS: {session.classrooms?.name}
        </span>
        {session.classrooms?.enrollment_code && (
          <span className="bg-black/20 px-2 py-0.5 rounded font-mono text-xs shrink-0">
            PIN: {session.classrooms.enrollment_code}
          </span>
        )}
        <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-white text-slate-900 shrink-0">
          {isLobby ? 'LOBBY' : 'LIVE QUESTION'}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`/educator/classrooms/${session.classroom_id}/live/${session.id}/display`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          Display Screen ↗
        </a>
        <Link
          href={`/educator/classrooms/${session.classroom_id}/live/${session.id}/host`}
          className="px-4 py-1.5 bg-white hover:bg-amber-50 text-slate-950 rounded-lg text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          Bumalik sa Host Panel ➔
        </Link>
      </div>
    </div>
  )
}
