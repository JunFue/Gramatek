'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // When pathname or searchParams change, route transition is done
  useEffect(() => {
    if (loading) {
      setProgress(100)
      const timeout = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 250)
      return () => clearTimeout(timeout)
    }
  }, [pathname, searchParams])

  // Global link click interceptor
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Ignore hash links, external links, target="_blank", or download links
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.target === '_blank' ||
        target.hasAttribute('download') ||
        href.startsWith('http://') ||
        href.startsWith('https://') && !href.startsWith(window.location.origin)
      ) {
        return
      }

      // If navigating to the exact same full url, ignore
      const currentFullUrl = window.location.pathname + window.location.search
      if (href === currentFullUrl) return

      startProgress()
    }

    const handleCustomStart = () => {
      startProgress()
    }

    const startProgress = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      setLoading(true)
      setProgress(25)

      let current = 25
      timerRef.current = setInterval(() => {
        current += Math.random() * 15
        if (current > 88) {
          current = 88
          if (timerRef.current) clearInterval(timerRef.current)
        }
        setProgress(current)
      }, 150)
    }

    document.addEventListener('click', handleLinkClick, { capture: true })
    window.addEventListener('gramatek-nav-start', handleCustomStart)

    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true })
      window.removeEventListener('gramatek-nav-start', handleCustomStart)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div 
        className="h-1 bg-gradient-to-r from-brand-secondary via-brand-primary to-amber-400 shadow-[0_0_12px_rgba(49,105,78,0.7)] transition-all duration-200 ease-out"
        style={{ 
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: 'width, opacity'
        }}
      />
      {/* Animated glow head */}
      {loading && progress < 100 && (
        <div 
          className="absolute top-0 w-24 h-1 bg-white/60 blur-xs transition-all duration-200"
          style={{ left: `calc(${progress}% - 96px)` }}
        />
      )}
    </div>
  )
}

export function triggerNavigationProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gramatek-nav-start'))
  }
}
