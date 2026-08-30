'use client'

import { useState, useEffect } from 'react'
import { PREBUILT_QUIZZES } from '@/lib/data/filipino-trivia'
import Link from 'next/link'
import { 
  Play, Trophy, Zap, Lock, CheckCircle2, Award, 
  Sparkles, Clock, FileQuestion 
} from 'lucide-react'
import { Translate } from '@/components/Translate'

export default function PracticeHub() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [scores, setScores] = useState<Record<string, number>>({})
  const [selectedMode, setSelectedMode] = useState<'mastery' | 'survival'>('mastery')

  useEffect(() => {
    // Load completion states and high scores from localStorage
    const compState: Record<string, boolean> = {}
    const scoreState: Record<string, number> = {}

    PREBUILT_QUIZZES.forEach(q => {
      if (localStorage.getItem(`completed_${q.id}`) === 'true') {
        compState[q.id] = true
      }
      const savedScore = localStorage.getItem(`score_${q.id}`)
      if (savedScore) {
        scoreState[q.id] = parseInt(savedScore, 10)
      }
    })

    setCompleted(compState)
    setScores(scoreState)
  }, [])

  const totalEarnedPoints = PREBUILT_QUIZZES.reduce((sum, q) => sum + (scores[q.id] || 0), 0)
  const totalPossiblePoints = PREBUILT_QUIZZES.reduce((sum, q) => sum + q.total_points, 0)

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-10 pb-24 text-slate-900 transition-colors duration-300">
      
      {/* Header Banner */}
      <div className="text-center relative z-10 space-y-4">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand-light text-brand-primary font-extrabold text-xs tracking-wider uppercase border border-brand-primary/20 shadow-sm">
          <Sparkles className="w-4 h-4 text-brand-primary" /> <Translate fil="Pagsasanay at Laro" en="Practice and Play" />
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-slate-900">
          <Translate fil="Mga Palarong" en="Ready" /> <span className="text-brand-primary"><Translate fil="Handa 🎮" en="Games 🎮" /></span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-semibold leading-relaxed">
          <Translate 
            fil="Himayin ang yaman ng wikang Filipino. Tapusin ang Antas 1 upang mabuksan ang susunod na antas!" 
            en="Explore the richness of the Filipino language. Complete Level 1 to unlock the next level!" 
          />
        </p>

        {/* Overall Progress Capsule */}
        <div className="inline-flex items-center gap-6 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-md">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-slate-700">
              <Translate fil="Kabuuang Puntos" en="Total Points" />: <strong className="text-brand-primary text-base">{totalEarnedPoints}</strong> / {totalPossiblePoints}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-slate-700">
              <Translate fil="Natapos na Antas" en="Completed Levels" />: <strong className="text-emerald-700 text-base">{Object.keys(completed).length}</strong> / 3
            </span>
          </div>
        </div>
      </div>

      {/* Game Mode Selector */}
      <div className="flex flex-col items-center">
        <div className="bg-white p-2 rounded-2xl flex items-center shadow-md border border-slate-200 gap-2">
          <button 
            onClick={() => setSelectedMode('mastery')}
            className={`px-6 md:px-8 py-3 rounded-xl font-extrabold transition-all flex items-center gap-2 ${
              selectedMode === 'mastery' ? 'bg-brand-primary text-white shadow-md scale-105' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-5 h-5" /> <Translate fil="Mode ng Masteriya" en="Mastery Mode" />
          </button>
          <button 
            onClick={() => setSelectedMode('survival')}
            className={`px-6 md:px-8 py-3 rounded-xl font-extrabold transition-all flex items-center gap-2 ${
              selectedMode === 'survival' ? 'bg-rose-500 text-white shadow-md scale-105' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Zap className="w-5 h-5" /> <Translate fil="Mode ng Kaligtasan" en="Survival Mode" />
          </button>
        </div>
      </div>

      {/* 3 Levels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PREBUILT_QUIZZES.map((quiz, index) => {
          // Lock condition: Level 1 always unlocked. Level N unlocked if Level N-1 completed.
          const isUnlocked = index === 0 || completed[PREBUILT_QUIZZES[index - 1].id]
          const isCompleted = completed[quiz.id]
          const savedScore = scores[quiz.id]

          return (
            <div 
              key={quiz.id} 
              className={`rounded-3xl p-8 border-2 flex flex-col relative overflow-hidden transition-all duration-300 ${
                isUnlocked 
                  ? 'bg-white shadow-lg hover:-translate-y-1.5 hover:shadow-xl border-slate-200' 
                  : 'bg-slate-50/80 border-slate-200 grayscale opacity-75'
              }`}
            >
              {/* Completion Ribbon */}
              {isCompleted && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1.5 rounded-full shadow-md z-20 flex items-center gap-1">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}

              {/* Level Number Badge */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${
                isUnlocked ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                <span className="text-2xl font-black font-heading">{index + 1}</span>
              </div>
              
              <h3 className="text-xl font-heading font-black text-slate-900 mb-1">{quiz.title}</h3>
              <p className="text-xs font-extrabold text-brand-secondary uppercase tracking-wider mb-3">{quiz.subtitle}</p>
              <p className="text-slate-600 font-medium text-sm mb-6 flex-1">{quiz.description}</p>
              
              {/* Level Meta info */}
              <div className="grid grid-cols-2 gap-2 mb-6 text-xs font-bold text-slate-600">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>{quiz.cards.length} aytem</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{quiz.time_limit_seconds}s / aytem</span>
                </div>
              </div>

              {/* Best Score display if available */}
              {typeof savedScore === 'number' && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-between">
                  <span>Pinakamataas na Iskor:</span>
                  <strong className="text-sm font-black">{savedScore} / {quiz.total_points} pts</strong>
                </div>
              )}
              
              {/* Play / Locked Button */}
              {isUnlocked ? (
                <Link 
                  href={`/student/practice/${quiz.id}?mode=${selectedMode}`} 
                  className="w-full py-4 rounded-2xl bg-brand-primary hover:bg-slate-600 text-white font-black text-base transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 group"
                >
                  <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" /> 
                  <Translate fil="Maglaro Na" en="Play Now" /> ➔
                </Link>
              ) : (
                <button 
                  disabled 
                  className="w-full py-4 rounded-2xl bg-slate-100 text-slate-400 font-extrabold text-base flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                >
                  <Lock className="w-5 h-5" /> 
                  <Translate fil={`Tapusin ang Antas ${index} para Mabuksan`} en={`Complete Level ${index} to Unlock`} />
                </button>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
