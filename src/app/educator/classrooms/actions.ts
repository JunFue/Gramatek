'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function generateEnrollmentCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function createClassroom(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const enrollmentLimit = parseInt(formData.get('enrollment_limit') as string) || 30
  
  let code = generateEnrollmentCode()
  let attempts = 0
  
  while (attempts < 3) {
    const { data, error } = await supabase
      .from('classrooms')
      .insert({
        educator_id: user.id,
        name,
        description,
        enrollment_limit: enrollmentLimit,
        enrollment_code: code,
        is_active: true
      })
      .select('id')
      .single()

    if (!error && data) {
      revalidatePath('/educator/classrooms')
      revalidatePath('/educator')
      redirect(`/educator/classrooms/${data.id}`)
      return
    }

    if (error && error.code === '23505') {
      code = generateEnrollmentCode()
      attempts++
    } else {
      console.error('Error creating classroom:', error)
      throw new Error('Failed to create classroom')
    }
  }

  throw new Error('Could not generate unique enrollment code')
}

export async function updateClassroomDetails(classroomId: string, data: {
  name: string
  description?: string
  enrollment_limit: number
  is_active: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Kailangan munang mag-sign in.' }
  }

  const { error } = await supabase
    .from('classrooms')
    .update({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      enrollment_limit: data.enrollment_limit,
      is_active: data.is_active,
    })
    .eq('id', classroomId)
    .eq('educator_id', user.id)

  if (error) {
    console.error('Error updating classroom:', error)
    return { error: error.message || 'Hindi na-update ang silid-aralan.' }
  }

  revalidatePath(`/educator/classrooms/${classroomId}`)
  revalidatePath('/educator/classrooms')
  return { success: true }
}

export async function regenerateClassroomCode(classroomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Kailangan munang mag-sign in.' }
  }

  let attempts = 0
  let newCode = generateEnrollmentCode()

  while (attempts < 5) {
    const { error } = await supabase
      .from('classrooms')
      .update({ enrollment_code: newCode })
      .eq('id', classroomId)
      .eq('educator_id', user.id)

    if (!error) {
      revalidatePath(`/educator/classrooms/${classroomId}`)
      return { success: true, newCode }
    }

    if (error.code === '23505') {
      newCode = generateEnrollmentCode()
      attempts++
    } else {
      return { error: error.message || 'Hindi nabago ang kodigo.' }
    }
  }

  return { error: 'Hindi nakabuo ng natatanging kodigo. Pakisubukan muli.' }
}

export async function kickStudentFromClassroom(classroomId: string, studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Kailangan munang mag-sign in.' }
  }

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('id', classroomId)
    .eq('educator_id', user.id)
    .single()

  if (!classroom) {
    return { error: 'Hindi nahanap ang silid-aralan o wala kang pahintulot.' }
  }

  const { error: deleteError } = await supabase
    .from('classroom_members')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)

  if (deleteError) {
    console.error('Error removing student:', deleteError)
    return { error: 'Hindi maalis ang mag-aaral: ' + deleteError.message }
  }

  try {
    await supabase.from('notifications').insert({
      user_id: studentId,
      title: 'Paunawa mula sa Silid-aralan',
      body: `Ikaw ay inalis ng guro mula sa silid-aralang "${classroom.name}".`,
      link: '/student',
      is_read: false
    })
  } catch (err) {
    console.error('Failed to notify kicked student:', err)
  }

  revalidatePath(`/educator/classrooms/${classroomId}`)
  return { success: true }
}

export async function giveStudentStar(classroomId: string, studentId: string, customMessage?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Kailangan munang mag-sign in.' }
  }

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('id', classroomId)
    .eq('educator_id', user.id)
    .single()

  if (!classroom) {
    return { error: 'Hindi nahanap ang silid-aralan o wala kang pahintulot.' }
  }

  const starReason = customMessage?.trim() || 'Napakahusay na partisipasyon at aktibong pag-aaral!'

  const { error } = await supabase.from('notifications').insert({
    user_id: studentId,
    title: `🌟 Bituin ng Pagkilala sa ${classroom.name}!`,
    body: `Iginawad ng iyong guro: "${starReason}"`,
    link: `/student/classrooms/${classroomId}`,
    is_read: false
  })

  if (error) {
    console.error('Error giving star notification:', error)
    return { error: 'Hindi naipadala ang bituin: ' + error.message }
  }

  revalidatePath(`/educator/classrooms/${classroomId}`)
  return { success: true }
}

export async function giveStudentWarning(classroomId: string, studentId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Kailangan munang mag-sign in.' }
  }

  if (!reason?.trim()) {
    return { error: 'Mangyaring ilagay ang dahilan ng paalala o babala.' }
  }

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('id', classroomId)
    .eq('educator_id', user.id)
    .single()

  if (!classroom) {
    return { error: 'Hindi nahanap ang silid-aralan o wala kang pahintulot.' }
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: studentId,
    title: `⚠️ Paalala / Babala sa ${classroom.name}`,
    body: `Mensahe mula sa iyong guro: "${reason.trim()}"`,
    link: `/student/classrooms/${classroomId}`,
    is_read: false
  })

  if (error) {
    console.error('Error giving warning notification:', error)
    return { error: 'Hindi naipadala ang babala: ' + error.message }
  }

  revalidatePath(`/educator/classrooms/${classroomId}`)
  return { success: true }
}

export async function deleteClassroom(classroomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Kailangan munang mag-sign in.' }
  }

  // Verify ownership
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('id', classroomId)
    .eq('educator_id', user.id)
    .single()

  if (!classroom) {
    return { error: 'Hindi nahanap ang silid-aralan o wala kang pahintulot.' }
  }

  const { error: deleteError } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', classroomId)
    .eq('educator_id', user.id)

  if (deleteError) {
    console.error('Error deleting classroom:', deleteError)
    return { error: 'Hindi mabura ang silid-aralan: ' + deleteError.message }
  }

  revalidatePath('/educator/classrooms')
  revalidatePath('/educator')
  return { success: true }
}
