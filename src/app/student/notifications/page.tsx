import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  NotificationsPageClient,
  DeadlineTaskItem,
  ActivityLogItem
} from '@/components/NotificationsPageClient'
import { syncUserNotifications } from '@/app/notifications/actions'
import { mergeAnnouncements } from '@/lib/utils/announcements'
import { getPrebuiltQuizById } from '@/lib/data/filipino-trivia'

export default async function StudentNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Sync any upcoming/due deadlines into notifications table
  await syncUserNotifications()

  // 1. Fetch Student's Enrolled Classrooms
  const { data: rawEnrollments } = await supabase
    .from('classroom_members')
    .select(`
      classroom_id,
      joined_at,
      classrooms (
        id,
        name,
        educator_id,
        profiles!classrooms_educator_id_fkey ( full_name )
      )
    `)
    .eq('student_id', user.id)
    .order('joined_at', { ascending: false })

  const enrollments = rawEnrollments || []
  const classroomIds: string[] = []
  const classroomNameMap = new Map<string, string>()
  const educatorNameMap = new Map<string, string>()
  const classroomsList: Array<{ id: string; name: string }> = []

  for (const e of enrollments) {
    const c = e.classrooms as any
    if (!c?.id) continue
    classroomIds.push(c.id)
    classroomNameMap.set(c.id, c.name)
    if (c.profiles?.full_name) {
      educatorNameMap.set(c.id, c.profiles.full_name)
    }
    classroomsList.push({ id: c.id, name: c.name })
  }

  // 2. Fetch Student's Notifications
  const { data: rawNotifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const notifications = rawNotifs || []

  // 3. Fetch Published Quizzes in Enrolled Classrooms, Student's Quiz Attempts, Live Session Participations, and Announcements
  let quizzesList: any[] = []
  let tableAnnouncements: any[] = []

  if (classroomIds.length > 0) {
    const { data: qData } = await supabase
      .from('quizzes')
      .select('id, title, classroom_id, game_mode, scheduled_start, scheduled_end, created_at')
      .in('classroom_id', classroomIds)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    quizzesList = qData || []

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
  }

  const [attemptsRes, livePartRes] = await Promise.all([
    supabase
      .from('quiz_attempts')
      .select('id, quiz_id, score, total_questions, time_taken_seconds, completed_at, game_mode, answers')
      .eq('student_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(100),
    supabase
      .from('live_session_participants')
      .select(`
        session_id,
        total_score,
        joined_at,
        removed_at,
        live_sessions (
          id,
          classroom_id,
          mode,
          status,
          created_at
        )
      `)
      .eq('student_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(30)
  ])

  const myAttempts = attemptsRes.data || []
  const myLiveSessions = livePartRes.data || []

  // 4. Build Merged Announcements
  const announcements = mergeAnnouncements(
    tableAnnouncements,
    notifications,
    classroomNameMap,
    educatorNameMap
  )

  // 5. Build Deadlines Tracker List for Student
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

    const qAttempts = myAttempts.filter((a) => a.quiz_id === q.id)
    const hasSubmitted = qAttempts.length > 0
    const bestScore = hasSubmitted
      ? Math.max(...qAttempts.map((a) => a.score))
      : undefined
    const maxScore = hasSubmitted ? qAttempts[0].total_questions : undefined

    deadlines.push({
      quizId: q.id,
      quizTitle: q.title,
      classroomId: q.classroom_id,
      classroomName: classroomNameMap.get(q.classroom_id) || 'Silid-aralan',
      gameMode: q.game_mode || 'mastery',
      scheduledStart: q.scheduled_start,
      scheduledEnd: q.scheduled_end,
      status,
      hasSubmitted,
      bestScore,
      maxScore
    })
  }

  const statusWeight = { due_soon: 0, upcoming: 1, past_due: 2 }
  deadlines.sort((a, b) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status]
    }
    return new Date(a.scheduledEnd).getTime() - new Date(b.scheduledEnd).getTime()
  })

  // 6. Build Comprehensive Student POV Activity Logs
  const activityLogs: ActivityLogItem[] = []

  // 6a. My Quiz & Practice Submissions
  for (const att of myAttempts) {
    const q = quizMap.get(att.quiz_id)
    const prebuilt = getPrebuiltQuizById(att.quiz_id)
    const quizTitle =
      q?.title ||
      prebuilt?.title ||
      (att.answers as any)?.quiz_title ||
      'Pagsusulit sa Filipino'
    const cId = q?.classroom_id
    const cName = cId
      ? classroomNameMap.get(cId) || 'Silid-aralan'
      : 'Palarong Handa (Practice)'
    const pct =
      att.total_questions > 0
        ? Math.round((att.score / att.total_questions) * 100)
        : 0

    activityLogs.push({
      id: `sub-${att.id}`,
      type: 'submission',
      title: `Naipasa ang Gawain: "${quizTitle}"`,
      description: `Nakakuha ka ng iskor na ${att.score}/${att.total_questions} (${pct}%) sa loob ng ${att.time_taken_seconds || 0}s.`,
      classroomId: cId,
      classroomName: cName,
      badgeText: `${pct}% (${att.score}/${att.total_questions})`,
      badgeColor: pct >= 75 ? 'emerald' : pct >= 50 ? 'amber' : 'rose',
      link: cId ? `/student/classrooms/${cId}` : '/student/performance',
      timestamp: att.completed_at
    })
  }

  // 6b. Announcements from Teachers
  for (const ann of announcements) {
    activityLogs.push({
      id: `ann-${ann.id}`,
      type: 'announcement',
      title: `Anunsyo sa ${ann.classroomName}: ${ann.title}`,
      description: ann.content,
      classroomId: ann.classroomId,
      classroomName: ann.classroomName,
      actorName: ann.educatorName,
      badgeText:
        ann.priority === 'urgent'
          ? 'Apurahan'
          : ann.priority === 'important'
          ? 'Mahalaga'
          : 'Anunsyo ng Guro',
      badgeColor:
        ann.priority === 'urgent'
          ? 'rose'
          : ann.priority === 'important'
          ? 'amber'
          : 'blue',
      link: ann.classroomId ? `/student/classrooms/${ann.classroomId}` : undefined,
      timestamp: ann.created_at
    })
  }

  // 6c. Stars & Warnings from Educator
  for (const n of notifications) {
    if (n.title?.includes('🌟')) {
      activityLogs.push({
        id: `star-${n.id}`,
        type: 'recognition',
        title: n.title,
        description: n.body || 'Iginawad ng iyong guro.',
        badgeText: 'Bituin ng Pagkilala',
        badgeColor: 'amber',
        link: n.link || undefined,
        timestamp: n.created_at
      })
    } else if (n.title?.includes('⚠️')) {
      activityLogs.push({
        id: `warn-${n.id}`,
        type: 'warning',
        title: n.title,
        description: n.body || 'Paalala mula sa iyong guro.',
        badgeText: 'Paalala ng Guro',
        badgeColor: 'rose',
        link: n.link || undefined,
        timestamp: n.created_at
      })
    }
  }

  // 6d. Classroom Enrollments
  for (const e of enrollments) {
    const c = e.classrooms as any
    if (!c?.id) continue
    const edName = educatorNameMap.get(c.id) || 'Guro'
    activityLogs.push({
      id: `join-${c.id}`,
      type: 'enrollment',
      title: `Sumali sa Silid-aralan: "${c.name}"`,
      description: `Opisyal na naitala sa klase ni ${edName}.`,
      classroomId: c.id,
      classroomName: c.name,
      actorName: edName,
      badgeText: 'Nakasali',
      badgeColor: 'blue',
      link: `/student/classrooms/${c.id}`,
      timestamp: e.joined_at
    })
  }

  // 6e. Live Arena Sessions Joined
  for (const lp of myLiveSessions) {
    const ls = lp.live_sessions as any
    if (!ls?.id) continue
    const cName = classroomNameMap.get(ls.classroom_id) || 'Silid-aralan'
    activityLogs.push({
      id: `live-${ls.id}`,
      type: 'live_session',
      title: `Lumahok sa Live Arena (${ls.mode === 'group' ? 'Pangkatan' : 'Indibidwal'})`,
      description: `Sa silid-aralang "${cName}" • Kabuuang Puntos: ${lp.total_score || 0}`,
      classroomId: ls.classroom_id,
      classroomName: cName,
      badgeText: `${lp.total_score || 0} pts`,
      badgeColor: 'violet',
      link: `/student/classrooms/${ls.classroom_id}/live/${ls.id}/results`,
      timestamp: lp.joined_at
    })
  }

  activityLogs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <NotificationsPageClient
      role="learner"
      userId={user.id}
      initialNotifications={notifications}
      classrooms={classroomsList}
      deadlines={deadlines}
      announcements={announcements}
      activityLogs={activityLogs}
    />
  )
}
