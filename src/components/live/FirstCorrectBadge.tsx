'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'
import { Translate } from '@/components/Translate'

interface FirstCorrectBadgeProps {
  sessionId: string
  questionId: string
}

interface FirstCorrectResult {
  name: string
  response_ms: number
  avatar_url?: string | null
  is_group?: boolean
}

export function FirstCorrectBadge({ sessionId, questionId }: FirstCorrectBadgeProps) {
  const [firstCorrect, setFirstCorrect] = useState<FirstCorrectResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!sessionId || !questionId) return

    let isMounted = true
    const supabase = createClient()

    async function fetchFirstCorrect() {
      try {
        const { data, error } = await supabase
          .from('live_session_answers')
          .select(`
            response_ms,
            is_correct,
            student_id,
            group_id,
            submitted_at,
            profiles ( full_name, avatar_url ),
            live_session_groups ( label )
          `)
          .eq('session_id', sessionId)
          .eq('question_id', questionId)
          .eq('is_correct', true)
          .order('submitted_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (!error && data && isMounted) {
          const row = data as unknown as {
            response_ms: number
            group_id: string | null
            profiles?: { full_name: string | null; avatar_url: string | null } | Array<{ full_name: string | null; avatar_url: string | null }> | null
            live_session_groups?: { label: string } | Array<{ label: string }> | null
          }

          const profileObj = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
          const groupObj = Array.isArray(row.live_session_groups) ? row.live_session_groups[0] : row.live_session_groups

          const name = row.group_id
            ? groupObj?.label || 'Pangkat'
            : profileObj?.full_name || 'Mag-aaral'

          setFirstCorrect({
            name,
            response_ms: row.response_ms,
            avatar_url: profileObj?.avatar_url || null,
            is_group: Boolean(row.group_id)
          })
        } else if (isMounted) {
          setFirstCorrect(null)
        }
      } catch (err) {
        console.error('Error fetching first correct badge:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchFirstCorrect()

    return () => {
      isMounted = false
    }
  }, [sessionId, questionId])

  if (loading || !firstCorrect) return null

  return (
    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-linear-to-r from-amber-400 to-yellow-500 text-slate-900 rounded-2xl shadow-lg border border-amber-300 font-extrabold animate-bounce">
      <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-amber-600 shadow-xs">
        <Zap className="w-4 h-4 fill-amber-500" />
      </div>
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-950/80">
          <Translate fil="⚡ Unang Tamang Sagot!" en="⚡ First Correct Answer!" />
        </span>
        <span className="text-sm font-black text-slate-950">
          {firstCorrect.name} ({Math.round(firstCorrect.response_ms / 100) / 10}s)
        </span>
      </div>
    </div>
  )
}
