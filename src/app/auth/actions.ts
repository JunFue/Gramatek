'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    console.error('Error signing in:', error.message)
    redirect(`/?error=${encodeURIComponent(error.message)}`)
  }

  if (data.url) {
    redirect(data.url) // Navigate to the Google OAuth page
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function setUserRole(role: 'educator' | 'learner') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Update the user's role in the profiles table
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating role:', error.message)
    redirect(`/?error=${encodeURIComponent(error.message)}`)
  }

  // Redirect based on the chosen role
  if (role === 'educator') {
    redirect('/educator')
  } else {
    redirect('/student')
  }
}
