'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Translate } from '@/components/Translate'
import { syncUserNotifications } from '@/app/notifications/actions'

interface SidebarNotificationProps {
  isCollapsed?: boolean
}

export function SidebarNotification({ isCollapsed = false }: SidebarNotificationProps) {
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const supabase = createClient()
  const pathname = usePathname()

  const targetHref = pathname?.startsWith('/educator')
    ? '/educator/notifications'
    : '/student/notifications'

  const isActive = pathname?.startsWith(targetHref)

  useEffect(() => {
    let isMounted = true
    let currentUserId: string | null = null

    const fetchUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return
      currentUserId = user.id

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (isMounted && count !== null) {
        setUnreadCount(count)
      }
    }

    const init = async () => {
      await fetchUnreadCount()
      try {
        const res = await syncUserNotifications()
        if (res?.synced && res.synced > 0 && isMounted) {
          await fetchUnreadCount()
        }
      } catch {
        // Ignore background sync errors
      }
    }

    init()

    const channel = supabase
      .channel('sidebar-notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          const rec = (payload.new || payload.old) as { user_id?: string } | undefined
          if (!currentUserId || !rec?.user_id || rec.user_id === currentUserId) {
            fetchUnreadCount()
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [supabase, pathname])

  return (
    <Link
      href={targetHref}
      className={`relative flex items-center gap-3 py-3 rounded-2xl transition-all duration-200 group font-extrabold mx-3 ${
        isActive
          ? 'bg-white text-brand-primary shadow-lg shadow-black/10 ring-2 ring-white/30 translate-x-1'
          : 'hover:bg-white/10 text-white/70 hover:text-white'
      } ${isCollapsed ? 'px-0 justify-center mx-2' : 'px-4'}`}
      title={isCollapsed ? `Mga Abiso (${unreadCount} bago)` : undefined}
    >
      {isActive && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-brand-secondary rounded-full" />
      )}

      <div className="relative shrink-0">
        <Bell
          className={`w-5 h-5 transition-all duration-200 ${
            isActive ? 'text-brand-primary scale-110' : 'group-hover:scale-105'
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-amber-400 text-brand-primary text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap">
          <span className="font-black text-sm">
            <Translate fil="Mga Abiso" en="Notifications" />
          </span>
          {unreadCount > 0 && (
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isActive
                  ? 'bg-brand-primary text-white'
                  : 'bg-amber-400 text-brand-primary'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
