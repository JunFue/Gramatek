'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Translate } from '@/components/Translate'

interface SidebarNotificationProps {
  isCollapsed?: boolean
}

export function SidebarNotification({ isCollapsed = false }: SidebarNotificationProps) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) setNotifications(data)
    }

    fetchNotifications()

    // Realtime subscription
    const channel = supabase.channel('sidebar-notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAsRead = async (id: string, link?: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (link) {
      setIsOpen(false)
      router.push(link)
    }
  }

  return (
    <div className="relative mx-4" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all group font-extrabold ${
          isOpen ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'
        } ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}
        title={isCollapsed ? `Mga Abiso (${unreadCount} bago)` : undefined}
      >
        <div className="relative shrink-0">
          <Bell className="w-6 h-6 transition-transform group-hover:scale-110" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-brand-primary text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        
        {!isCollapsed && (
          <div className="flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap">
            <span><Translate fil="Mga Abiso" en="Notifications" /></span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-brand-primary">
                {unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Flyout Dropdown Modal */}
      {isOpen && (
        <div className={`fixed md:absolute z-[120] w-[320px] max-w-[calc(100vw-32px)] left-4 right-4 md:right-auto top-20 md:top-0 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-slide-up ${
          isCollapsed 
            ? 'md:left-24' 
            : 'md:left-64'
        }`}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-heading font-black text-slate-900 text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-primary" />
              <Translate fil="Mga Abiso" en="Notifications" />
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                <Translate fil={`${unreadCount} bago`} en={`${unreadCount} new`} />
              </span>
            )}
          </div>
          
          <div className="max-h-[350px] overflow-y-auto w-full custom-scrollbar divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm font-medium">
                <p>🎉 <Translate fil="Wala kang bagong abiso!" en="You're all caught up!" /></p>
              </div>
            ) : (
              notifications.map(n => (
                <button 
                  key={n.id}
                  onClick={() => markAsRead(n.id, n.link)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex gap-3 ${
                    !n.is_read ? 'bg-brand-light/20' : 'bg-white'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    !n.is_read ? 'bg-brand-primary' : 'bg-slate-200'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold truncate ${
                      !n.is_read ? 'text-slate-900 font-extrabold' : 'text-slate-600'
                    }`}>
                      {n.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed font-medium">
                      {n.body}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1.5 block font-bold">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
