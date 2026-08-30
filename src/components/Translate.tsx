'use client'

import { useLanguage } from './Providers'

interface TranslateProps {
  fil: React.ReactNode
  en: React.ReactNode
}

export function Translate({ fil, en }: TranslateProps) {
  const { lang } = useLanguage()
  return <>{lang === 'fil' ? fil : en}</>
}
