import { AnnouncementItem } from '@/components/NotificationsPageClient'
import { AnnouncementPriority } from '@/app/notifications/actions'

export function parseAnnouncementFromNotification(
  notif: {
    id: string
    title: string
    body: string | null
    link: string | null
    created_at: string
  },
  classroomNameMap?: Map<string, string>,
  educatorNameMap?: Map<string, string>
): AnnouncementItem | null {
  if (!notif.title || (!notif.title.startsWith('📢') && !notif.title.includes('Anunsyo sa '))) {
    return null
  }

  let priority: AnnouncementPriority = 'normal'
  if (notif.title.includes('[Apurahan]') || notif.title.includes('🚨')) {
    priority = 'urgent'
  } else if (notif.title.includes('[Mahalaga]') || notif.title.includes('⚡')) {
    priority = 'important'
  }

  // Extract classroom ID from link if present
  let classroomId = ''
  const match = notif.link?.match(/\/classrooms\/([0-9a-fA-F-]{36})/)
  if (match && match[1]) {
    classroomId = match[1]
  }

  let classroomName = classroomId && classroomNameMap?.get(classroomId)
    ? classroomNameMap.get(classroomId)!
    : 'Silid-aralan'

  let cleanTitle = notif.title
    .replace(/^📢\s*/, '')
    .replace(/^🚨\s*\[Apurahan\]\s*/, '')
    .replace(/^⚡\s*\[Mahalaga\]\s*/, '')
    .trim()

  const prefixMatch = cleanTitle.match(/^Anunsyo sa (.+?):\s*(.+)$/)
  if (prefixMatch) {
    if (!classroomNameMap?.has(classroomId)) {
      classroomName = prefixMatch[1].trim()
    }
    cleanTitle = prefixMatch[2].trim()
  }

  return {
    id: notif.id,
    classroomId,
    classroomName,
    educatorName: classroomId ? educatorNameMap?.get(classroomId) : undefined,
    title: cleanTitle,
    content: notif.body || '',
    priority,
    created_at: notif.created_at,
    rawNotifTitle: notif.title
  }
}

export function mergeAnnouncements(
  tableRows: Array<{
    id: string
    classroom_id: string
    title: string
    content: string
    priority?: string
    created_at: string
  }>,
  notifRows: Array<{
    id: string
    title: string
    body: string | null
    link: string | null
    created_at: string
  }>,
  classroomNameMap: Map<string, string>,
  educatorNameMap?: Map<string, string>
): AnnouncementItem[] {
  const results: AnnouncementItem[] = []
  const seenKeys = new Set<string>()

  for (const row of tableRows) {
    const cName = classroomNameMap.get(row.classroom_id) || 'Silid-aralan'
    const key = `${row.classroom_id}|${row.title.trim().toLowerCase()}|${row.content.trim().toLowerCase()}`
    seenKeys.add(key)
    results.push({
      id: row.id,
      classroomId: row.classroom_id,
      classroomName: cName,
      educatorName: educatorNameMap?.get(row.classroom_id),
      title: row.title,
      content: row.content,
      priority: (row.priority as AnnouncementPriority) || 'normal',
      created_at: row.created_at
    })
  }

  for (const n of notifRows) {
    const parsed = parseAnnouncementFromNotification(n, classroomNameMap, educatorNameMap)
    if (!parsed) continue
    const key = `${parsed.classroomId}|${parsed.title.trim().toLowerCase()}|${parsed.content.trim().toLowerCase()}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    results.push(parsed)
  }

  return results.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}
