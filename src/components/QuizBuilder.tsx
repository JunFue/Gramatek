'use client'

import { useState } from 'react'
import { saveQuiz } from '@/app/educator/quizzes/actions'
import { ArrowLeft, Save, FileQuestion, Plus, Trash2, GripVertical, CheckCircle2, Clock, Swords, CalendarClock, Trophy, Zap, Shuffle, Shield, Target } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

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

const GAME_MODES: { id: GameMode; label: { fil: string; en: string }; description: { fil: string; en: string }; icon: any; color: string; bg: string }[] = [
  { id: 'mastery', label: { fil: 'Mode ng Masteriya', en: 'Mastery Mode' }, description: { fil: 'Bukas na pagsasanay na may limitadong retake. Ang pinakamataas o average na marka ang nakatala.', en: 'Open practice with limited retakes. Best or average score recorded.' }, icon: Trophy, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200 hover:border-slate-400' },
  { id: 'scheduled', label: { fil: 'Nakatakdang Misyon', en: 'Scheduled Mission' }, description: { fil: 'Magtakda ng oras. Makakatanggap ng abiso ang mga mag-aaral.', en: 'Set a time window. Students receive notifications and take it individually.' }, icon: CalendarClock, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200 hover:border-slate-400' },
  { id: 'survival', label: { fil: 'Mode ng Kaligtasan', en: 'Survival / Streak' }, description: { fil: 'Ginagantimpalaan ng streak multiplier ang pagiging pare-pareho. Matanggal kapag maraming mali.', en: 'Streak multipliers reward consistency. Miss too many and you\'re eliminated.' }, icon: Zap, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200 hover:border-rose-400' },
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
        <Link href={defaultClassroomId ? `/educator/classrooms/${defaultClassroomId}` : "/educator"} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold">
          <ArrowLeft className="w-4 h-4" />
          <Translate fil="Bumalik" en="Back" />
        </Link>
        <div className="flex items-center gap-3">
          <button 
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-full text-sm font-bold transition-colors"
          >
            <Translate fil="I-save bilang Draft" en="Save Draft" />
          </button>
          <button 
            disabled={isSubmitting}
            onClick={() => handleSave(true)}
            className="px-6 py-2 bg-brand-primary hover:bg-slate-600 text-white rounded-full text-sm font-bold shadow-md transition-all flex items-center gap-2"
          >
            {isSubmitting ? <Translate fil="Sini-save..." en="Saving..." /> : <><Save className="w-4 h-4" /> <Translate fil="I-publish para Mai-play" en="Publish Playable" /></>}
          </button>
        </div>
      </div>

      {/* ── Game Mode Selector ── */}
      <div className="bg-white rounded-3xl p-8 mb-8 border border-slate-200 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -ml-32 -mt-32 pointer-events-none" />
        
        <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2 relative z-10 flex items-center gap-2">
          <Swords className="w-6 h-6 text-brand-primary" />
          <Translate fil="Mode ng Laro" en="Game Mode" />
        </h2>
        <p className="text-slate-600 text-sm mb-6 relative z-10 font-medium"><Translate fil="Piliin kung paano mararanasan ng mga mag-aaral ang pagsusulit na ito." en="Choose how students will experience this quiz." /></p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {GAME_MODES.map((mode) => {
            const Icon = mode.icon
            const isSelected = gameMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => setGameMode(mode.id)}
                className={`p-5 rounded-2xl border text-left transition-all duration-200 ${isSelected ? `${mode.bg} scale-[1.02] shadow-md ring-1 ring-slate-200` : 'bg-slate-50 border-slate-200 hover:bg-slate-100 shadow-sm'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${isSelected ? mode.color : 'text-slate-400'}`} />
                  <span className={`font-heading font-bold ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                    <Translate fil={mode.label.fil} en={mode.label.en} />
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  <Translate fil={mode.description.fil} en={mode.description.en} />
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Mode-Specific Settings ── */}
      {gameMode === 'mastery' && (
        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200 animate-slide-up shadow-sm">
          <h3 className="text-lg font-heading font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-slate-500" /> <Translate fil="Mga Setting ng Masteriya" en="Mastery Settings" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-800"><Translate fil="Pinakamaraming Pagtatangka" en="Max Attempts" /></label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={maxAttempts ?? ''}
                  onChange={(e) => setMaxAttempts(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Unlimited"
                  className="w-28 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-center focus:outline-none focus:border-slate-500 transition-all shadow-sm"
                />
                <span className="text-slate-700/80 text-sm font-medium"><Translate fil="pag-uulit bawat mag-aaral (walang laman = walang limitasyon)" en="retries per student (empty = unlimited)" /></span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-800"><Translate fil="Paraan ng Pagmamarka" en="Scoring Method" /></label>
              <div className="flex gap-3">
                <button
                  onClick={() => setScoringMethod('highest')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${scoringMethod === 'highest' ? 'bg-slate-500 text-white border-slate-600 shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'}`}
                >
                  🏆 <Translate fil="Pinakamataas na Iskor" en="Highest Score" />
                </button>
                <button
                  onClick={() => setScoringMethod('average')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${scoringMethod === 'average' ? 'bg-slate-500 text-white border-slate-600 shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'}`}
                >
                  📊 <Translate fil="Karaniwang Iskor" en="Average Score" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameMode === 'scheduled' && (
        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200 animate-slide-up shadow-sm">
          <h3 className="text-lg font-heading font-bold text-slate-700 mb-4 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-slate-500" /> <Translate fil="Oras ng Iskedyul" en="Schedule Window" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-800"><Translate fil="Magsisimula Sa" en="Opens At" /></label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-slate-500 transition-all shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-800"><Translate fil="Magsasara Sa" en="Closes At" /></label>
              <input
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-slate-500 transition-all shadow-sm"
              />
            </div>
          </div>
          <p className="text-xs text-slate-700/80 font-medium mt-3"><Translate fil="Makakatanggap ng abiso ang mga enrolled kapag bukas na ang pagsusulit." en="Students enrolled in this classroom will receive a notification when the quiz becomes available." /></p>
        </div>
      )}

      {gameMode === 'survival' && (
        <div className="bg-rose-50 rounded-2xl p-6 mb-8 border border-rose-200 animate-slide-up shadow-sm">
          <h3 className="text-lg font-heading font-bold text-rose-700 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-rose-500" /> <Translate fil="Mga Setting ng Kaligtasan" en="Survival Settings" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-500" /> <Translate fil="Strikes Bago Matanggal" en="Strikes Before Elimination" />
              </label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setSurvivalStrikes(n)}
                    className={`w-12 h-12 rounded-xl border text-lg font-bold transition-all shadow-sm ${survivalStrikes === n ? 'bg-rose-500 border-rose-600 text-white' : 'bg-white border-rose-200 text-rose-600 hover:bg-rose-100'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-500" /> <Translate fil="Multiplier ng Streak" en="Streak Multiplier" />
              </label>
              <button
                onClick={() => setStreakMultiplier(!streakMultiplier)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all border shadow-sm ${streakMultiplier ? 'bg-rose-500 border-rose-600 text-white' : 'bg-white border-rose-200 text-rose-600 hover:bg-rose-100'}`}
              >
                {streakMultiplier ? <Translate fil="🔥 Bukas — Dumadami ang puntos kapag sunod-sunod ang tama" en="🔥 Enabled — Points multiply on streaks" /> : <Translate fil="Sarado — Flat na pagmamarka" en="Disabled — Flat scoring" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz Settings ── */}
      <div className="bg-white rounded-3xl p-8 mb-8 border border-slate-200 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6 relative z-10 flex items-center gap-2">
          <FileQuestion className="w-6 h-6 text-brand-primary" />
          <Translate fil="Mga Setting ng Pagsusulit" en="Quiz Settings" />
        </h2>
        
        <div className="space-y-6 relative z-10">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700"><Translate fil="I-assign sa Silid-aralan" en="Assign to Classroom" /></label>
            <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all appearance-none shadow-sm">
              <option value="" disabled><Translate fil="Pumili ng Silid..." en="Select Classroom..." /></option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700"><Translate fil="Pamagat ng Pagsusulit" en="Quiz Title" /></label>
            <input 
              type="text" 
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 1 Review"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700"><Translate fil="Paglalarawan" en="Description" /></label>
            <textarea 
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this quiz about?"
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700"><Translate fil="Oras Bawat Tanong" en="Default Time per Question" /></label>
              <select value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all appearance-none shadow-sm">
                 <option value={10}>10 Seconds (Blitz)</option>
                 <option value={15}>15 Seconds (Rapid)</option>
                 <option value={30}>30 Seconds (Fast)</option>
                 <option value={60}>1 Minute (Standard)</option>
                 <option value={120}>2 Minutes (Extended)</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-slate-700"><Translate fil="Paiba-ibahin ang Posisyon (Shuffle)" en="Shuffle Options" /></label>
              <div className="flex gap-3">
                <button
                  onClick={() => setShuffleQuestions(!shuffleQuestions)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 shadow-sm ${shuffleQuestions ? 'bg-violet-100 border-violet-300 text-violet-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Shuffle className="w-4 h-4" /> <Translate fil="Mga Tanong" en="Questions" />
                </button>
                <button
                  onClick={() => setShuffleOptions(!shuffleOptions)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 shadow-sm ${shuffleOptions ? 'bg-violet-100 border-violet-300 text-violet-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Shuffle className="w-4 h-4" /> <Translate fil="Mga Pagpipilian" en="Choices" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards (Questions) ── */}
      <div className="space-y-6">
        <h2 className="text-2xl font-heading font-black text-slate-900 flex items-center justify-between">
          <span><Translate fil="Mga Card ng Pagsusulit" en="Deck Cards" /> ({cards.length})</span>
        </h2>

        {cards.map((card, index) => (
          <div key={card.id} className="bg-white rounded-xl p-6 relative group border border-slate-200 animate-slide-up shadow-sm">
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => removeCard(card.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-colors border border-red-100">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-primary">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                <span className="font-mono text-sm font-bold uppercase tracking-wider"><Translate fil={`Card ${index + 1} - ${card.type.replace('_', ' ')}`} en={`Card ${index + 1} - ${card.type.replace('_', ' ')}`} /></span>
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
                  className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-bold text-center focus:outline-none focus:border-brand-primary placeholder:text-slate-400"
                />
                <span className="text-xs text-slate-500 font-medium">sec</span>
              </div>
            </div>

            <div className="space-y-4">
              <input 
                 type="text"
                 placeholder="Question text..."
                 value={card.text}
                 onChange={(e) => updateCard(card.id, { text: e.target.value })}
                 className="w-full bg-slate-50 border-b border-slate-200 px-4 py-3 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-all text-lg"
              />

              {card.type === 'multiple_choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {card.options?.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                       <button 
                         onClick={() => updateCard(card.id, { correctAnswer: i })}
                         className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0 ${card.correctAnswer === i ? 'bg-slate-500 border-slate-500 text-white' : 'border-slate-300 hover:border-slate-400'}`}
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
                         className={`flex-1 bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-brand-primary ${card.correctAnswer === i ? 'border-slate-300 bg-slate-50 shadow-sm' : 'border-slate-200'}`}
                       />
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 font-medium col-span-full mt-1"><Translate fil="Piliin ang bilog para itakda ang tamang sagot." en="Select the circle to mark the correct answer." /></p>
                </div>
              )}

              {card.type === 'fill_blank' && (
                <div className="mt-4">
                  <label className="text-xs text-slate-500 font-bold block mb-1"><Translate fil="Tamang Sagot" en="Correct Answer" /></label>
                  <input 
                     type="text"
                     placeholder="The exact word/phrase"
                     value={card.correctAnswer}
                     onChange={(e) => updateCard(card.id, { correctAnswer: e.target.value })}
                     className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-bold focus:outline-none focus:border-brand-primary transition-all shadow-sm"
                  />
                  <p className="text-xs text-slate-500 font-medium mt-2"><Translate fil='Tiyaking ilagay ang nawawalang bahagi gamit ang "___" sa text ng tanong.' en='Make sure to indicate the missing part with "___" in your question text.' /></p>
                </div>
              )}

            </div>
          </div>
        ))}

        {/* Add Card Menu */}
        <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 flex flex-col md:flex-row items-center justify-center gap-4 shadow-sm">
           <span className="text-sm font-bold text-slate-500"><Translate fil="Magdagdag ng card:" en="Add new card:" /></span>
           <button onClick={() => addCard('multiple_choice')} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 shadow-sm">
             <Plus className="w-4 h-4" /> <Translate fil="Pagpipilian" en="Multiple Choice" />
           </button>
           <button onClick={() => addCard('fill_blank')} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 shadow-sm">
             <Plus className="w-4 h-4" /> <Translate fil="Punan ang Patlang" en="Fill in the Blank" />
           </button>
           <button onClick={() => alert("Enumeration coming soon")} className="px-4 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 shadow-sm">
             <Plus className="w-4 h-4" /> <Translate fil="Enumerasyon" en="Enumeration" />
           </button>
        </div>
      </div>
    </div>
  )
}
