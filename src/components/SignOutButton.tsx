'use client'

import { useState, useTransition } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { signOut } from '@/app/auth/actions'
import { Translate } from '@/components/Translate'

export function SignOutButton({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <button 
      type="button" 
      onClick={handleSignOut}
      disabled={isPending}
      className={`flex items-center gap-3 py-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors group font-bold w-full disabled:opacity-50 cursor-pointer ${
        isCollapsed ? 'justify-center px-0' : 'px-4'
      }`}
      title={isCollapsed ? "Mag-sign Out" : undefined}
    >
      {isPending ? (
        <Loader2 className="w-5 h-5 animate-spin shrink-0 text-white" />
      ) : (
        <LogOut className="w-5 h-5 shrink-0" />
      )}
      {!isCollapsed && (
        <span className="whitespace-nowrap">
          {isPending ? <Translate fil="Lumalabas..." en="Signing out..." /> : <Translate fil="Mag-sign Out" en="Sign Out" />}
        </span>
      )}
    </button>
  )
}
