import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { sessionId, reason = 'host_disconnected' } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Attempt RPC first
    const { data: rpcData, error: rpcErr } = await supabase.rpc('pause_live_session', {
      p_session_id: sessionId,
      p_reason: reason
    })

    if (rpcErr) {
      // Direct table fallback if RPC is not yet in schema cache
      const { error: updateErr } = await supabase
        .from('live_sessions')
        .update({
          is_paused: true,
          paused_at: new Date().toISOString(),
          pause_reason: reason
        })
        .eq('id', sessionId)
        .neq('status', 'ended')

      if (updateErr) {
        console.error('Failed to pause session fallback:', updateErr)
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, is_paused: true })
  } catch (err: any) {
    console.error('Error in /api/live/pause:', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}
