import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // Resolve accurate public origin (especially on Vercel / serverless reverse proxies)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${proto}://${host}`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check user profile role
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!profile || !profile.role) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
        
        if (profile.role === 'educator') {
          return NextResponse.redirect(`${origin}/educator`)
        } else {
          return NextResponse.redirect(`${origin}/student`)
        }
      }
    } else {
      console.error('Error exchanging code for session in callback:', error)
    }
  }

  // If code exchange failed or no code was provided
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
