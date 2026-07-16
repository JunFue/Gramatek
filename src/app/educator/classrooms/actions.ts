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
  
  // Basic retry logic for unique constraint on enrollment code (highly unlikely collision but good practice)
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
      // Success
      revalidatePath('/educator/classrooms')
      revalidatePath('/educator')
      redirect(`/educator/classrooms/${data.id}`)
      return
    }

    if (error && error.code === '23505') { // Unique violation
      code = generateEnrollmentCode()
      attempts++
    } else {
      console.error('Error creating classroom:', error)
      throw new Error('Failed to create classroom')
    }
  }

  throw new Error('Could not generate unique enrollment code')
}
