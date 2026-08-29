'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Translate } from '@/components/Translate'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
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
    const channel = supabase.channel('schema-db-changes')
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
    <div className="relative isolate px-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-12 left-4 md:left-auto md:right-4 w-[320px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-[100] animate-slide-up">
           <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
             <h3 className="font-bold text-slate-900 text-sm"><Translate fil="Mga Abiso" en="Notifications" /></h3>
             {unreadCount > 0 && (
               <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full"><Translate fil={`${unreadCount} bago`} en={`${unreadCount} new`} /></span>
             )}
           </div>
           
           <div className="max-h-[400px] overflow-y-auto w-full custom-scrollbar">
             {notifications.length === 0 ? (
               <div className="p-6 text-center text-slate-500 text-sm font-medium">
                 <Translate fil="Wala kang bagong abiso!" en="You're all caught up!" />
               </div>
             ) : (
               notifications.map(n => (
                 <button 
                   key={n.id}
                   onClick={() => markAsRead(n.id, n.link)}
                   className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-3 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                 >
                   <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-brand-primary' : 'bg-transparent'}`} />
                   <div>
                     <h4 className={`text-sm ${!n.is_read ? 'text-slate-900 font-bold' : 'text-slate-600 font-medium'}`}>{n.title}</h4>
                     <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.body}</p>
                     <span className="text-[10px] text-slate-400 mt-2 block font-medium">{new Date(n.created_at).toLocaleDateString()}</span>
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
