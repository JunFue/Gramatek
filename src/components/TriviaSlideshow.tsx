'use client'

import { useState, useEffect, useRef } from 'react'
import { ALAM_MO_BA_FACTS } from '@/lib/data/filipino-trivia'
import { 
  Lightbulb, ChevronLeft, ChevronRight, Shuffle, 
  Sparkles, Play, Pause, BookOpen 
} from 'lucide-react'
import { Translate } from '@/components/Translate'

export function TriviaSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalDuration = 8000 // 8 seconds per slide

  useEffect(() => {
    // Randomize initial start
    setCurrentIndex(Math.floor(Math.random() * ALAM_MO_BA_FACTS.length))
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const stepMs = 100
    const stepIncrement = (stepMs / intervalDuration) * 100

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % ALAM_MO_BA_FACTS.length)
          return 0
        }
        return prev + stepIncrement
      })
    }, stepMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, currentIndex])

  const goToNext = () => {
    setProgress(0)
    setCurrentIndex((prev) => (prev + 1) % ALAM_MO_BA_FACTS.length)
  }

  const goToPrev = () => {
    setProgress(0)
    setCurrentIndex((prev) => (prev - 1 + ALAM_MO_BA_FACTS.length) % ALAM_MO_BA_FACTS.length)
  }

  const goToRandom = () => {
    setProgress(0)
    let next = Math.floor(Math.random() * ALAM_MO_BA_FACTS.length)
    if (next === currentIndex) next = (currentIndex + 1) % ALAM_MO_BA_FACTS.length
    setCurrentIndex(next)
  }

  const currentFact = ALAM_MO_BA_FACTS[currentIndex] || ""
  const parts = currentFact.split(' – ')
  const factTitle = (parts[0] || "").replace(/^\d+\.\s*/, '')
  const factBody = parts.slice(1).join(' – ')

  return (
    <div 
      className="bg-white rounded-3xl p-6 md:p-8 border-2 border-brand-primary/20 shadow-xl relative overflow-hidden transition-all group"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* Background ambient glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Progress line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100">
        <div 
          className="h-full bg-brand-primary transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-black text-brand-primary uppercase tracking-widest block">
              <Translate fil="KAUNTING KAALAMAN • ALAM MO BA?" en="TRIVIA & FACTS • DID YOU KNOW?" />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isPlaying ? "I-pause ang slideshow" : "I-play ang slideshow"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Slide Content */}
      <div 
        key={currentIndex} 
        className="min-h-[100px] md:min-h-[110px] flex flex-col justify-center py-2 animate-fade-in relative z-10 cursor-pointer"
        onClick={goToNext}
        title="I-click para sa susunod na kaalaman"
      >
        <p className="text-lg md:text-xl font-heading font-extrabold text-slate-900 leading-relaxed">
          <strong className="text-brand-primary">{factTitle}</strong>
          {factBody && (
            <span className="text-slate-700 font-semibold"> – {factBody}</span>
          )}
        </p>
      </div>

      {/* Footer Navigation & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-2 border-t border-slate-100 relative z-10">
        
        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button 
            onClick={goToPrev}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-brand-light text-slate-700 hover:text-brand-primary font-bold text-xs border border-slate-200 transition-all active:scale-95 flex items-center gap-1 shadow-xs"
            title="Nakaraan"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline"><Translate fil="Nakaraan" en="Previous" /></span>
          </button>

          <button 
            onClick={goToNext}
            className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-slate-600 text-white font-bold text-xs transition-all active:scale-95 flex items-center gap-1 shadow-md"
            title="Susunod"
          >
            <span><Translate fil="Susunod" en="Next" /></span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Shuffle button */}
        <div className="flex items-center gap-2">
          <button 
            onClick={goToRandom}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 font-bold text-xs border border-slate-200 transition-all active:scale-95 shadow-xs"
            title="Pumili ng ibang kaalaman nang random"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-500" />
            <Translate fil="Ibang Kaalaman" en="Random Fact" />
          </button>
        </div>

      </div>

    </div>
  )
}
