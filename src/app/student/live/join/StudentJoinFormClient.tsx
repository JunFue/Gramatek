'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, AlertCircle, Loader2, BookOpen } from 'lucide-react'
import { Translate } from '@/components/Translate'
import { createClient } from '@/lib/supabase/client'

interface StudentJoinFormClientProps {
  classrooms: Array<{
    id: string
    name: string
    enrollment_code: string
  }>
}

export function StudentJoinFormClient({ classrooms }: StudentJoinFormClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(classrooms[0]?.id || '')
  const [sessionCode, setSessionCode] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleJoinByClassroom = async () => {
    if (!selectedClassroomId) return
    setError(null)

    startTransition(async () => {
      try {
        // Find latest active live session for this classroom
        const { data: session, error: sErr } = await supabase
          .from('live_sessions')
          .select('id, status')
          .eq('classroom_id', selectedClassroomId)
          .neq('status', 'ended')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sErr) throw sErr
        if (!session) {
          setError('Walang aktibong Live Session sa silid-aralang ito sa ngayon.')
          return
        }

        router.push(`/student/classrooms/${selectedClassroomId}/live/${session.id}`)
      } catch (err: any) {
        setError(err?.message || 'Nabigo sa paghahanap ng live session.')
      }
    })
  }

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionCode.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        // Find classroom by enrollment code
        const { data: classroom, error: cErr } = await supabase
          .from('classrooms')
          .select('id')
          .eq('enrollment_code', sessionCode.trim())
          .maybeSingle()

        if (cErr || !classroom) {
          setError('Hindi wastong kodigo ng silid-aralan.')
          return
        }

        // Find active live session
        const { data: session } = await supabase
          .from('live_sessions')
          .select('id')
          .eq('classroom_id', classroom.id)
          .neq('status', 'ended')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!session) {
          setError('Walang aktibong Live Session sa silid-aralang ito sa ngayon.')
          return
        }

        router.push(`/student/classrooms/${classroom.id}/live/${session.id}`)
      } catch (err: any) {
        setError(err?.message || 'Nabigo sa pagsali.')
      }
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link
        href="/student"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary font-bold transition-colors text-xs sm:text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <Translate fil="Bumalik sa Dashboard" en="Back to Dashboard" />
      </Link>

      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-xl space-y-5 sm:space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center mx-auto shadow-sm">
            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-brand-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-black text-slate-900">
            <Translate fil="Sumali sa Live Session" en="Join Live Session" />
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            <Translate
              fil="Pumili ng iyong silid-aralan o ilagay ang kodigo para makasali sa live na laro."
              en="Select your classroom or enter the enrollment code to join the live session."
            />
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Option 1: Select enrolled classroom */}
        {classrooms.length > 0 && (
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <label className="text-xs font-black text-slate-700 block">
              <Translate fil="Pumili sa Iyong mga Silid-aralan" en="Select Enrolled Classroom" />
            </label>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-extrabold text-sm focus:outline-none focus:border-brand-primary"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.enrollment_code})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={isPending || !selectedClassroomId}
              onClick={handleJoinByClassroom}
              className="w-full py-3 bg-brand-primary hover:bg-brand-secondary text-white font-black rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Translate fil="Sumali sa Live Session ➔" en="Join Live Session ➔" />
            </button>
          </div>
        )}

        <div className="relative flex py-2 items-center">
          <div className="grow border-t border-slate-200"></div>
          <span className="shrink mx-4 text-xs font-bold text-slate-400 uppercase">O kaya</span>
          <div className="grow border-t border-slate-200"></div>
        </div>

        {/* Option 2: Enter code */}
        <form onSubmit={handleJoinByCode} className="space-y-3">
          <label className="text-xs font-black text-slate-700 block">
            <Translate fil="Ilagay ang Kodigo ng Silid-aralan" en="Enter Classroom Code" />
          </label>
          <input
            type="text"
            placeholder="Hal. FIL-101"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-mono font-black text-center text-lg tracking-widest uppercase focus:outline-none focus:border-brand-primary"
          />

          <button
            type="submit"
            disabled={isPending || !sessionCode.trim()}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <Translate fil="Maghanap at Sumali" en="Find & Join" />
          </button>
        </form>
      </div>
    </div>
  )
}
