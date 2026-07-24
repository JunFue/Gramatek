'use client'

import { useState } from 'react'
import { saveQuiz } from '@/app/educator/quizzes/actions'
import { ArrowLeft, Save, FileQuestion, Plus, Trash2, GripVertical, CheckCircle2, Clock, Swords, CalendarClock, Trophy, Zap, Shuffle, Shield, Target } from 'lucide-react'
import Link from 'next/link'

type QuestionType = 'multiple_choice' | 'fill_blank' | 'enumeration'
type GameMode = 'mastery' | 'scheduled' | 'survival'

interface CardData {
  id: string
  type: QuestionType
  text: string
  options?: string[]
  correctAnswer: any
  timeLimitOverride?: number | null
}

const GAME_MODES: { id: GameMode; label: string; description: string; icon: any; color: string; bg: string }[] = [
  { id: 'mastery', label: 'Mastery Mode', description: 'Open practice with limited retakes. Best or average score recorded.', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400' },
  { id: 'scheduled', label: 'Scheduled Mission', description: 'Set a time window. Students receive notifications and take it individually.', icon: CalendarClock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-400' },
  { id: 'survival', label: 'Survival / Streak', description: 'Streak multipliers reward consistency. Miss too many and you\'re eliminated.', icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30 hover:border-rose-400' },
]

export function QuizBuilder({ classrooms, defaultClassroomId }: { classrooms: any[], defaultClassroomId?: string }) {
  const [classroomId, setClassroomId] = useState(defaultClassroomId || classrooms[0]?.id || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState(60)
  const [cards, setCards] = useState<CardData[]>([])
  
  // Game Mode State
  const [gameMode, setGameMode] = useState<GameMode>('mastery')
  const [maxAttempts, setMaxAttempts] = useState<number | null>(3)
  const [scoringMethod, setScoringMethod] = useState<'highest' | 'average'>('highest')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [survivalStrikes, setSurvivalStrikes] = useState(3)
  const [streakMultiplier, setStreakMultiplier] = useState(true)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleOptions, setShuffleOptions] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const addCard = (type: QuestionType) => {
    const newCard: CardData = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : undefined,
      correctAnswer: type === 'multiple_choice' ? 0 : type === 'enumeration' ? [] : '',
      timeLimitOverride: null,
    }
    setCards([...cards, newCard])
  }

  const updateCard = (id: string, updates: Partial<CardData>) => {
    setCards(cards.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const removeCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id))
  }

  const handleSave = async (is_published: boolean) => {
    if (!classroomId || !title) return alert('Classroom and Title are required.')
    if (cards.length === 0) return alert('Add at least one question.')
    if (gameMode === 'scheduled') {
      if (!scheduledStart || !scheduledEnd) return alert('Scheduled missions require a start and end time.')
      if (new Date(scheduledEnd) <= new Date(scheduledStart)) return alert('End time must be after start time.')
    }
    
    setIsSubmitting(true)
    try {
      await saveQuiz(classroomId, title, description, timeLimit, is_published, cards, {
        gameMode,
        maxAttempts: gameMode === 'mastery' ? maxAttempts : null,
        scoringMethod: gameMode === 'mastery' ? scoringMethod : 'highest',
        scheduledStart: gameMode === 'scheduled' ? scheduledStart : null,
        scheduledEnd: gameMode === 'scheduled' ? scheduledEnd : null,
        survivalStrikes: gameMode === 'survival' ? survivalStrikes : 3,
        streakMultiplier: gameMode === 'survival' ? streakMultiplier : false,
        shuffleQuestions,
        shuffleOptions,
      })
    } catch (e) {
      console.error(e)
      setIsSubmitting(false)
      alert('Failed to save quiz.')
    }
  }

  const selectedMode = GAME_MODES.find(m => m.id === gameMode)!

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in relative z-10">
      
      <div className="flex items-center justify-between mb-8">
        <Link href={defaultClassroomId ? `/educator/classrooms/${defaultClassroomId}` : "/educator"} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <button 
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="px-4 py-2 border border-white/20 hover:bg-white/5 text-white rounded-full text-sm font-medium transition-colors"
          >
            Save Draft
          </button>
          <button 
            disabled={isSubmitting}
            onClick={() => handleSave(true)}
            className="px-6 py-2 bg-brand-secondary hover:bg-violet-500 text-white rounded-full text-sm font-medium shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Publish Playable</>}
          </button>
        </div>
      </div>

      {/* ── Game Mode Selector ── */}
      <div className="glass-strong rounded-3xl p-8 mb-8 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -ml-32 -mt-32 pointer-events-none" />
        
        <h2 className="text-2xl font-heading font-bold text-white mb-2 relative z-10 flex items-center gap-2">
          <Swords className="w-6 h-6 text-brand-primary" />
          Game Mode
        </h2>
        <p className="text-slate-400 text-sm mb-6 relative z-10">Choose how students will experience this quiz.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {GAME_MODES.map((mode) => {
            const Icon = mode.icon
            const isSelected = gameMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => setGameMode(mode.id)}
                className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 ${isSelected ? `${mode.bg} scale-[1.02] shadow-lg ring-1 ring-white/10` : 'bg-white/[0.02] border-white/10 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${isSelected ? mode.color : 'text-slate-400'}`} />
                  <span className={`font-heading font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{mode.label}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{mode.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Mode-Specific Settings ── */}
      {gameMode === 'mastery' && (
        <div className="glass rounded-2xl p-6 mb-8 border border-amber-500/20 animate-slide-up">
          <h3 className="text-lg font-heading font-bold text-amber-400 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" /> Mastery Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">Max Attempts</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={maxAttempts ?? ''}
                  onChange={(e) => setMaxAttempts(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Unlimited"
                  className="w-28 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-amber-500 transition-all"
                />
                <span className="text-slate-400 text-sm">retries per student (empty = unlimited)</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">Scoring Method</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setScoringMethod('highest')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${scoringMethod === 'highest' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  🏆 Highest Score
                </button>
                <button
                  onClick={() => setScoringMethod('average')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${scoringMethod === 'average' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  📊 Average Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameMode === 'scheduled' && (
        <div className="glass rounded-2xl p-6 mb-8 border border-blue-500/20 animate-slide-up">
          <h3 className="text-lg font-heading font-bold text-blue-400 mb-4 flex items-center gap-2">
            <CalendarClock className="w-5 h-5" /> Schedule Window
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">Opens At</label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">Closes At</label>
              <input
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all [color-scheme:dark]"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Students enrolled in this classroom will receive a notification when the quiz becomes available.</p>
        </div>
      )}

      {gameMode === 'survival' && (
        <div className="glass rounded-2xl p-6 mb-8 border border-rose-500/20 animate-slide-up">
          <h3 className="text-lg font-heading font-bold text-rose-400 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" /> Survival Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-400" /> Strikes Before Elimination
              </label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setSurvivalStrikes(n)}
                    className={`w-12 h-12 rounded-xl border text-lg font-bold transition-all ${survivalStrikes === n ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-400" /> Streak Multiplier
              </label>
              <button
                onClick={() => setStreakMultiplier(!streakMultiplier)}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-all border ${streakMultiplier ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
              >
                {streakMultiplier ? '🔥 Enabled — Points multiply on streaks' : 'Disabled — Flat scoring'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz Settings ── */}
      <div className="glass-strong rounded-3xl p-8 mb-8 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <h2 className="text-2xl font-heading font-bold text-white mb-6 relative z-10 flex items-center gap-2">
          <FileQuestion className="w-6 h-6 text-brand-secondary" />
          Quiz Settings
        </h2>
        
        <div className="space-y-6 relative z-10">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Assign to Classroom</label>
            <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary transition-all appearance-none">
              <option value="" disabled>Select Classroom...</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Quiz Title</label>
            <input 
              type="text" 
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 1 Review"
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-secondary focus:ring-1 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea 
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this quiz about?"
              rows={2}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-secondary focus:ring-1 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">Default Time per Question</label>
              <select value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-secondary transition-all appearance-none">
                 <option value={10}>10 Seconds (Blitz)</option>
                 <option value={15}>15 Seconds (Rapid)</option>
                 <option value={30}>30 Seconds (Fast)</option>
                 <option value={60}>1 Minute (Standard)</option>
                 <option value={120}>2 Minutes (Extended)</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-300">Shuffle Options</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setShuffleQuestions(!shuffleQuestions)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2 ${shuffleQuestions ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <Shuffle className="w-4 h-4" /> Questions
                </button>
                <button
                  onClick={() => setShuffleOptions(!shuffleOptions)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2 ${shuffleOptions ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <Shuffle className="w-4 h-4" /> Choices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards (Questions) ── */}
      <div className="space-y-6">
        <h2 className="text-2xl font-heading font-bold text-white flex items-center justify-between">
          <span>Deck Cards ({cards.length})</span>
        </h2>

        {cards.map((card, index) => (
          <div key={card.id} className="glass rounded-xl p-6 relative group border border-white/5 animate-slide-up bg-slate-800/80">
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => removeCard(card.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-secondary">
                <GripVertical className="w-4 h-4 text-slate-500 cursor-move" />
                <span className="font-mono text-sm font-bold uppercase tracking-wider">Card {index + 1} - {card.type.replace('_', ' ')}</span>
              </div>
              {/* Per-card timer override */}
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="number"
                  min={5}
                  max={300}
                  placeholder={`${timeLimit}s`}
                  value={card.timeLimitOverride ?? ''}
                  onChange={(e) => updateCard(card.id, { timeLimitOverride: e.target.value ? Number(e.target.value) : null })}
                  className="w-20 bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 text-center focus:outline-none focus:border-brand-secondary placeholder:text-slate-600"
                />
                <span className="text-xs text-slate-500">sec</span>
              </div>
            </div>

            <div className="space-y-4">
              <input 
                 type="text"
                 placeholder="Question text..."
                 value={card.text}
                 onChange={(e) => updateCard(card.id, { text: e.target.value })}
                 className="w-full bg-slate-900/50 border-b border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-secondary transition-all text-lg font-medium"
              />

              {card.type === 'multiple_choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {card.options?.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                       <button 
                         onClick={() => updateCard(card.id, { correctAnswer: i })}
                         className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0 ${card.correctAnswer === i ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 hover:border-slate-400'}`}
                       >
                         {card.correctAnswer === i && <CheckCircle2 className="w-4 h-4" />}
                       </button>
                       <input 
                         type="text"
                         placeholder={`Option ${i + 1}`}
                         value={opt}
                         onChange={(e) => {
                           const newOpts = [...(card.options || [])];
                           newOpts[i] = e.target.value;
                           updateCard(card.id, { options: newOpts })
                         }}
                         className={`flex-1 bg-slate-900/50 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-secondary ${card.correctAnswer === i ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10'}`}
                       />
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 col-span-full mt-1">Select the circle to mark the correct answer.</p>
                </div>
              )}

              {card.type === 'fill_blank' && (
                <div className="mt-4">
                  <label className="text-xs text-slate-400 block mb-1">Correct Answer</label>
                  <input 
                     type="text"
                     placeholder="The exact word/phrase"
                     value={card.correctAnswer}
                     onChange={(e) => updateCard(card.id, { correctAnswer: e.target.value })}
                     className="w-full max-w-sm bg-slate-900/50 border border-emerald-500/50 rounded-lg px-4 py-2 text-emerald-400 focus:outline-none focus:border-brand-secondary transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-2">Make sure to indicate the missing part with &quot;___&quot; in your question text.</p>
                </div>
              )}

            </div>
          </div>
        ))}

        {/* Add Card Menu */}
        <div className="glass-subtle rounded-xl p-4 border border-dashed border-white/20 flex flex-col md:flex-row items-center justify-center gap-4">
           <span className="text-sm font-medium text-slate-400">Add new card:</span>
           <button onClick={() => addCard('multiple_choice')} className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
             <Plus className="w-4 h-4" /> Multiple Choice
           </button>
           <button onClick={() => addCard('fill_blank')} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
             <Plus className="w-4 h-4" /> Fill in the Blank
           </button>
           <button onClick={() => alert("Enumeration coming soon")} className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
             <Plus className="w-4 h-4" /> Enumeration
           </button>
        </div>
      </div>
    </div>
  )
}
