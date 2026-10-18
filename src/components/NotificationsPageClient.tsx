'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Translate } from '@/components/Translate'
import {
  Bell, CheckCheck, Trash2, Megaphone, Clock, FileCheck2,
  Activity, Plus, Send, CalendarClock, AlertTriangle, CheckCircle2,
  Star, Users, Zap, BookOpen, Filter, ExternalLink, X, Loader2,
  ChevronRight, Sparkles, Play
} from 'lucide-react'
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearReadNotifications,
  sendClassroomAnnouncement,
  deleteClassroomAnnouncement,
  AnnouncementPriority
} from '@/app/notifications/actions'

export interface NotificationRecord {
  id: string
  user_id: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export interface DeadlineTaskItem {
  quizId: string
  quizTitle: string
  classroomId: string
  classroomName: string
  gameMode: string
  scheduledStart?: string | null
  scheduledEnd: string
  status: 'upcoming' | 'due_soon' | 'past_due'
  submittedCount?: number
  totalStudents?: number
  hasSubmitted?: boolean
  bestScore?: number
  maxScore?: number
}

export interface ActivityLogItem {
  id: string
  type:
    | 'submission'
    | 'announcement'
    | 'deadline'
    | 'enrollment'
    | 'live_session'
    | 'quiz_created'
    | 'recognition'
    | 'warning'
  title: string
  description: string
  classroomId?: string
  classroomName?: string
  actorName?: string
  actorAvatar?: string | null
  badgeText?: string
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'blue' | 'violet' | 'slate'
  link?: string
  timestamp: string
}

export interface AnnouncementItem {
  id: string
  classroomId: string
  classroomName: string
  educatorName?: string
  title: string
  content: string
  priority: AnnouncementPriority
  created_at: string
  rawNotifTitle?: string
}

interface NotificationsPageClientProps {
  role: 'educator' | 'learner'
  userId: string
  initialNotifications: NotificationRecord[]
  classrooms: Array<{ id: string; name: string; memberCount?: number }>
  deadlines: DeadlineTaskItem[]
  announcements: AnnouncementItem[]
  activityLogs: ActivityLogItem[]
}

type ActiveTab = 'all' | 'announcements' | 'submissions' | 'deadlines' | 'activity'

export function NotificationsPageClient({
  role,
  userId,
  initialNotifications,
  classrooms,
  deadlines,
  announcements: initialAnnouncements,
  activityLogs
}: NotificationsPageClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  const [notifications, setNotifications] = useState<NotificationRecord[]>(initialNotifications)
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements)
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all')
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState<boolean>(false)

