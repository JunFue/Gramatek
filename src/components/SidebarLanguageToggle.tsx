'use client'

import { Languages } from 'lucide-react'
import { useLanguage } from './Providers'
import { Translate } from '@/components/Translate'

interface SidebarLanguageToggleProps {
  isCollapsed?: boolean
}

export function SidebarLanguageToggle({ isCollapsed = false }: SidebarLanguageToggleProps) {
  const { lang, setLang } = useLanguage()

  const toggleLanguage = () => {
    setLang(lang === 'fil' ? 'en' : 'fil')
  }

  return (
    <div className="relative mx-4">
      <button
        onClick={toggleLanguage}
        className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all group font-extrabold hover:bg-white/10 text-white/70 hover:text-white ${
          isCollapsed ? 'px-0 justify-center' : 'px-4'
        }`}
        title={isCollapsed ? `Wika: ${lang.toUpperCase()}` : undefined}
      >
        <Languages className="w-6 h-6 shrink-0 transition-transform group-hover:rotate-12" />
        
        {!isCollapsed && (
          <div className="flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap">
            <span><Translate fil="Wika" en="Language" /></span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
              {lang === 'fil' ? 'FIL 🇵🇭' : 'EN 🇺🇸'}
            </span>
          </div>
        )}
      </button>
    </div>
  )
}
