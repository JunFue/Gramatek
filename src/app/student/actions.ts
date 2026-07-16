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
    .select('id, enrollment_limit')
    .eq('enrollment_code', code.toUpperCase())
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
    return { error: 'You are already in this classroom' }
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

  revalidatePath('/student')
  return { success: true }
}
