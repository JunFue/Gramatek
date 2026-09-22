'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Play, Pause, Volume2, Volume1, VolumeX, 
  Music, ChevronUp, ChevronDown, Zap, Gamepad2, X, SlidersHorizontal,
  Coffee, CloudRain, Moon, Sparkles, Radio, Umbrella, Search
} from 'lucide-react'
import { useMusic, TRACKS, TrackId } from '@/contexts/MusicContext'
import { useLanguage } from '@/components/Providers'

export function FloatingMusicPlayer() {
  const { 
    isPlaying, 
    isMuted, 
    volume, 
    currentTrackId, 
    currentTrack,
    autoQuizMode,
    isQuizRoute,
    togglePlay, 
    toggleMute, 
    setVolume, 
    setTrack, 
    setAutoQuizMode 
  } = useMusic()

  const { lang, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!isMounted) return null

  const trackTitle = lang === 'fil' ? currentTrack.nameFil : currentTrack.nameEn

  // Icon mapping per track
  const getTrackIcon = (id: TrackId) => {
    switch (id) {
      case 'calm':
        return <Coffee className="h-4 w-4" />
      case 'jazz':
        return <Radio className="h-4 w-4" />
      case 'mystery':
        return <Search className="h-4 w-4" />
      case 'rainy':
        return <Umbrella className="h-4 w-4" />
      case 'melancholic':
        return <CloudRain className="h-4 w-4" />
      case 'cozy':
        return <Moon className="h-4 w-4" />
      case 'playful':
        return <Gamepad2 className="h-4 w-4" />
      case 'quiz':
        return <Zap className="h-4 w-4" />
      default:
        return <Music className="h-4 w-4" />
    }
  }

  // Theme color accents for track cards
  const getThemeClasses = (id: TrackId, isSelected: boolean) => {
    switch (id) {
      case 'calm':
        return isSelected
          ? 'border-emerald-400 bg-emerald-50/90'
          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
      case 'jazz':
        return isSelected
          ? 'border-amber-400 bg-amber-50/90'
          : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'
      case 'mystery':
        return isSelected
          ? 'border-slate-500 bg-slate-100/95 ring-1 ring-slate-400/50'
          : 'border-gray-200 hover:border-slate-400 hover:bg-slate-50/50'
      case 'rainy':
        return isSelected
          ? 'border-teal-400 bg-teal-50/90'
          : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/30'
      case 'melancholic':
        return isSelected
          ? 'border-rose-400 bg-rose-50/90'
          : 'border-gray-200 hover:border-rose-300 hover:bg-rose-50/30'
      case 'cozy':
        return isSelected
          ? 'border-purple-400 bg-purple-50/90'
          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
      case 'playful':
        return isSelected
          ? 'border-sky-400 bg-sky-50/90'
          : 'border-gray-200 hover:border-sky-300 hover:bg-sky-50/30'
      case 'quiz':
        return isSelected
          ? 'border-indigo-400 bg-indigo-50/90'
          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
      default:
        return 'border-gray-200 hover:bg-gray-50'
    }
  }

  const getIconBadgeClasses = (id: TrackId, isSelected: boolean) => {
    switch (id) {
      case 'calm':
        return isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
      case 'jazz':
        return isSelected ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'
      case 'mystery':
        return isSelected ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
      case 'rainy':
        return isSelected ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'
      case 'melancholic':
        return isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
      case 'cozy':
        return isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
      case 'playful':
        return isSelected ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-700'
      case 'quiz':
        return isSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getPillBg = (id: TrackId) => {
    switch (id) {
      case 'calm': return 'bg-emerald-500'
      case 'jazz': return 'bg-amber-500'
      case 'mystery': return 'bg-slate-700'
      case 'rainy': return 'bg-teal-600'
      case 'melancholic': return 'bg-rose-500'
      case 'cozy': return 'bg-purple-600'
      case 'playful': return 'bg-sky-500'
      case 'quiz': return 'bg-indigo-600'
      default: return 'bg-amber-500'
    }
  }

  const trackList = Object.values(TRACKS)

  return (
    <div 
      ref={popupRef}
      className="fixed bottom-4 left-4 z-50 select-none font-sans print:hidden"
    >
      {/* Expanded Control Panel */}
      {isOpen && (
        <div 
          className="mb-3 w-88 max-w-[92vw] rounded-2xl border-2 border-amber-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${getPillBg(currentTrackId)} text-white shadow-sm transition-colors`}>
                <Music className="h-4 w-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 leading-tight">
                  {t('Tugtugin sa Likuran', 'Background Music')}
                </h4>
                <p className="text-[11px] font-medium text-amber-700/90">
                  {t('6 Magkakaibang Estilo at Tugtog', '6 Multi-Genre Looping Tracks')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-amber-50 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Track Selection List */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('Pumili ng Tugtog', 'Select Track')}
              </p>
              <span className="text-[10px] text-gray-400 font-medium">
                {trackList.length} {t('mga kanta', 'tracks')}
              </span>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-amber-200">
              {trackList.map((track) => {
                const isSelected = currentTrackId === track.id
                const title = lang === 'fil' ? track.nameFil : track.nameEn
                const desc = lang === 'fil' ? track.descFil : track.descEn
                const genre = lang === 'fil' ? track.genreFil : track.genreEn

                return (
                  <button
                    key={track.id}
                    onClick={() => setTrack(track.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${getThemeClasses(track.id, isSelected)} ${
                      isSelected ? 'shadow-sm ring-1 ring-amber-400/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${getIconBadgeClasses(track.id, isSelected)}`}>
                        {getTrackIcon(track.id)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-gray-800 truncate">
                            {title}
                          </span>
                          <span className="text-[9px] font-semibold text-gray-500 bg-white/80 border border-gray-200/80 px-1.5 py-0.2 rounded-md">
                            {genre}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                          {desc}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-[10px] font-bold text-gray-600 bg-white/80 border border-gray-200 px-1.5 py-0.5 rounded-md">
                        {track.bpm} BPM
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Volume Control */}
          <div className="mt-3 pt-3 border-t border-amber-100 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400" />
                {t('Lakas ng Tunog', 'Volume')}
              </span>
              <span className="font-bold text-gray-800">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleMute}
                className="text-gray-500 hover:text-amber-600 transition-colors p-1"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-red-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* Auto Quiz Switch Toggle */}
          <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between">
            <div className="pr-2">
              <label htmlFor="auto-quiz-toggle" className="text-xs font-semibold text-gray-700 block cursor-pointer">
                {t('Awtomatikong Bilis-Isip', 'Auto Quiz Mode')}
              </label>
              <p className="text-[10px] text-gray-400">
                {t('Lilipat sa mabilis na battle music kapag may pagsusulit', 'Switches to fast battle theme during quizzes')}
              </p>
            </div>
            <input
              id="auto-quiz-toggle"
              type="checkbox"
              checked={autoQuizMode}
              onChange={(e) => setAutoQuizMode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Floating Pill Button */}
      <div className="flex items-center gap-1.5 rounded-full border-2 border-amber-300/80 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-md transition-transform active:scale-95 hover:shadow-xl">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 active:scale-90 ${
            isPlaying ? getPillBg(currentTrackId) : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
          title={isPlaying ? t('Ihinto', 'Pause') : t('Patugtugin', 'Play')}
          aria-label={isPlaying ? 'Pause Background Music' : 'Play Background Music'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        {/* Dancing Visualizer / Track info */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-1 text-left group"
        >
          {/* Animated Equalizer Bars */}
          <div className="flex items-end gap-0.5 h-4 w-4 px-0.5" title="Audio Visualizer">
            <div 
              className={`w-1 rounded-sm transition-all duration-150 ${
                isPlaying && !isMuted 
                  ? `${getPillBg(currentTrackId)} animate-[pulse_0.4s_ease-in-out_infinite_alternate] h-3` 
                  : 'bg-gray-300 h-1.5'
              }`} 
            />
            <div 
              className={`w-1 rounded-sm transition-all duration-150 ${
                isPlaying && !isMuted 
                  ? `${getPillBg(currentTrackId)} animate-[pulse_0.6s_ease-in-out_infinite_alternate] h-4` 
                  : 'bg-gray-300 h-2.5'
              }`} 
            />
            <div 
              className={`w-1 rounded-sm transition-all duration-150 ${
                isPlaying && !isMuted 
                  ? `${getPillBg(currentTrackId)} animate-[pulse_0.5s_ease-in-out_infinite_alternate] h-2` 
                  : 'bg-gray-300 h-1'
              }`} 
            />
          </div>

          <div className="hidden sm:block max-w-[140px]">
            <div className="flex items-center gap-1 truncate">
              <span className="text-xs font-bold text-gray-800 group-hover:text-amber-600 transition-colors truncate">
                {trackTitle}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 block leading-none truncate">
              {isPlaying ? (isMuted ? t('Naka-mute', 'Muted') : (lang === 'fil' ? currentTrack.genreFil : currentTrack.genreEn)) : t('Nakahinto', 'Paused')}
            </span>
          </div>
        </button>

        {/* Quick Mute Toggle */}
        <button
          onClick={toggleMute}
          className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
          title={isMuted ? t('I-unmute', 'Unmute') : t('I-mute', 'Mute')}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Expand / Minimize Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
          title={isOpen ? t('Isara', 'Close') : t('Iba pang tugtog', 'More tracks')}
          aria-label="Toggle music player panel"
        >
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
