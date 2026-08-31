'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinClassroom } from '@/app/student/actions'
import { Loader2, KeyRound } from 'lucide-react'
import { Translate } from '@/components/Translate'

export function JoinClassroomForm() {
 const router = useRouter()
 const [code, setCode] = useState('')
 const [status, setStatus] = useState<{type: 'error'|'success', message: string} | null>(null)
 const [isSubmitting, setIsSubmitting] = useState(false)

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setIsSubmitting(true)
    setStatus(null)

    const formData = new FormData()
    formData.append('code', code.trim())
    
    try {
      const res = await joinClassroom(formData)
      
      if (res?.error) {
        setStatus({ type: 'error', message: res.error })
        setIsSubmitting(false)
      } else if (res?.success && res.classroomId) {
        setStatus({ type: 'success', message: 'Matagumpay na pumasok! Nireredirekta...' })
        router.push(`/student/classrooms/${res.classroomId}`)
      } else {
        setIsSubmitting(false)
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.message || 'May naganap na error sa pagsali.' })
      setIsSubmitting(false)
    }
  }

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <input
 type="text"
 value={code}
 onChange={(e) => setCode(e.target.value.toUpperCase())}
 placeholder="HAL: CLASS-1234"
 required
 disabled={isSubmitting}
 className="w-full px-4 py-3 bg-white/80 border-2 border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 font-extrabold focus:outline-none focus:border-brand-primary transition-all shadow-inner tracking-widest text-center uppercase disabled:opacity-50"
 />
 </div>

 {status?.type === 'error' && (
 <p className="text-sm font-bold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{status.message}</p>
 )}

 {status?.type === 'success' && (
 <p className="text-sm font-bold text-emerald-600 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{status.message}</p>
 )}

 <button
 type="submit"
 disabled={isSubmitting}
 className="w-full py-3.5 btn-primary rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
 >
 {isSubmitting ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 <>
 <KeyRound className="w-5 h-5" />
 <span><Translate fil="Pumaloob Na" en="Join Now" /></span>
 </>
 )}
 </button>
 </form>
 )
}
