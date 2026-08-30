'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Translate } from '@/components/Translate'

export function SignInButton({ 
  className = "btn-outline text-sm px-5 py-2",
  textFil = "Mag-sign In",
  textEn = "Sign In"
}: { 
  className?: string
  textFil?: string
  textEn?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button 
      type="submit" 
      disabled={pending}
      className={`${className} flex items-center justify-center gap-2 disabled:opacity-60 transition-all cursor-pointer`}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span><Translate fil="Kumokonekta..." en="Connecting..." /></span>
        </>
      ) : (
        <Translate fil={textFil} en={textEn} />
      )}
    </button>
  )
}
