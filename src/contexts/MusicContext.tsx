'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export interface MusicTrack {
  id: 'playful' | 'quiz'
  nameFil: string
  nameEn: string
  descFil: string
  descEn: string
  src: string
  bpm: number
}

export const TRACKS: Record<'playful' | 'quiz', MusicTrack> = {
  playful: {
    id: 'playful',
    nameFil: 'Masayang Laro',
    nameEn: 'Playful Adventure',
    descFil: 'Masiglang chiptune para sa masayang pag-aaral',
    descEn: 'Cheerful 8-bit chiptune for fun learning',
    src: '/audio/chiptune-playful.wav',
    bpm: 126
  },
  quiz: {
    id: 'quiz',
    nameFil: 'Bilis-Isip',
    nameEn: 'Brain Sprint',
    descFil: 'Mabilis na chiptune para sa pagsusulit',
    descEn: 'Fast-paced 8-bit battle chiptune for quizzes',
    src: '/audio/chiptune-quiz.wav',
    bpm: 144
  }
}

interface MusicContextType {
  isPlaying: boolean
  isMuted: boolean
  volume: number
  currentTrackId: 'playful' | 'quiz'
  currentTrack: MusicTrack
  autoQuizMode: boolean
  isQuizRoute: boolean
  hasInteracted: boolean
  togglePlay: () => void
  toggleMute: () => void
  setVolume: (vol: number) => void
  setTrack: (trackId: 'playful' | 'quiz') => void
  setAutoQuizMode: (enabled: boolean) => void
}

const MusicContext = createContext<MusicContextType | undefined>(undefined)

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolumeState] = useState(0.35)
  const [currentTrackId, setCurrentTrackId] = useState<'playful' | 'quiz'>('playful')
  const [autoQuizMode, setAutoQuizModeState] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)

  // Identify quiz / battle / live session routes
  const isQuizRoute = Boolean(
    pathname && (
      pathname.includes('/quiz/') ||
      pathname.includes('/practice/') ||
      pathname.includes('/live/')
    )
  )

  // Initialize HTML Audio element and load preferences from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const audio = new Audio()
    audio.loop = true
    audio.preload = 'auto'
    audioRef.current = audio

    // Restore saved settings
    const savedVol = localStorage.getItem('gramatek_bgm_volume')
    if (savedVol !== null) {
      const parsed = parseFloat(savedVol)
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        setVolumeState(parsed)
        audio.volume = parsed
      }
    } else {
      audio.volume = 0.35
    }

    const savedMuted = localStorage.getItem('gramatek_bgm_muted')
    if (savedMuted === 'true') {
      setIsMuted(true)
      audio.muted = true
    }

    const savedAuto = localStorage.getItem('gramatek_bgm_auto_quiz')
    if (savedAuto !== null) {
      setAutoQuizModeState(savedAuto === 'true')
    }

    // Default starting track
    const initialTrack = isQuizRoute ? 'quiz' : 'playful'
    setCurrentTrackId(initialTrack)
    audio.src = TRACKS[initialTrack].src

    // If user previously left music enabled, start playing on first user gesture
    const wasEnabled = localStorage.getItem('gramatek_bgm_enabled') === 'true'
    const handleFirstGesture = () => {
      setHasInteracted(true)
      if (wasEnabled && audioRef.current && audioRef.current.paused) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {})
      }
      window.removeEventListener('pointerdown', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
    }

    window.addEventListener('pointerdown', handleFirstGesture, { once: true })
    window.addEventListener('keydown', handleFirstGesture, { once: true })

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Handle route-based track switching (autoQuizMode)
  useEffect(() => {
    if (!autoQuizMode || !audioRef.current) return

    const targetTrackId: 'playful' | 'quiz' = isQuizRoute ? 'quiz' : 'playful'

    if (currentTrackId !== targetTrackId) {
      setCurrentTrackId(targetTrackId)
      const audio = audioRef.current
      const shouldKeepPlaying = !audio.paused

      audio.src = TRACKS[targetTrackId].src
      audio.load()

      if (shouldKeepPlaying) {
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(() => {})
      }
    }
  }, [pathname, isQuizRoute, autoQuizMode, currentTrackId])

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    setHasInteracted(true)
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      localStorage.setItem('gramatek_bgm_enabled', 'false')
    } else {
      if (!audio.src || audio.src === '') {
        audio.src = TRACKS[currentTrackId].src
      }
      audio.play()
        .then(() => {
          setIsPlaying(true)
          localStorage.setItem('gramatek_bgm_enabled', 'true')
        })
        .catch((err) => {
          console.warn('Autoplay blocked or audio error:', err)
        })
    }
  }, [isPlaying, currentTrackId])

  // Mute / Unmute toggle
  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    const nextMuted = !isMuted
    audio.muted = nextMuted
    setIsMuted(nextMuted)
    localStorage.setItem('gramatek_bgm_muted', String(nextMuted))
  }, [isMuted])

  // Volume setter
  const setVolume = useCallback((val: number) => {
    const audio = audioRef.current
    const clamped = Math.max(0, Math.min(1, val))
    setVolumeState(clamped)
    if (audio) {
      audio.volume = clamped
      if (clamped === 0) {
        audio.muted = true
        setIsMuted(true)
      } else if (isMuted) {
        audio.muted = false
        setIsMuted(false)
      }
    }
    localStorage.setItem('gramatek_bgm_volume', String(clamped))
  }, [isMuted])

  // Track switcher
  const setTrack = useCallback((trackId: 'playful' | 'quiz') => {
    const audio = audioRef.current
    if (!audio) return

    setCurrentTrackId(trackId)
    const shouldKeepPlaying = isPlaying

    audio.src = TRACKS[trackId].src
    audio.load()

    if (shouldKeepPlaying) {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => {})
    }
  }, [isPlaying])

  // Auto Quiz Mode toggle
  const setAutoQuizMode = useCallback((enabled: boolean) => {
    setAutoQuizModeState(enabled)
    localStorage.setItem('gramatek_bgm_auto_quiz', String(enabled))
  }, [])

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        isMuted,
        volume,
        currentTrackId,
        currentTrack: TRACKS[currentTrackId],
        autoQuizMode,
        isQuizRoute,
        hasInteracted,
        togglePlay,
        toggleMute,
        setVolume,
        setTrack,
        setAutoQuizMode,
      }}
    >
      {children}
    </MusicContext.Provider>
  )
}

export function useMusic() {
  const ctx = useContext(MusicContext)
  if (!ctx) {
    throw new Error('useMusic must be used within a MusicProvider')
  }
  return ctx
}
