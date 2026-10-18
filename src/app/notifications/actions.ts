'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AnnouncementPriority = 'normal' | 'important' | 'urgent'

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/educator/notifications')
  revalidatePath('/student/notifications')
  return { success: true }
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/educator/notifications')
  revalidatePath('/student/notifications')
  return { success: true }
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/educator/notifications')
  revalidatePath('/student/notifications')
  return { success: true }
}

export async function clearReadNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('is_read', true)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/educator/notifications')
  revalidatePath('/student/notifications')
  return { success: true }
}

export async function sendClassroomAnnouncement(
  classroomId: string,
  title: string,
  content: string,
  priority: AnnouncementPriority = 'normal'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Kailangan munang mag-sign in.' }
  }

  const cleanTitle = title?.trim()
  const cleanContent = content?.trim()

  if (!cleanTitle || !cleanContent) {
    return { error: 'Mangyaring ilagay ang pamagat at mensahe ng anunsyo.' }
  }

  // Fetch target classrooms (either a specific classroom or all active classrooms owned by educator)
  let targetClassrooms: Array<{ id: string; name: string }> = []

  if (classroomId === 'all') {
    const { data: allRooms } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('educator_id', user.id)
      .eq('is_active', true)

    targetClassrooms = allRooms || []
  } else {
    const { data: room } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('id', classroomId)
      .eq('educator_id', user.id)
      .single()

    if (room) targetClassrooms = [room]
  }

  if (targetClassrooms.length === 0) {
    return { error: 'Hindi nahanap ang silid-aralan o wala kang pahintulot.' }
  }

  const priorityTag =
    priority === 'urgent'
      ? '🚨 [Apurahan] '
      : priority === 'important'
      ? '⚡ [Mahalaga] '
      : ''

  let totalNotifiedStudents = 0

  for (const room of targetClassrooms) {
    // 1. Try inserting into dedicated classroom_announcements table (if Migration 013 is applied)
    try {
      await supabase.from('classroom_announcements').insert({
        classroom_id: room.id,
        educator_id: user.id,
        title: cleanTitle,
        content: cleanContent,
        priority,
        is_pinned: priority === 'urgent'
      })
    } catch {
      // Safe fallback if classroom_announcements table does not exist yet
    }

    // 2. Fetch all enrolled students in this classroom
    const { data: members } = await supabase
      .from('classroom_members')
      .select('student_id')
      .eq('classroom_id', room.id)

    const notifTitleForStudent = `📢 ${priorityTag}Anunsyo sa ${room.name}: ${cleanTitle}`
    const notifTitleForEducator = `📢 ${priorityTag}Anunsyo sa ${room.name}: ${cleanTitle}`

    const notificationsToInsert: Array<{
      user_id: string
      title: string
      body: string
      link: string
      is_read: boolean
    }> = []

    if (members && members.length > 0) {
      for (const m of members) {
        notificationsToInsert.push({
          user_id: m.student_id,
          title: notifTitleForStudent,
          body: cleanContent,
          link: `/student/classrooms/${room.id}`,
          is_read: false
        })
        totalNotifiedStudents++
      }
    }

    // Also record a copy in notifications for the educator so it persists in their classroom & activity feed
    notificationsToInsert.push({
      user_id: user.id,
      title: notifTitleForEducator,
      body: cleanContent,
      link: `/educator/classrooms/${room.id}`,
      is_read: true
    })

    const { error: notifErr } = await supabase
      .from('notifications')
      .insert(notificationsToInsert)

    if (notifErr) {
      console.error('Error inserting announcement notifications:', notifErr)
      return { error: 'Hindi naipadala ang anunsyo: ' + notifErr.message }
    }

    revalidatePath(`/educator/classrooms/${room.id}`)
    revalidatePath(`/student/classrooms/${room.id}`)
  }

  revalidatePath('/educator/notifications')
  revalidatePath('/student/notifications')
  revalidatePath('/educator')
  revalidatePath('/student')

  return {
    success: true,
    notifiedCount: totalNotifiedStudents,
    classroomsCount: targetClassrooms.length
  }
}

