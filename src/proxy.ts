import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  try {
    // If request lands on root with ?code=, redirect to /auth/callback
    if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
      const code = request.nextUrl.searchParams.get('code')!
      const callbackUrl = request.nextUrl.clone()
      callbackUrl.pathname = '/auth/callback'
      callbackUrl.searchParams.set('code', code)
      return NextResponse.redirect(callbackUrl)
    }

    const { supabaseResponse, user } = await updateSession(request)

    const isProtectedPath = 
      request.nextUrl.pathname.startsWith('/educator') ||
      request.nextUrl.pathname.startsWith('/student') ||
      request.nextUrl.pathname.startsWith('/onboarding')

    if (isProtectedPath && !user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware proxy uncaught error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

