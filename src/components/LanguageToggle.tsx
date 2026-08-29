'use client'

import { Languages } from 'lucide-react'
import { useLanguage } from './Providers'

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  const toggleLanguage = () => {
    setLang(lang === 'fil' ? 'en' : 'fil')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-extrabold text-xs shadow-sm hover:scale-105 transition-all"
      title="Switch Language / Magpalit ng Wika"
    >
      <Languages className="w-3.5 h-3.5 text-brand-secondary" />
      <span>{lang === 'fil' ? 'FIL 🇵🇭' : 'EN 🇺🇸'}</span>
    </button>
  )
}
