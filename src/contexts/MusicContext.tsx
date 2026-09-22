'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export type TrackId = 'playful' | 'quiz' | 'calm' | 'melancholic' | 'cozy' | 'jazz' | 'rainy' | 'mystery'

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
  jazz: {
    id: 'jazz',
    nameFil: 'Kapihan sa Hatinggabi',
    nameEn: 'Midnight Café Jazz',
    descFil: 'Swung jazz chords, walking upright bass, vibraphone, at brushed drums',
    descEn: 'Smooth jazz chords, walking upright bass, vibraphone, and brushed drums',
    genreFil: 'Café Jazz',
    genreEn: 'Café Jazz',
    src: '/audio/jazz-cafe.wav',
    bpm: 84,
    themeColor: 'amber'
  },
  mystery: {
    id: 'mystery',
    nameFil: 'Mahiwagang Pagsisiyasat',
    nameEn: 'Mystery Investigation',
    descFil: 'Pizzicato strings, ticking clock, at noir detective melody para sa pagtuklas ng misteryo',
    descEn: 'Pizzicato strings, ticking clock rhythm, and noir detective mystery motifs',
    genreFil: 'Misteryo / Detective',
    genreEn: 'Mystery Noir',
    src: '/audio/mystery-detective.wav',
    bpm: 80,
    themeColor: 'slate'
  },
  rainy: {
    id: 'rainy',
    nameFil: 'Huni ng Ulan',
    nameEn: 'Rainy Afternoon Study',
    descFil: 'Fingerpicked nylon guitar, banayad na patak ng ulan, at malumanay na piano',
    descEn: 'Fingerpicked nylon guitar, soothing rain ambience, and gentle felt piano',
    genreFil: 'Cozy Rain',
    genreEn: 'Cozy Rain',
    src: '/audio/cozy-rain.wav',
    bpm: 72,
    themeColor: 'teal'
  },
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
  const lastRegularTrackRef = useRef<TrackId>('jazz')

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolumeState] = useState(0.35)
  const [currentTrackId, setCurrentTrackId] = useState<TrackId>('jazz')
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

    // Restore chosen track or default to Midnight Café Jazz
    const savedTrack = localStorage.getItem('gramatek_bgm_track') as TrackId
    const validTrack: TrackId = (savedTrack && TRACKS[savedTrack]) ? savedTrack : 'jazz'
    lastRegularTrackRef.current = validTrack !== 'quiz' ? validTrack : 'jazz'

    const initialTrack = isQuizRoute ? 'quiz' : validTrack
    setCurrentTrackId(initialTrack)
    audio.src = TRACKS[initialTrack].src

    // Autoplay logic: Enabled by default unless explicitly disabled by user
    const isEnabled = localStorage.getItem('gramatek_bgm_enabled') !== 'false'

    const cleanupGestureListeners = () => {
      window.removeEventListener('pointerdown', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
      window.removeEventListener('touchstart', handleFirstGesture)
      window.removeEventListener('scroll', handleFirstGesture)
    }

    const handleFirstGesture = () => {
      setHasInteracted(true)
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {})
      }
      cleanupGestureListeners()
    }

    if (isEnabled) {
      // 1. Try to play immediately as soon as page loads
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
            setHasInteracted(true)
          })
          .catch(() => {
            // Autoplay restricted by browser before user gesture:
            // Register immediate unlock listeners on any first user touch/click/scroll/key
            window.addEventListener('pointerdown', handleFirstGesture, { once: true })
            window.addEventListener('keydown', handleFirstGesture, { once: true })
            window.addEventListener('touchstart', handleFirstGesture, { once: true })
            window.addEventListener('scroll', handleFirstGesture, { once: true })
          })
      }
    } else {
      // If user had explicitly muted/paused, still attach interaction listener for when they want to play
      window.addEventListener('pointerdown', () => setHasInteracted(true), { once: true })
    }

    return () => {
      cleanupGestureListeners()
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
        currentTrack: TRACKS[currentTrackId] || TRACKS.jazz,
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
