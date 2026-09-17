'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Play, Pause, Volume2, Volume1, VolumeX, 
  Music, ChevronUp, ChevronDown, Zap, Gamepad2, X, SlidersHorizontal 
} from 'lucide-react'
import { useMusic, TRACKS } from '@/contexts/MusicContext'
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
  const trackDesc = lang === 'fil' ? currentTrack.descFil : currentTrack.descEn

  return (
    <div 
      ref={popupRef}
      className="fixed bottom-4 left-4 z-50 select-none font-sans print:hidden"
    >
      {/* Expanded Control Panel */}
      {isOpen && (
        <div 
          className="mb-3 w-80 max-w-[90vw] rounded-2xl border-2 border-amber-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                <Music className="h-4 w-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 leading-tight">
                  {t('Tugtugin sa Likuran', 'Background Music')}
                </h4>
                <p className="text-[11px] font-medium text-amber-700/80">
                  8-Bit Chiptune Player
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

          {/* Track Selection */}
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('Pumili ng Musika', 'Select Track')}
            </p>
            
            {/* Track 1: Playful */}
            <button
              onClick={() => setTrack('playful')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                currentTrackId === 'playful'
                  ? 'border-amber-400 bg-amber-50/80 shadow-sm'
                  : 'border-gray-200 hover:border-amber-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${currentTrackId === 'playful' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Gamepad2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-800">
                    {lang === 'fil' ? TRACKS.playful.nameFil : TRACKS.playful.nameEn}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {lang === 'fil' ? TRACKS.playful.descFil : TRACKS.playful.descEn}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                126 BPM
              </span>
            </button>

            {/* Track 2: Quiz */}
            <button
              onClick={() => setTrack('quiz')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                currentTrackId === 'quiz'
                  ? 'border-indigo-400 bg-indigo-50/80 shadow-sm'
                  : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${currentTrackId === 'quiz' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-800">
                    {lang === 'fil' ? TRACKS.quiz.nameFil : TRACKS.quiz.nameEn}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {lang === 'fil' ? TRACKS.quiz.descFil : TRACKS.quiz.descEn}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                144 BPM
              </span>
            </button>
          </div>

          {/* Volume Control */}
          <div className="mt-4 pt-3 border-t border-amber-100 space-y-2">
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
          <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between">
            <div className="pr-2">
              <label htmlFor="auto-quiz-toggle" className="text-xs font-semibold text-gray-700 block cursor-pointer">
                {t('Awtomatikong Bilis-Isip', 'Auto Quiz Mode')}
              </label>
              <p className="text-[10px] text-gray-400">
                {t('Lilipat sa mabilis na tugtog kapag may pagsusulit', 'Switches to high-tempo music during quizzes')}
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
            isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
          title={isPlaying ? t('Ihinto', 'Pause') : t('Patugtugin', 'Play')}
          aria-label={isPlaying ? 'Pause Background Music' : 'Play Background Music'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        {/* Dancing Visualizer / Note */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-1 text-left group"
        >
          {/* Animated 8-bit Equalizer Bars */}
          <div className="flex items-end gap-0.5 h-4 w-4 px-0.5" title="Chiptune Visualizer">
            <div 
              className={`w-1 rounded-sm transition-all duration-150 ${
                isPlaying && !isMuted 
                  ? 'bg-amber-500 animate-[pulse_0.4s_ease-in-out_infinite_alternate] h-3' 
                  : 'bg-gray-300 h-1.5'
              }`} 
            />
            <div 
              className={`w-1 rounded-sm transition-all duration-150 ${
                isPlaying && !isMuted 
                  ? 'bg-amber-600 animate-[pulse_0.6s_ease-in-out_infinite_alternate] h-4' 
                  : 'bg-gray-300 h-2.5'
              }`} 
            />
            <div 
              className={`w-1 rounded-sm transition-all duration-150 ${
                isPlaying && !isMuted 
                  ? 'bg-indigo-500 animate-[pulse_0.5s_ease-in-out_infinite_alternate] h-2' 
                  : 'bg-gray-300 h-1'
              }`} 
            />
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-gray-800 group-hover:text-amber-600 transition-colors">
                {trackTitle}
              </span>
              {currentTrackId === 'quiz' && (
                <Zap className="h-3 w-3 text-indigo-600 fill-indigo-600" />
              )}
            </div>
            <span className="text-[10px] text-gray-400 block leading-none">
              {isPlaying ? (isMuted ? t('Naka-mute', 'Muted') : t('Tumutugtog', 'Playing')) : t('Nakahinto', 'Paused')}
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
          title={isOpen ? t('Isara', 'Close') : t('Iba pang setting', 'More settings')}
          aria-label="Toggle music player panel"
        >
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
