'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export type TrackId = 'playful' | 'quiz' | 'calm' | 'joyful' | 'melancholic' | 'cozy'

export interface MusicTrack {
  id: TrackId
  nameFil: string
  nameEn: string
  descFil: string
  descEn: string
  genreFil: string
  genreEn: string
  src: string
  bpm: number
  themeColor: string
}

export const TRACKS: Record<TrackId, MusicTrack> = {
  calm: {
    id: 'calm',
    nameFil: 'Payapang Pag-aaral',
    nameEn: 'Calm Study Beats',
    descFil: 'Kalmadong Lo-Fi jazz chords at banayad na tambol para sa konsentrasyon',
    descEn: 'Relaxing Lo-Fi jazz chords and soft beats for deep focus',
    genreFil: 'Lo-Fi Study',
    genreEn: 'Lo-Fi Chill',
    src: '/audio/lofi-calm.wav',
    bpm: 78,
    themeColor: 'emerald'
  },
  joyful: {
    id: 'joyful',
    nameFil: 'Masiglang Umaga',
    nameEn: 'Sunny Joy',
    descFil: 'Masayang marimba, acoustic plucks, at sumisipol na plawta para sa magandang simula',
    descEn: 'Cheerful acoustic marimba, plucks, and whistle flute for uplifting vibes',
    genreFil: 'Acoustic Folk',
    genreEn: 'Acoustic Joy',
    src: '/audio/acoustic-joyful.wav',
    bpm: 116,
    themeColor: 'amber'
  },
  melancholic: {
    id: 'melancholic',
    nameFil: 'Pagninilay-nilay',
    nameEn: 'Reflections',
    descFil: 'Madramang acoustic piano, ambient strings, at banayad na pagninilay',
    descEn: 'Emotional acoustic piano, ambient strings, and gentle contemplation',
    genreFil: 'Melancholic Piano',
    genreEn: 'Ambient Piano',
    src: '/audio/piano-melancholic.wav',
    bpm: 70,
    themeColor: 'rose'
  },
  cozy: {
    id: 'cozy',
    nameFil: 'Tahimik na Gabi',
    nameEn: 'Cozy Dreamscape',
    descFil: 'Music box bells, maaliwalas na ambient pads, at pampakalmang himig',
    descEn: 'Music box bells, warm atmospheric synth pads, and soothing night tones',
    genreFil: 'Ambient Dream',
    genreEn: 'Dreamy Ambient',
    src: '/audio/ambient-cozy.wav',
    bpm: 84,
    themeColor: 'purple'
  },
  playful: {
    id: 'playful',
    nameFil: 'Masayang Laro',
    nameEn: 'Playful Adventure',
    descFil: 'Masiglang 8-bit chiptune para sa masayang pag-aaral',
    descEn: 'Cheerful 8-bit chiptune for fun retro gamified learning',
    genreFil: '8-Bit Chiptune',
    genreEn: '8-Bit Chiptune',
    src: '/audio/chiptune-playful.wav',
    bpm: 126,
    themeColor: 'sky'
  },
  quiz: {
    id: 'quiz',
    nameFil: 'Bilis-Isip',
    nameEn: 'Brain Sprint',
    descFil: 'Mabilis at maaksyong chiptune battle para sa pagsusulit',
    descEn: 'Fast-paced high-energy battle chiptune for quiz countdowns',
    genreFil: 'Quiz Battle',
    genreEn: 'Quiz Battle',
    src: '/audio/chiptune-quiz.wav',
    bpm: 144,
    themeColor: 'indigo'
  }
}

interface MusicContextType {
  isPlaying: boolean
  isMuted: boolean
  volume: number
  currentTrackId: TrackId
  currentTrack: MusicTrack
  autoQuizMode: boolean
  isQuizRoute: boolean
  hasInteracted: boolean
  togglePlay: () => void
  toggleMute: () => void
  setVolume: (vol: number) => void
  setTrack: (trackId: TrackId) => void
  setAutoQuizMode: (enabled: boolean) => void
}

const MusicContext = createContext<MusicContextType | undefined>(undefined)

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastRegularTrackRef = useRef<TrackId>('playful')

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolumeState] = useState(0.35)
  const [currentTrackId, setCurrentTrackId] = useState<TrackId>('playful')
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

    // Restore chosen track or default
    const savedTrack = localStorage.getItem('gramatek_bgm_track') as TrackId
    const validTrack: TrackId = (savedTrack && TRACKS[savedTrack]) ? savedTrack : 'playful'
    lastRegularTrackRef.current = validTrack !== 'quiz' ? validTrack : 'playful'

    const initialTrack = isQuizRoute ? 'quiz' : validTrack
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

    const targetTrackId: TrackId = isQuizRoute ? 'quiz' : lastRegularTrackRef.current

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
  const setTrack = useCallback((trackId: TrackId) => {
    const audio = audioRef.current
    if (!audio || !TRACKS[trackId]) return

    setCurrentTrackId(trackId)
    if (trackId !== 'quiz') {
      lastRegularTrackRef.current = trackId
    }
    localStorage.setItem('gramatek_bgm_track', trackId)

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
        currentTrack: TRACKS[currentTrackId] || TRACKS.playful,
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