export async function deleteClassroomAnnouncement(
  classroomId: string,
  announcementId: string,
  titleMatch?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Kailangan munang mag-sign in.' }
  }

  // 1. Try deleting from classroom_announcements if table exists
  try {
    await supabase
      .from('classroom_announcements')
      .delete()
      .eq('id', announcementId)
      .eq('educator_id', user.id)
  } catch {
    // Ignore if table doesn't exist
  }

  // 2. Also delete from educator's notifications if stored there
  await supabase
    .from('notifications')
    .delete()
    .eq('id', announcementId)
    .eq('user_id', user.id)

  if (titleMatch) {
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('title', titleMatch)
  }

  revalidatePath(`/educator/classrooms/${classroomId}`)
  revalidatePath(`/student/classrooms/${classroomId}`)
  revalidatePath('/educator/notifications')
  return { success: true }
}

/**
 * Automatically checks for upcoming/due task deadlines and un-notified asynchronous submissions
 * so both teachers and students receive timely notifications in their inbox.
 */
export async function syncUserNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { synced: 0 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.role) return { synced: 0 }

  // Fetch existing notifications for deduplication
  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('id, title, body, link, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const existingList = existingNotifs || []
  const newNotifs: Array<{
    user_id: string
    title: string
    body: string
    link: string
    is_read: boolean
  }> = []

  const now = new Date()
  const nowMs = now.getTime()

  if (profile.role === 'educator') {
    // 1. Fetch Educator's Classrooms & Member counts
    const { data: classrooms } = await supabase
      .from('classrooms')
      .select(`
        id,
        name,
        classroom_members ( student_id )
      `)
      .eq('educator_id', user.id)

    const roomList = classrooms || []
    const roomMap = new Map<string, { name: string; memberCount: number }>()
    for (const r of roomList) {
      roomMap.set(r.id, {
        name: r.name,
        memberCount: Array.isArray(r.classroom_members) ? r.classroom_members.length : 0
      })
    }

    const roomIds = roomList.map(r => r.id)
    if (roomIds.length > 0) {
      // 2. Fetch Published Quizzes in Educator's Classrooms
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, classroom_id, is_published, scheduled_start, scheduled_end, created_at')
        .in('classroom_id', roomIds)
        .eq('is_published', true)

      const quizList = quizzes || []
      const quizIds = quizList.map(q => q.id)

      // 3. Fetch Attempts for these quizzes
      let attemptsList: any[] = []
      if (quizIds.length > 0) {
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select(`
            id,
            quiz_id,
            student_id,
            score,
            total_questions,
            completed_at,
            profiles ( full_name )
          `)
          .in('quiz_id', quizIds)
          .order('completed_at', { ascending: false })
          .limit(30)

        attemptsList = attempts || []
      }

      // Check Deadlines (Upcoming within 72h OR Due/Past Due within last 14 days)
      for (const q of quizList) {
        if (!q.scheduled_end) continue
        const endDate = new Date(q.scheduled_end)
        const endMs = endDate.getTime()
        if (isNaN(endMs)) continue

        const diffHours = (endMs - nowMs) / (1000 * 60 * 60)
        const roomInfo = roomMap.get(q.classroom_id)
        const roomName = roomInfo?.name || 'Silid-aralan'
        const totalMembers = roomInfo?.memberCount || 0
        const submittedStudents = new Set(
          attemptsList.filter(a => a.quiz_id === q.id).map(a => a.student_id)
        ).size

        const formattedDeadline = endDate.toLocaleString('en-PH', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })

        if (diffHours <= 0 && diffHours >= -336) {
          // Deadline is Due / Past Due
          const dueTitle = `⏰ Sumapit na ang Deadline: ${q.title}`
          const alreadyNotified = existingList.some(n => n.title === dueTitle)
          if (!alreadyNotified) {
            newNotifs.push({
              user_id: user.id,
              title: dueTitle,
              body: `Natapos na ang takdang oras para sa "${q.title}" sa ${roomName} (${ formattedDeadline }). Nakapagsumite: ${submittedStudents}/${totalMembers} mag-aaral.`,
              link: `/educator/quizzes/${q.id}`,
              is_read: false
            })
          }
        } else if (diffHours > 0 && diffHours <= 72) {
          // Deadline is Upcoming (within 72 hours)
          const upcomingTitle = `⏳ Malapit na ang Deadline: ${q.title}`
          const alreadyNotified = existingList.some(n => n.title === upcomingTitle)
          if (!alreadyNotified) {
            newNotifs.push({
              user_id: user.id,
              title: upcomingTitle,
              body: `Nalalapit na ang deadline ng "${q.title}" sa ${roomName} (${formattedDeadline}). Kasalukuyang nakapagsumite: ${submittedStudents}/${totalMembers} mag-aaral.`,
              link: `/educator/quizzes/${q.id}`,
              is_read: false
            })
          }
        }
      }

      // Check if we should backfill recent student submissions if none exist in notifications yet
      const hasAnySubmissionNotif = existingList.some(n => n.title?.startsWith('📝'))
      if (!hasAnySubmissionNotif && attemptsList.length > 0) {
        const quizMap = new Map(quizList.map(q => [q.id, q]))
        const recentAttempts = attemptsList.slice(0, 5)
        for (const att of recentAttempts) {
          const q = quizMap.get(att.quiz_id)
          if (!q) continue
          const roomName = roomMap.get(q.classroom_id)?.name || 'Silid-aralan'
          const studentName = (att.profiles as any)?.full_name || 'Isang mag-aaral'
          const pct = att.total_questions > 0 ? Math.round((att.score / att.total_questions) * 100) : 0
          newNotifs.push({
            user_id: user.id,
            title: `📝 Bagong Pagsusumite: ${q.title}`,
            body: `Nagsumite si ${studentName} sa "${q.title}" (${roomName}) • Iskor: ${att.score}/${att.total_questions} (${pct}%).`,
            link: `/educator/quizzes/${q.id}`,
            is_read: false
          })
        }
      }
    }
  } else {
    // Learner POV: Check enrolled classrooms for upcoming or due quiz deadlines
    const { data: enrollments } = await supabase
      .from('classroom_members')
      .select('classroom_id, classrooms ( id, name )')
      .eq('student_id', user.id)

    const enrolledList = enrollments || []
    const roomIds = enrolledList.map(e => e.classroom_id)
    const roomNameMap = new Map<string, string>()
    for (const e of enrolledList) {
      roomNameMap.set(e.classroom_id, (e.classrooms as any)?.name || 'Silid-aralan')
    }

    if (roomIds.length > 0) {
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, classroom_id, scheduled_start, scheduled_end')
        .in('classroom_id', roomIds)
        .eq('is_published', true)

      const quizList = quizzes || []
      const quizIds = quizList.map(q => q.id)

      let myAttemptedQuizIds = new Set<string>()
      if (quizIds.length > 0) {
        const { data: myAttempts } = await supabase
          .from('quiz_attempts')
          .select('quiz_id')
          .eq('student_id', user.id)
          .in('quiz_id', quizIds)

        myAttemptedQuizIds = new Set((myAttempts || []).map(a => a.quiz_id))
      }

      for (const q of quizList) {
        if (!q.scheduled_end) continue
        const endDate = new Date(q.scheduled_end)
        const endMs = endDate.getTime()
        if (isNaN(endMs)) continue

        const diffHours = (endMs - nowMs) / (1000 * 60 * 60)
        const roomName = roomNameMap.get(q.classroom_id) || 'Silid-aralan'
        const hasCompleted = myAttemptedQuizIds.has(q.id)
        const formattedDeadline = endDate.toLocaleString('en-PH', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })

        if (diffHours <= 0 && diffHours >= -336) {
          const dueTitle = `⏰ Sumapit na ang Deadline: ${q.title}`
          const alreadyNotified = existingList.some(n => n.title === dueTitle)
          if (!alreadyNotified) {
            newNotifs.push({
              user_id: user.id,
              title: dueTitle,
              body: hasCompleted
                ? `Natapos na ang deadline para sa "${q.title}" sa ${roomName}. Nakapagsumite ka na sa gawaing ito!`
                : `Natapos na ang deadline para sa "${q.title}" sa ${roomName} (${formattedDeadline}).`,
              link: `/student/classrooms/${q.classroom_id}`,
              is_read: false
            })
          }
        } else if (diffHours > 0 && diffHours <= 72) {
          const upcomingTitle = `⏳ Malapit na ang Deadline: ${q.title}`
          const alreadyNotified = existingList.some(n => n.title === upcomingTitle)
          if (!alreadyNotified) {
            newNotifs.push({
              user_id: user.id,
              title: upcomingTitle,
              body: hasCompleted
                ? `Paalala: Ang deadline ng "${q.title}" sa ${roomName} ay sa ${formattedDeadline} (Nakapagsumite ka na).`
                : `Paalala: Hindi ka pa nakakapagsumite sa "${q.title}" (${roomName}). Deadline: ${formattedDeadline}!`,
              link: hasCompleted ? `/student/classrooms/${q.classroom_id}` : `/student/quiz/${q.id}/play`,
              is_read: false
            })
          }
        }
      }
    }
  }

  if (newNotifs.length > 0) {
    await supabase.from('notifications').insert(newNotifs)
  }

  return { synced: newNotifs.length }
}
