import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  NotificationsPageClient,
  DeadlineTaskItem,
  ActivityLogItem
} from '@/components/NotificationsPageClient'
import { syncUserNotifications } from '@/app/notifications/actions'
import { mergeAnnouncements } from '@/lib/utils/announcements'

export default async function EducatorNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Sync any upcoming/due deadlines or recent submissions into notifications table
  await syncUserNotifications()

  // 1. Fetch Educator's Classrooms & Members
  const { data: rawClassrooms } = await supabase
    .from('classrooms')
    .select(`
      id,
      name,
      created_at,
      classroom_members (
        student_id,
        joined_at,
        profiles ( full_name, avatar_url )
      )
    `)
    .eq('educator_id', user.id)
    .order('created_at', { ascending: false })

  const classroomsList = rawClassrooms || []
  const classroomIds = classroomsList.map((c) => c.id)
  const classroomNameMap = new Map<string, string>()
  const classroomMemberCountMap = new Map<string, number>()

  for (const c of classroomsList) {
    classroomNameMap.set(c.id, c.name)
    classroomMemberCountMap.set(
      c.id,
      Array.isArray(c.classroom_members) ? c.classroom_members.length : 0
    )
  }

  // 2. Fetch Notifications for this Educator
  const { data: rawNotifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const notifications = rawNotifs || []

  // 3. Fetch Quizzes, Attempts, Live Sessions, and Announcements for Educator's Classrooms
  let quizzesList: any[] = []
  let attemptsList: any[] = []
  let liveSessionsList: any[] = []
  let tableAnnouncements: any[] = []

  if (classroomIds.length > 0) {
    const [quizzesRes, liveRes] = await Promise.all([
      supabase
        .from('quizzes')
        .select('id, title, classroom_id, is_published, game_mode, scheduled_start, scheduled_end, created_at')
        .in('classroom_id', classroomIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('live_sessions')
        .select(`
          id,
          classroom_id,
          mode,
          status,
          created_at,
          live_session_participants ( student_id, removed_at )
        `)
        .in('classroom_id', classroomIds)
        .order('created_at', { ascending: false })
        .limit(30)
    ])

    quizzesList = quizzesRes.data || []
    liveSessionsList = liveRes.data || []

    // Try fetching from classroom_announcements table if Migration 013 is applied
    try {
      const { data: annData } = await supabase
        .from('classroom_announcements')
        .select('*')
        .in('classroom_id', classroomIds)
        .order('created_at', { ascending: false })

      if (annData) tableAnnouncements = annData
    } catch {
      // Safe fallback to notifications
    }

    const quizIds = quizzesList.map((q) => q.id)
    if (quizIds.length > 0) {
      const { data: rawAttempts } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          student_id,
          score,
          total_questions,
          time_taken_seconds,
          completed_at,
          game_mode,
          profiles ( full_name, avatar_url )
        `)
        .in('quiz_id', quizIds)
        .order('completed_at', { ascending: false })
        .limit(100)

      attemptsList = rawAttempts || []
    }
  }

  // 4. Build Merged Announcements
  const announcements = mergeAnnouncements(
    tableAnnouncements,
    notifications,
    classroomNameMap
  )

  // 5. Build Deadlines Tracker List
  const nowMs = Date.now()
  const deadlines: DeadlineTaskItem[] = []
  const quizMap = new Map<string, any>()

  for (const q of quizzesList) {
    quizMap.set(q.id, q)
    if (!q.scheduled_end) continue

    const endMs = new Date(q.scheduled_end).getTime()
    if (isNaN(endMs)) continue

    const diffHours = (endMs - nowMs) / (1000 * 60 * 60)
    const status: DeadlineTaskItem['status'] =
      diffHours <= 0 ? 'past_due' : diffHours <= 72 ? 'due_soon' : 'upcoming'

    const submittedStudents = new Set(
      attemptsList.filter((a) => a.quiz_id === q.id).map((a) => a.student_id)
    ).size

    deadlines.push({
      quizId: q.id,
      quizTitle: q.title,
      classroomId: q.classroom_id,
      classroomName: classroomNameMap.get(q.classroom_id) || 'Silid-aralan',
      gameMode: q.game_mode || 'mastery',
      scheduledStart: q.scheduled_start,
      scheduledEnd: q.scheduled_end,
      status,
      submittedCount: submittedStudents,
      totalStudents: classroomMemberCountMap.get(q.classroom_id) || 0
    })
  }

  // Sort deadlines: due_soon first, then upcoming, then past_due
  const statusWeight = { due_soon: 0, upcoming: 1, past_due: 2 }
  deadlines.sort((a, b) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status]
    }
    return new Date(a.scheduledEnd).getTime() - new Date(b.scheduledEnd).getTime()
  })

  // 6. Build Comprehensive Teacher POV Activity Logs
  const activityLogs: ActivityLogItem[] = []

  // 6a. Asynchronous Task Submissions
  for (const att of attemptsList) {
    const q = quizMap.get(att.quiz_id)
    if (!q) continue
    const roomName = classroomNameMap.get(q.classroom_id) || 'Silid-aralan'
    const studentName = (att.profiles as any)?.full_name || 'Mag-aaral'
    const studentAvatar = (att.profiles as any)?.avatar_url || null
    const pct =
      att.total_questions > 0
        ? Math.round((att.score / att.total_questions) * 100)
        : 0

    activityLogs.push({
      id: `sub-${att.id}`,
      type: 'submission',
      title: `Nagsumite si ${studentName} sa "${q.title}"`,
      description: `Nakakuha ng ${att.score}/${att.total_questions} (${pct}%) • Oras: ${att.time_taken_seconds || 0}s`,
      classroomId: q.classroom_id,
      classroomName: roomName,
      actorName: studentName,
      actorAvatar: studentAvatar,
      badgeText: `${pct}% (${att.score}/${att.total_questions})`,
      badgeColor: pct >= 75 ? 'emerald' : pct >= 50 ? 'amber' : 'rose',
      link: `/educator/quizzes/${q.id}`,
      timestamp: att.completed_at
    })
  }

  // 6b. Announcements Sent
  for (const ann of announcements) {
    activityLogs.push({
      id: `ann-${ann.id}`,
      type: 'announcement',
      title: `Nagpadala ng Anunsyo: ${ann.title}`,
      description: ann.content,
      classroomId: ann.classroomId,
      classroomName: ann.classroomName,
      badgeText:
        ann.priority === 'urgent'
          ? 'Apurahan'
          : ann.priority === 'important'
          ? 'Mahalaga'
          : 'Anunsyo',
      badgeColor:
        ann.priority === 'urgent'
          ? 'rose'
          : ann.priority === 'important'
          ? 'amber'
          : 'blue',
      link: ann.classroomId ? `/educator/classrooms/${ann.classroomId}` : undefined,
      timestamp: ann.created_at
    })
  }

  // 6c. Deadlines (Due Soon & Past Due)
  for (const d of deadlines) {
    if (d.status === 'due_soon' || d.status === 'past_due') {
      activityLogs.push({
        id: `dl-${d.quizId}`,
        type: 'deadline',
        title:
          d.status === 'past_due'
            ? `Sumapit na ang Deadline: ${d.quizTitle}`
            : `Malapit na ang Deadline: ${d.quizTitle}`,
        description: `Nakapagsumite: ${d.submittedCount}/${d.totalStudents} mag-aaral sa ${d.classroomName}.`,
        classroomId: d.classroomId,
        classroomName: d.classroomName,
        badgeText: d.status === 'past_due' ? 'Tapos Na ang Deadline' : 'Malapit Na',
        badgeColor: d.status === 'past_due' ? 'rose' : 'amber',
        link: `/educator/quizzes/${d.quizId}`,
        timestamp: d.status === 'past_due' ? d.scheduledEnd : new Date().toISOString()
      })
    }
  }

  // 6d. Student Enrollments
  for (const c of classroomsList) {
    const members = Array.isArray(c.classroom_members) ? c.classroom_members : []
    for (const m of members) {
      const sName = (m.profiles as any)?.full_name || 'Mag-aaral'
      const sAvatar = (m.profiles as any)?.avatar_url || null
      activityLogs.push({
        id: `join-${c.id}-${m.student_id}`,
        type: 'enrollment',
        title: `Sumali si ${sName} sa silid-aralan`,
        description: `Nagpatala bilang mag-aaral sa "${c.name}".`,
        classroomId: c.id,
        classroomName: c.name,
        actorName: sName,
        actorAvatar: sAvatar,
        badgeText: 'Bagong Mag-aaral',
        badgeColor: 'blue',
        link: `/educator/classrooms/${c.id}`,
        timestamp: m.joined_at
      })
    }
  }

  // 6e. Quizzes Created
  for (const q of quizzesList) {
    const roomName = classroomNameMap.get(q.classroom_id) || 'Silid-aralan'
    activityLogs.push({
      id: `quiz-${q.id}`,
      type: 'quiz_created',
      title: `Nilikha ang Pagsusulit: ${q.title}`,
      description: `Sa silid-aralang "${roomName}" (${q.is_published ? 'Nailathala' : 'Draft'}).`,
      classroomId: q.classroom_id,
      classroomName: roomName,
      badgeText: q.is_published ? 'Nailathala' : 'Draft',
      badgeColor: q.is_published ? 'emerald' : 'slate',
      link: `/educator/quizzes/${q.id}`,
      timestamp: q.created_at
    })
  }

  // 6f. Live Arena Sessions
  for (const ls of liveSessionsList) {
    const roomName = classroomNameMap.get(ls.classroom_id) || 'Silid-aralan'
    const activeCount = Array.isArray(ls.live_session_participants)
      ? ls.live_session_participants.filter((p: any) => !p.removed_at).length
      : 0

    activityLogs.push({
      id: `live-${ls.id}`,
      type: 'live_session',
      title: `Live Arena Session (${ls.mode === 'group' ? 'Pangkatan' : 'Indibidwal'})`,
      description: `Nilahukan ng ${activeCount} mag-aaral sa "${roomName}".`,
      classroomId: ls.classroom_id,
      classroomName: roomName,
      badgeText: ls.status === 'ended' ? 'Tapos Na' : 'Aktibo',
      badgeColor: ls.status === 'ended' ? 'slate' : 'amber',
      link:
        ls.status === 'ended'
          ? `/educator/classrooms/${ls.classroom_id}/live/${ls.id}/results`
          : `/educator/classrooms/${ls.classroom_id}/live/${ls.id}/host`,
      timestamp: ls.created_at
    })
  }

  activityLogs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <NotificationsPageClient
      role="educator"
      userId={user.id}
      initialNotifications={notifications}
      classrooms={classroomsList.map((c) => ({
        id: c.id,
        name: c.name,
        memberCount: classroomMemberCountMap.get(c.id) || 0
      }))}
      deadlines={deadlines}
      announcements={announcements}
      activityLogs={activityLogs}
    />
  )
}
