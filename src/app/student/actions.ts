'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function joinClassroom(formData: FormData) {
  const code = formData.get('code') as string
  if (!code) return { error: 'Code is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // 1. Find classroom by code
  const { data: classroom, error: classroomError } = await supabase
    .from('classrooms')
    .select('id, name, educator_id, enrollment_limit')
    .eq('enrollment_code', code.trim().toUpperCase())
    .single()

  if (classroomError || !classroom) {
    return { error: 'Invalid enrollment code' }
  }

  // 2. Check if already enrolled
  const { data: existingMember } = await supabase
    .from('classroom_members')
    .select('joined_at')
    .eq('classroom_id', classroom.id)
    .eq('student_id', user.id)
    .single()

  if (existingMember) {
    return { success: true, classroomId: classroom.id }
  }

  // 3. Check limit
  const { count } = await supabase
    .from('classroom_members')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', classroom.id)

  if (count !== null && classroom.enrollment_limit && count >= classroom.enrollment_limit) {
    return { error: 'Classroom is full' }
  }

  // 4. Join
  const { error: joinError } = await supabase
    .from('classroom_members')
    .insert({
      classroom_id: classroom.id,
      student_id: user.id
    })

  if (joinError) return { error: 'Failed to join classroom' }

  // 5. Notify educator and student
  try {
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const studentName = studentProfile?.full_name || 'Isang mag-aaral'
    const notifs: Array<{
      user_id: string
      title: string
      body: string
      link: string
      is_read: boolean
    }> = [
      {
        user_id: user.id,
        title: `🏫 Nakasali sa ${classroom.name}`,
        body: `Maligayang pagdating sa silid-aralang "${classroom.name}"! Maaari mo nang makita ang mga pagsusulit at anunsyo.`,
        link: `/student/classrooms/${classroom.id}`,
        is_read: false
      }
    ]

    if (classroom.educator_id) {
      notifs.push({
        user_id: classroom.educator_id,
        title: `👋 Bagong Mag-aaral sa ${classroom.name}`,
        body: `Sumali si ${studentName} sa iyong silid-aralang "${classroom.name}".`,
        link: `/educator/classrooms/${classroom.id}`,
        is_read: false
      })
    }

    await supabase.from('notifications').insert(notifs)
  } catch (err) {
    console.warn('Error creating classroom join notifications:', err)
  }

  revalidatePath('/student')
  revalidatePath('/student/notifications')
  revalidatePath('/educator/notifications')
  revalidatePath(`/student/classrooms/${classroom.id}`)
  revalidatePath(`/educator/classrooms/${classroom.id}`)
  return { success: true, classroomId: classroom.id }
}
