'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinClassroom } from '@/app/student/actions'
import { Plus, Loader2 } from 'lucide-react'

export function JoinClassroomForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<{type: 'error'|'success', message: string} | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) return
    setIsSubmitting(true)
    setStatus(null)

    const formData = new FormData()
    formData.append('code', code)
    
    const res = await joinClassroom(formData)
    
    if (res?.error) {
      setStatus({ type: 'error', message: res.error })
    } else if (res?.success) {
       setStatus({ type: 'success', message: 'Successfully joined!' })
       setCode('')
       router.refresh() // Force re-fetch of server component data
       setTimeout(() => setStatus(null), 3000)
    }
    
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 flex flex-col">
        <input 
          type="text" 
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter 6-digit code..."
          maxLength={6}
          className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all font-mono tracking-widest uppercase"
        />
        {status && (
          <p className={`mt-2 text-sm ${status.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
            {status.message}
          </p>
        )}
      </div>
      <button 
        type="submit" 
        disabled={isSubmitting || code.length < 6}
        className="px-6 py-3 bg-brand-accent hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 shrink-0 flex items-center justify-center gap-2 h-[50px]"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
        Join Room
      </button>
    </form>
  )
}
