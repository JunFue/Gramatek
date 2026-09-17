'use client'

import React, { createContext, useContext, useState, useEffect, Suspense } from 'react'
import { MusicProvider } from '@/contexts/MusicContext'
import { FloatingMusicPlayer } from '@/components/FloatingMusicPlayer'

export type Language = 'fil' | 'en'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (fil: string, en: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'fil',
  setLang: () => {},
  t: (fil, en) => fil,
})

export const useLanguage = () => useContext(LanguageContext)

export function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('fil')

  useEffect(() => {
    const saved = localStorage.getItem('gramatek_lang') as Language
    if (saved) {
      setLangState(saved)
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('gramatek_lang', newLang)
  }

  const t = (fil: string, en: string) => (lang === 'fil' ? fil : en)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <Suspense fallback={null}>
        <MusicProvider>
          {children}
          <FloatingMusicPlayer />
        </MusicProvider>
      </Suspense>
    </LanguageContext.Provider>
  )
}

