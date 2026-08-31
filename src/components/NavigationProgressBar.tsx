'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null)

  const clearAllTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
  }

  // When pathname or searchParams change, route transition is done
  useEffect(() => {
    if (loading) {
      if (timerRef.current) clearInterval(timerRef.current)
      
      // Step 1: Animate all the way to 100% width while remaining completely visible
      setProgress(100)
      setOpacity(1)

      // Step 2: Once it reaches 100% (after 250ms), start fading out
      fadeTimerRef.current = setTimeout(() => {
        setOpacity(0)

        // Step 3: Once faded out (after 300ms), reset state
        resetTimerRef.current = setTimeout(() => {
          setLoading(false)
          setProgress(0)
          setOpacity(1)
        }, 300)
      }, 250)
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
        (href.startsWith('http') && !href.startsWith(window.location.origin))
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
      clearAllTimers()
      setOpacity(1)
      setLoading(true)
      setProgress(25)

      let current = 25
      timerRef.current = setInterval(() => {
        current += (92 - current) * 0.15 + Math.random() * 4
        if (current > 92) {
          current = 92
          if (timerRef.current) clearInterval(timerRef.current)
        }
        setProgress(current)
      }, 100)
    }

    document.addEventListener('click', handleLinkClick, { capture: true })
    window.addEventListener('gramatek-nav-start', handleCustomStart)

    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true })
      window.removeEventListener('gramatek-nav-start', handleCustomStart)
      clearAllTimers()
    }
  }, [])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none w-full h-[3px]">
      <div 
        className="h-full bg-gradient-to-r from-emerald-500 via-brand-primary to-amber-400 shadow-[0_0_10px_rgba(49,105,78,0.8),0_0_5px_rgba(234,179,8,0.6)]"
        style={{ 
          width: `${progress}%`,
          opacity: opacity,
          transition: progress === 100 
            ? 'width 250ms ease-out, opacity 300ms ease-in' 
            : 'width 200ms ease-out, opacity 150ms ease'
        }}
      />
      {/* Trailing ambient glow head */}
      {loading && opacity > 0 && progress < 100 && (
        <div 
          className="absolute top-0 w-28 h-full bg-white/70 blur-xs transition-all duration-200"
          style={{ left: `calc(${progress}% - 112px)` }}
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