  // Announcement Composer Modal State (for Educators)
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false)
  const [composeClassroomId, setComposeClassroomId] = useState<string>(
    classrooms[0]?.id || 'all'
  )
  const [composeTitle, setComposeTitle] = useState<string>('')
  const [composeContent, setComposeContent] = useState<string>('')
  const [composePriority, setComposePriority] = useState<AnnouncementPriority>('normal')

  // Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  useEffect(() => {
    setAnnouncements(initialAnnouncements)
  }, [initialAnnouncements])

  // Realtime subscription for live notifications
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as NotificationRecord
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev
              return [newNotif, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as NotificationRecord
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            )
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  )

  const submissionLogs = useMemo(
    () =>
      activityLogs.filter(
        (log) =>
          log.type === 'submission' &&
          (selectedClassroomId === 'all' || log.classroomId === selectedClassroomId)
      ),
    [activityLogs, selectedClassroomId]
  )

  const filteredDeadlines = useMemo(
    () =>
      deadlines.filter(
        (d) => selectedClassroomId === 'all' || d.classroomId === selectedClassroomId
      ),
    [deadlines, selectedClassroomId]
  )

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter(
        (a) => selectedClassroomId === 'all' || a.classroomId === selectedClassroomId
      ),
    [announcements, selectedClassroomId]
  )

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (showUnreadOnly && n.is_read) return false
      if (selectedClassroomId !== 'all') {
        const room = classrooms.find((c) => c.id === selectedClassroomId)
        const matchesLink = n.link?.includes(selectedClassroomId)
        const matchesRoomName = room && (n.title?.includes(room.name) || n.body?.includes(room.name))
        if (!matchesLink && !matchesRoomName) return false
      }
      return true
    })
  }, [notifications, showUnreadOnly, selectedClassroomId, classrooms])

  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (selectedClassroomId !== 'all' && log.classroomId && log.classroomId !== selectedClassroomId) {
        return false
      }
      if (activityTypeFilter !== 'all' && log.type !== activityTypeFilter) {
        return false
      }
      return true
    })
  }, [activityLogs, selectedClassroomId, activityTypeFilter])

  // Handlers
  const handleMarkAsRead = async (notif: NotificationRecord) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      )
      await markNotificationAsRead(notif.id)
    }
    if (notif.link) {
      router.push(notif.link)
    }
  }

  const handleMarkAllRead = () => {
    startTransition(async () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      const res = await markAllNotificationsAsRead()
      if (res.error) {
        showToast('error', res.error)
      } else {
        showToast('success', 'Namarkahan na bilang nabasa ang lahat ng abiso!')
        router.refresh()
      }
    })
  }

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await deleteNotification(id)
  }

  const handleClearRead = () => {
    startTransition(async () => {
      setNotifications((prev) => prev.filter((n) => !n.is_read))
      const res = await clearReadNotifications()
      if (res.error) {
        showToast('error', res.error)
      } else {
        showToast('success', 'Nalinis na ang mga nabasang abiso.')
        router.refresh()
      }
    })
  }

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault()
    if (!composeTitle.trim() || !composeContent.trim()) return

    startTransition(async () => {
      const res = await sendClassroomAnnouncement(
        composeClassroomId,
        composeTitle,
        composeContent,
        composePriority
      )
      if (res.error) {
        showToast('error', res.error)
      } else {
        showToast(
          'success',
          `Matagumpay na naipadala ang anunsyo sa ${res.notifiedCount || 0} mag-aaral! 📢`
        )
        setComposeTitle('')
        setComposeContent('')
        setComposePriority('normal')
        setIsComposeOpen(false)
        router.refresh()
      }
    })
  }

  const handleDeleteAnnouncement = (item: AnnouncementItem) => {
    startTransition(async () => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== item.id))
      const res = await deleteClassroomAnnouncement(
        item.classroomId,
        item.id,
        item.rawNotifTitle
      )
      if (res.error) {
        showToast('error', res.error)
      } else {
        showToast('success', 'Nabura na ang anunsyo.')
        router.refresh()
      }
    })
  }

  const openReminderModalForDeadline = (d: DeadlineTaskItem) => {
    setComposeClassroomId(d.classroomId)
    setComposePriority('important')
    setComposeTitle(`Paalala sa Deadline: ${d.quizTitle}`)
    const formattedDate = new Date(d.scheduledEnd).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
    setComposeContent(
      `Mga mag-aaral, paalala na ang deadline para sa pagsusulit na "${d.quizTitle}" ay sa ${formattedDate}. Mangyaring tapusin at ipasa ang inyong gawain bago magsara ang oras!`
    )
    setIsComposeOpen(true)
  }

  const getBadgeStyle = (color?: ActivityLogItem['badgeColor']) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'rose':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'violet':
        return 'bg-violet-100 text-violet-800 border-violet-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getActivityIcon = (type: ActivityLogItem['type']) => {
    switch (type) {
      case 'submission':
        return <FileCheck2 className="w-5 h-5 text-emerald-600" />
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-amber-600" />
      case 'deadline':
        return <CalendarClock className="w-5 h-5 text-rose-600" />
      case 'enrollment':
        return <Users className="w-5 h-5 text-blue-600" />
      case 'live_session':
        return <Zap className="w-5 h-5 text-orange-500" />
      case 'quiz_created':
        return <BookOpen className="w-5 h-5 text-brand-primary" />
      case 'recognition':
        return <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default:
        return <Activity className="w-5 h-5 text-slate-600" />
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative z-10 space-y-6 sm:space-y-8">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[150] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-xs sm:text-sm text-white animate-slide-up ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="opacity-70 hover:opacity-100 ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light/40 border border-brand-primary/20 text-brand-primary text-xs font-black uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5" />
              {role === 'educator' ? (
                <Translate fil="Sentro ng Abiso ng Guro" en="Educator Notification Center" />
              ) : (
                <Translate fil="Sentro ng Abiso ng Mag-aaral" en="Learner Notification Center" />
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
              <Translate
                fil="Mga Abiso, Anunsyo at Activity Logs"
                en="Notifications, Announcements & Activity Logs"
              />
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm font-medium max-w-2xl">
              {role === 'educator' ? (
                <Translate
                  fil="Subaybayan ang mga pagsusumite ng gawain ng mga mag-aaral, mga malapit o sumapit na deadline, magpadala ng anunsyo sa silid-aralan, at suriin ang buong activity logs."
                  en="Track student asynchronous task submissions, upcoming or due deadlines, broadcast classroom announcements, and review complete activity logs."
                />
              ) : (
                <Translate
                  fil="Tingnan ang mga anunsyo mula sa iyong guro, subaybayan ang mga deadline ng pagsusulit, at balikan ang talaan ng iyong mga aktibidad."
                  en="View announcements from your educators, keep track of upcoming quiz deadlines, and review your complete activity history."
                />
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {role === 'educator' && classrooms.length > 0 && (
              <button
                type="button"
                onClick={() => setIsComposeOpen(true)}
                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Megaphone className="w-4 h-4" />
                <Translate fil="Magpadala ng Anunsyo" en="Send Announcement" />
              </button>
            )}

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-brand-primary" />
                <Translate fil="Markahan Lahat na Nabasa" en="Mark All Read" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`card p-4 sm:p-5 text-left transition-all cursor-pointer ${
            activeTab === 'all' ? 'ring-2 ring-brand-primary border-brand-primary' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-brand-primary text-[10px] font-black">
                {unreadCount} Bago
              </span>
            )}
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
            {notifications.length}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            <Translate fil="Kabuuang Abiso" en="Total Notifications" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`card p-4 sm:p-5 text-left transition-all cursor-pointer ${
            activeTab === 'announcements' ? 'ring-2 ring-brand-primary border-brand-primary' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-brand-light/50 text-brand-primary flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
            {announcements.length}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            <Translate fil="Mga Anunsyo sa Silid" en="Classroom Announcements" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deadlines')}
          className={`card p-4 sm:p-5 text-left transition-all cursor-pointer ${
            activeTab === 'deadlines' ? 'ring-2 ring-brand-primary border-brand-primary' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
            {deadlines.some((d) => d.status === 'due_soon' || d.status === 'past_due') && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">
                Aktibo
              </span>
            )}
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
            {deadlines.length}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            <Translate fil="Mga Deadline ng Gawain" en="Task Deadlines" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(role === 'educator' ? 'submissions' : 'activity')}
          className={`card p-4 sm:p-5 text-left transition-all cursor-pointer ${
            activeTab === 'submissions' || (role === 'learner' && activeTab === 'activity')
              ? 'ring-2 ring-brand-primary border-brand-primary'
              : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
            {submissionLogs.length}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            {role === 'educator' ? (
              <Translate fil="Pagsusumite ng Mag-aaral" en="Student Submissions" />
            ) : (
              <Translate fil="Mga Naipasang Gawain" en="Submitted Tasks" />
            )}
          </p>
        </button>
      </div>

      {/* Navigation Tabs & Classroom Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-brand-primary text-white shadow-sm font-black'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <Translate fil="Mga Abiso" en="Notifications" />
            {unreadCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'all' ? 'bg-amber-400 text-brand-primary' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'announcements'
                ? 'bg-brand-primary text-white shadow-sm font-black'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <Translate fil="Mga Anunsyo" en="Announcements" />
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'announcements' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {filteredAnnouncements.length}
            </span>
          </button>

          {role === 'educator' && (
            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-brand-primary text-white shadow-sm font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <Translate fil="Mga Pagsusumite" en="Submissions" />
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'submissions' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {submissionLogs.length}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('deadlines')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'deadlines'
                ? 'bg-brand-primary text-white shadow-sm font-black'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <Translate fil="Mga Deadline" en="Deadlines" />
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'deadlines' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {filteredDeadlines.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-brand-primary text-white shadow-sm font-black'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <Translate fil="Activity Logs" en="Activity Logs" />
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'activity' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {filteredActivityLogs.length}
            </span>
          </button>
        </div>

        {/* Classroom Filter Dropdown */}
        {classrooms.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-primary"
            >
              <option value="all">Lahat ng Silid-aralan (All Classrooms)</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ================= TAB 1: ALL NOTIFICATIONS ================= */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Sub-controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUnreadOnly(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !showUnreadOnly
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Translate fil="Lahat" en="All" /> ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setShowUnreadOnly(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  showUnreadOnly
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Translate fil="Hindi Pa Nababasa" en="Unread Only" /> ({unreadCount})
              </button>
            </div>

            {notifications.some((n) => n.is_read) && (
              <button
                type="button"
                onClick={handleClearRead}
                disabled={isPending}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <Translate fil="Linisin ang mga Nabasa" en="Clear Read" />
              </button>
            )}
          </div>

          {/* Urgent / Due Soon Deadlines Quick Banner */}
          {filteredDeadlines.filter((d) => d.status === 'due_soon' || d.status === 'past_due')
            .length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-black text-amber-950">
                    <Translate
                      fil="May mga Gawain na Malapit o Sumapit na ang Deadline!"
                      en="Tasks Have Upcoming or Due Deadlines!"
                    />
                  </h3>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">
                    {role === 'educator' ? (
                      <Translate
                        fil="Suriin ang bilang ng mga nakapagsumiteng mag-aaral o magpadala ng paalala sa klase."
                        en="Check how many students have submitted or send a class reminder."
                      />
                    ) : (
                      <Translate
                        fil="Siguraduhing naipasa mo na ang iyong mga pagsusulit bago magsara ang takdang oras."
                        en="Make sure you have submitted your quizzes before the deadline closes."
                      />
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('deadlines')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl shrink-0 self-start sm:self-center cursor-pointer"
              >
                <Translate fil="Tingnan ang mga Deadline ➔" en="View Deadlines ➔" />
              </button>
            </div>
          )}

          {/* Notifications List */}
          {filteredNotifications.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {filteredNotifications.map((n) => {
                const isAnnouncement = n.title?.includes('📢') || n.title?.includes('Anunsyo')
                const isSubmission = n.title?.includes('📝') || n.title?.includes('✅')
                const isDeadline = n.title?.includes('⏰') || n.title?.includes('⏳') || n.title?.includes('📅')
                const isStar = n.title?.includes('🌟')
                const isWarning = n.title?.includes('⚠️')

                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n)}
                    className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors cursor-pointer hover:bg-slate-50 ${
                      !n.is_read ? 'bg-brand-light/15' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isAnnouncement
                          ? 'bg-amber-100 text-amber-700'
                          : isSubmission
                          ? 'bg-emerald-100 text-emerald-700'
                          : isDeadline
                          ? 'bg-rose-100 text-rose-600'
                          : isStar
                          ? 'bg-yellow-100 text-yellow-600'
                          : isWarning
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-brand-primary/10 text-brand-primary'
                      }`}
                    >
                      {isAnnouncement ? (
                        <Megaphone className="w-5 h-5" />
                      ) : isSubmission ? (
                        <FileCheck2 className="w-5 h-5" />
                      ) : isDeadline ? (
                        <CalendarClock className="w-5 h-5" />
                      ) : isStar ? (
                        <Star className="w-5 h-5 fill-amber-400" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={`text-sm sm:text-base leading-snug ${
                            !n.is_read
                              ? 'font-black text-slate-900'
                              : 'font-bold text-slate-700'
                          }`}
                        >
                          {n.title}
                        </h4>
                        <div className="flex items-center gap-2 shrink-0">
                          {!n.is_read && (
                            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(e, n.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Burahin ang abiso"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {n.body && (
                        <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed whitespace-pre-line">
                          {n.body}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] font-bold text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(n.created_at).toLocaleString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                        {n.link && (
                          <span className="text-brand-primary font-extrabold flex items-center gap-1">
                            <Translate fil="Buksan" en="Open" /> <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-brand-light/30 text-brand-primary flex items-center justify-center mx-auto">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-heading font-black text-slate-800">
                <Translate fil="Walang mga abiso sa ngayon" en="No notifications right now" />
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
                <Translate
                  fil="Lalabas dito ang mga bagong anunsyo, pagsusumite ng gawain, at mga paalala sa deadline. Maaari mo ring tingnan ang Activity Logs tab!"
                  en="New announcements, task submissions, and deadline reminders will appear here. You can also check the Activity Logs tab!"
                />
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: ANNOUNCEMENTS ================= */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-black text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-brand-primary" />
                <Translate fil="Mga Anunsyo sa Silid-aralan" en="Classroom Announcements" />
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {role === 'educator' ? (
                  <Translate
                    fil="Mga anunsyong ipinadala mo sa iyong mga silid-aralan."
                    en="Announcements you have sent to your classrooms."
                  />
                ) : (
                  <Translate
                    fil="Mga opisyal na anunsyo at paalala mula sa iyong mga guro."
                    en="Official announcements and reminders from your teachers."
                  />
                )}
              </p>
            </div>

            {role === 'educator' && classrooms.length > 0 && (
              <button
                type="button"
                onClick={() => setIsComposeOpen(true)}
                className="px-4 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <Translate fil="Bagong Anunsyo" en="New Announcement" />
              </button>
            )}
          </div>

          {filteredAnnouncements.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-sm transition-all ${
                    item.priority === 'urgent'
                      ? 'border-rose-300 bg-rose-50/20'
                      : item.priority === 'important'
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          item.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : item.priority === 'important'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-brand-light/50 text-brand-primary border border-brand-primary/20'
                        }`}
                      >
                        {item.priority === 'urgent'
                          ? '🚨 Apurahan / Urgent'
                          : item.priority === 'important'
                          ? '⚡ Mahalaga / Important'
                          : '📢 Anunsyo'}
                      </span>

                      <Link
                        href={
                          role === 'educator'
                            ? `/educator/classrooms/${item.classroomId}`
                            : `/student/classrooms/${item.classroomId}`
                        }
                        className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-colors flex items-center gap-1"
                      >
                        <span>🏫 {item.classroomName}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">
                        {new Date(item.created_at).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                      {role === 'educator' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(item)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Burahin ang anunsyo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-heading font-black text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>

                  {item.educatorName && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
                      <span>Guro: {item.educatorName}</span>
                      <Link
                        href={
                          role === 'educator'
                            ? `/educator/classrooms/${item.classroomId}`
                            : `/student/classrooms/${item.classroomId}`
                        }
                        className="text-brand-primary hover:underline font-extrabold flex items-center gap-1"
                      >
                        <Translate fil="Pumunta sa Silid-aralan" en="Go to Classroom" /> →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-heading font-bold text-slate-800">
                <Translate fil="Wala pang mga anunsyo." en="No announcements yet." />
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                {role === 'educator' ? (
                  <Translate
                    fil="Magpadala ng iyong unang anunsyo upang mabigyan ng paalala ang mga mag-aaral sa iyong silid-aralan."
                    en="Send your first announcement to update students in your classroom."
                  />
                ) : (
                  <Translate
                    fil="Makikita mo rito at sa loob ng iyong silid-aralan ang mga anunsyo mula sa iyong guro."
                    en="Announcements from your educator will appear here and inside your classroom."
                  />
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: SUBMISSIONS (TEACHER POV) ================= */}
      {activeTab === 'submissions' && role === 'educator' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <Translate
                fil="Mga Pagsusumite ng Asynchronous na Gawain"
                en="Asynchronous Task Submissions"
              />
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              <Translate
                fil="Talaan ng mga mag-aaral na nagpasa ng kanilang mga pagsusulit sa iyong mga silid-aralan."
                en="Real-time log of students who submitted quizzes across your classrooms."
              />
            </p>
          </div>

          {submissionLogs.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {submissionLogs.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center shrink-0 overflow-hidden border border-emerald-200">
                      {sub.actorAvatar ? (
                        <img
                          src={sub.actorAvatar}
                          alt={sub.actorName || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (sub.actorName?.[0] || 'M').toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-heading font-black text-slate-900">
                          {sub.title}
                        </h4>
                        {sub.badgeText && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getBadgeStyle(
                              sub.badgeColor
                            )}`}
                          >
                            {sub.badgeText}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                        {sub.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] font-bold text-slate-400">
                        {sub.classroomName && <span>🏫 {sub.classroomName}</span>}
                        <span>
                          🕒{' '}
                          {new Date(sub.timestamp).toLocaleString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {sub.link && (
                    <Link
                      href={sub.link}
                      className="px-4 py-2 bg-slate-100 hover:bg-brand-primary hover:text-white text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-center shrink-0"
                    >
                      <Translate fil="Suriin ang Gawain" en="View Task" />
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2 shadow-sm">
              <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-heading font-bold text-slate-800">
                <Translate fil="Wala pang naitalang pagsusumite." en="No submissions recorded yet." />
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                <Translate
                  fil="Makakatanggap ka agad ng abiso sa oras na may mag-aaral na magpasa ng pagsusulit."
                  en="You will automatically receive a notification whenever a student submits a quiz."
                />
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: DEADLINES ================= */}
      {activeTab === 'deadlines' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-rose-600" />
              <Translate
                fil="Pagsubaybay sa mga Deadline ng Gawain"
                en="Task Deadlines Tracker"
              />
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {role === 'educator' ? (
                <Translate
                  fil="Mga pagsusulit na may nakatakdang deadline, kasama ang bilang ng mga nakapagsumiteng mag-aaral."
                  en="Quizzes with scheduled deadlines, including student submission progress."
                />
              ) : (
                <Translate
                  fil="Mga pagsusulit sa iyong silid-aralan na may nakatakdang deadline."
                  en="Classroom quizzes with upcoming or due deadlines."
                />
              )}
            </p>
          </div>

          {filteredDeadlines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDeadlines.map((d) => {
                const isPastDue = d.status === 'past_due'
                const isDueSoon = d.status === 'due_soon'
                const completionPct =
                  d.totalStudents && d.totalStudents > 0
                    ? Math.round(((d.submittedCount || 0) / d.totalStudents) * 100)
                    : 0

                return (
                  <div
                    key={d.quizId}
                    className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-sm flex flex-col justify-between gap-4 ${
                      isDueSoon
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : isPastDue
                        ? 'border-rose-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                            isDueSoon
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                              : isPastDue
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isDueSoon
                            ? '⏳ Malapit na ang Deadline (Due Soon)'
                            : isPastDue
                            ? '⏰ Sumapit na ang Deadline (Due / Ended)'
                            : '📅 Nakatakda (Upcoming)'}
                        </span>

                        <span className="text-xs font-extrabold text-slate-500">
                          🏫 {d.classroomName}
                        </span>
                      </div>

                      <h3 className="text-lg font-heading font-black text-slate-900 mb-1">
                        {d.quizTitle}
                      </h3>

                      <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-rose-500" />
                        <span>
                          Deadline:{' '}
                          {new Date(d.scheduledEnd).toLocaleString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </p>

                      {role === 'educator' ? (
                        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-600">
                              <Translate fil="Nakapagsumite:" en="Submitted:" />
                            </span>
                            <span className="font-black text-slate-900">
                              {d.submittedCount || 0} / {d.totalStudents || 0} mag-aaral ({completionPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-primary rounded-full transition-all"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4">
                          {d.hasSubmitted ? (
                            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center justify-between">
                              <span>✅ Naipasa Mo Na</span>
                              {d.bestScore !== undefined && d.maxScore !== undefined && (
                                <span>
                                  Pinakamataas na Iskor: {d.bestScore}/{d.maxScore}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold flex items-center justify-between">
                              <span>⏳ Hindi Pa Nasasagutan</span>
                              <span>Sagutan bago ang deadline!</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {role === 'educator' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openReminderModalForDeadline(d)}
                            className="text-xs font-extrabold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                            <Translate fil="Magpadala ng Paalala" en="Send Class Reminder" />
                          </button>
                          <Link
                            href={`/educator/quizzes/${d.quizId}`}
                            className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1"
                          >
                            <Translate fil="Tingnan ang Pagsusulit" en="View Quiz" /> →
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/student/quiz/${d.quizId}/play`}
                          className="w-full py-2.5 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          {d.hasSubmitted ? (
                            <Translate fil="Muling Maglaro" en="Play Again" />
                          ) : (
                            <Translate fil="Sagutan Ngayon ➔" en="Answer Now ➔" />
                          )}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2 shadow-sm">
              <CalendarClock className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-heading font-bold text-slate-800">
                <Translate
                  fil="Walang nakatakdang deadline sa ngayon."
                  en="No scheduled deadlines right now."
                />
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                {role === 'educator' ? (
                  <Translate
                    fil="Maaari kang magtakda ng deadline kapag gumagawa o nag-e-edit ng pagsusulit upang awtomatikong maabisuhan ang klase."
                    en="You can set a deadline when creating or editing a quiz to automatically notify the class."
                  />
                ) : (
                  <Translate
                    fil="Lalabas dito ang mga pagsusulit na may takdang petsa ng pagsusumite."
                    en="Quizzes with submission deadlines will appear here."
                  />
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: ACTIVITY LOGS ================= */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-black text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-primary" />
                {role === 'educator' ? (
                  <Translate
                    fil="Activity Logs ng Guro at mga Silid-aralan"
                    en="Educator & Classroom Activity Logs"
                  />
                ) : (
                  <Translate
                    fil="Activity Logs ng Mag-aaral"
                    en="Student Activity Logs"
                  />
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {role === 'educator' ? (
                  <Translate
                    fil="Kumpletong kronolohikal na talaan ng mga pagsusumite, anunsyo, deadline, pagsali ng mag-aaral, at live sessions."
                    en="Complete chronological log of submissions, announcements, deadlines, student enrollments, and live sessions."
                  />
                ) : (
                  <Translate
                    fil="Kumpletong kronolohikal na talaan ng iyong mga naipasang pagsusulit, anunsyo ng guro, live arena, at mga pagkilala."
                    en="Complete chronological log of your submitted quizzes, teacher announcements, live arena sessions, and awards."
                  />
                )}
              </p>
            </div>

            {/* Activity Type Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', labelFil: 'Lahat', labelEn: 'All' },
                { id: 'submission', labelFil: 'Pagsusumite', labelEn: 'Submissions' },
                { id: 'announcement', labelFil: 'Anunsyo', labelEn: 'Announcements' },
                { id: 'deadline', labelFil: 'Deadline', labelEn: 'Deadlines' },
                { id: 'enrollment', labelFil: 'Pagpapatala', labelEn: 'Enrollments' },
                { id: 'live_session', labelFil: 'Live Arena', labelEn: 'Live Arena' }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActivityTypeFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activityTypeFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Translate fil={f.labelFil} en={f.labelEn} />
                </button>
              ))}
            </div>
          </div>

          {filteredActivityLogs.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <div className="relative pl-6 sm:pl-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 space-y-6">
                {filteredActivityLogs.map((log) => (
                  <div key={log.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-xs">
                      <div className="scale-75">{getActivityIcon(log.type)}</div>
                    </div>

                    <div className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-heading font-black text-slate-900">
                            {log.title}
                          </span>
                          {log.badgeText && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getBadgeStyle(
                                log.badgeColor
                              )}`}
                            >
                              {log.badgeText}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                          {log.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-bold text-slate-400">
                          {log.classroomName && <span>🏫 {log.classroomName}</span>}
                          {log.actorName && <span>👤 {log.actorName}</span>}
                          <span>
                            🕒{' '}
                            {new Date(log.timestamp).toLocaleString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {log.link && (
                        <Link
                          href={log.link}
                          className="px-3.5 py-2 bg-white hover:bg-brand-primary hover:text-white text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1 self-start sm:self-center shrink-0 shadow-2xs"
                        >
                          <Translate fil="Tingnan" en="View" />
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2 shadow-sm">
              <Activity className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-heading font-bold text-slate-800">
                <Translate fil="Wala pang talaan ng aktibidad." en="No activity logs found." />
              </h3>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: COMPOSE ANNOUNCEMENT (TEACHER) ================= */}
      {isComposeOpen && role === 'educator' && (
        <div className="fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 relative animate-slide-up">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-light/50 text-brand-primary flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-heading font-black text-slate-900">
                    <Translate fil="Magpadala ng Anunsyo" en="Send Classroom Announcement" />
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    <Translate
                      fil="Makikita ito ng mga mag-aaral sa kanilang Abiso at sa loob ng Silid-aralan."
                      en="Students will see this in their Notifications and inside the Classroom."
                    />
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendAnnouncement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">
                    <Translate fil="Piliin ang Silid-aralan" en="Select Classroom" /> *
                  </label>
                  <select
                    value={composeClassroomId}
                    onChange={(e) => setComposeClassroomId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
                  >
                    <option value="all">📢 Lahat ng Aktibong Silid-aralan (All Classrooms)</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">
                    <Translate fil="Antas ng Kahalagahan" en="Priority Level" />
                  </label>
                  <select
                    value={composePriority}
                    onChange={(e) => setComposePriority(e.target.value as AnnouncementPriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
                  >
                    <option value="normal">📢 Normal na Anunsyo</option>
                    <option value="important">⚡ Mahalaga (Important)</option>
                    <option value="urgent">🚨 Apurahan (Urgent / Deadline)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  <Translate fil="Pamagat ng Anunsyo" en="Announcement Title" /> *
                </label>
                <input
                  type="text"
                  required
                  value={composeTitle}
                  onChange={(e) => setComposeTitle(e.target.value)}
                  placeholder="Hal. Paalala sa Pagsusulit Bukas / Walang Pasok..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  <Translate fil="Mensahe para sa mga Mag-aaral" en="Message to Students" /> *
                </label>
                <textarea
                  rows={4}
                  required
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  placeholder="Isulat ang buong detalye ng iyong anunsyo para sa klase..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-primary resize-none"
                />

                {/* Quick Templates */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    {
                      t: 'Paalala sa Takdang Pagsusulit',
                      c: 'Mga mag-aaral, huwag kalimutang sagutan at ipasa ang ating nakatakdang pagsusulit bago sumapit ang deadline!'
                    },
                    {
                      t: 'Paghahanda sa Live Arena',
                      c: 'Maghanda para sa ating synchronous Live Arena session mamaya! Siguraduhing nakapasok na sa silid-aralan.'
                    },
                    {
                      t: 'Pagbati sa Klase!',
                      c: 'Binabati ko ang lahat sa inyong sipag at husay sa pagsagot ng ating mga pagsusulit ngayong linggo! 🌟'
                    }
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setComposeTitle(preset.t)
                        setComposeContent(preset.c)
                      }}
                      className="text-[10px] font-bold bg-brand-light/30 hover:bg-brand-light/60 text-brand-primary px-2.5 py-1 rounded-full border border-brand-primary/20 transition-colors cursor-pointer"
                    >
                      + {preset.t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <Translate fil="Kanselahin" en="Cancel" />
                </button>
                <button
                  type="submit"
                  disabled={isPending || !composeTitle.trim() || !composeContent.trim()}
                  className="px-6 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <Translate fil="Ipadala ang Anunsyo" en="Post Announcement" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
