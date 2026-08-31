'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Users, User, Clock, CheckCircle2, ChevronRight, 
  ChevronLeft, Sparkles, Shuffle, Eye, HelpCircle, Plus, 
  Trash2, ArrowUp, ArrowDown, AlertCircle, Loader2, Play
} from 'lucide-react'
import { Translate } from '@/components/Translate'
import { createLiveSessionAction } from '@/app/educator/live/actions'
import { LiveSessionMode, LiveSessionPacing, LiveSessionRevealMode } from '@/types/live-session'

interface CardItem {
  id: string
  quiz_title: string
  question_text: string
  options: any
  correct_answer: any
  time_limit?: number | null
}

interface SetupWizardClientProps {
  classroomId: string
  classroomName: string
  availableCards: CardItem[]
  prebuiltCards: CardItem[]
  duplicateFromId?: string
}

export function SetupWizardClient({
  classroomId,
  classroomName,
  availableCards,
  prebuiltCards,
  duplicateFromId
}: SetupWizardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Basics
  const [mode, setMode] = useState<LiveSessionMode>('individual')
  const [capacity, setCapacity] = useState<number>(30)

  // Step 2: Questions & Randomization
  const allCards = [...availableCards, ...prebuiltCards]
  const [selectedCards, setSelectedCards] = useState<CardItem[]>(() => {
    // Default to first 5 available cards if present
    return allCards.slice(0, 5)
  })
  const [randomizeChoices, setRandomizeChoices] = useState<boolean>(true)
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(false)

  // Step 3: Pacing
  const [pacing, setPacing] = useState<LiveSessionPacing>('timed')
  const [defaultTimeLimit, setDefaultTimeLimit] = useState<number>(30)
  const [cardTimeOverrides, setCardTimeOverrides] = useState<Record<string, number>>({})

  // Step 4: Reveal Mode
  const [revealMode, setRevealMode] = useState<LiveSessionRevealMode>('auto_per_question')

  // Question selection helpers
  const toggleCardSelection = (card: CardItem) => {
    if (selectedCards.some((c) => c.id === card.id)) {
      setSelectedCards(selectedCards.filter((c) => c.id !== card.id))
    } else {
      setSelectedCards([...selectedCards, card])
    }
  }

  const moveCard = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= selectedCards.length) return
    const newCards = [...selectedCards]
    const temp = newCards[index]
    newCards[index] = newCards[targetIndex]
    newCards[targetIndex] = temp
    setSelectedCards(newCards)
  }

  const handleCreateSession = () => {
    if (selectedCards.length === 0) {
      setError('Pumili ng kahit isang tanong para sa sesyon.')
      return
    }

    if (capacity < 1 || capacity > 50) {
      setError('Ang kapasidad ay dapat nasa pagitan ng 1 hanggang 50.')
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const questionsPayload = selectedCards.map((c) => ({
          id: c.id,
          prompt: c.question_text,
          choices: c.options || [],
          correct_answer: c.correct_answer,
          time_limit_seconds: cardTimeOverrides[c.id] || defaultTimeLimit
        }))

        const res = await createLiveSessionAction({
          classroom_id: classroomId,
          mode,
          capacity,
          pacing,
          default_time_limit_seconds: defaultTimeLimit,
          randomize_choices: randomizeChoices,
          randomize_question_order: randomizeQuestions,
          reveal_mode: revealMode,
          questions: questionsPayload
        })

        if (res.success && res.sessionId) {
          router.push(`/educator/classrooms/${classroomId}/live/${res.sessionId}/host`)
        }
      } catch (err: any) {
        console.error('Error creating live session:', err)
        setError(err?.message || 'Nabigo sa paggawa ng live session.')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Link
        href={`/educator/classrooms/${classroomId}`}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary font-bold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <Translate fil={`Bumalik sa ${classroomName}`} en={`Back to ${classroomName}`} />
      </Link>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-black">
              <Translate fil="Bagong Live Session" en="New Live Session" />
            </span>
            <span className="text-xs font-bold text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-500">{classroomName}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-heading font-black text-slate-900">
            <Translate fil="Setup Wizard ng Live Session" en="Live Session Setup Wizard" />
          </h1>
          <p className="text-slate-600 font-medium text-sm md:text-base mt-1">
            <Translate
              fil="I-configure ang mode, mga tanong, bilis ng pagsusulit, at pagpapakita ng sagot bago buksan ang lobby."
              en="Configure mode, questions, pacing, and answer reveals before opening the lobby."
            />
          </p>
        </div>

        {/* Wizard Steps Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-2 relative z-10">
          {[
            { step: 1, title: '1. Mode & Limit', fil: 'Mode & Limit' },
            { step: 2, title: '2. Mga Tanong', fil: 'Questions' },
            { step: 3, title: '3. Bilis & Oras', fil: 'Pacing' },
            { step: 4, title: '4. Paglalahad', fil: 'Reveal' }
          ].map((item) => {
            const isActive = currentStep === item.step
            const isCompleted = currentStep > item.step

            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">{item.title}</span>
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md">
        
        {/* STEP 1: Mode & Capacity */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-heading font-black text-slate-900 mb-1">
                <Translate fil="Pumili ng Mode ng Laro" en="Select Game Mode" />
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                <Translate
                  fil="Tukuyin kung indibidwal na magsasagot ang bawat mag-aaral o magtutulungan bilang isang pangkat."
                  en="Choose whether students answer individually or collaborate as a group."
                />
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Individual Mode */}
              <button
                type="button"
                onClick={() => setMode('individual')}
                className={`p-6 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                  mode === 'individual'
                    ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center mb-4 shadow-xs">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-heading font-black text-slate-900 mb-1">
                  <Translate fil="Indibidwal na Karera" en="Individual Race" />
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  <Translate
                    fil="Bawat mag-aaral ay may sariling screen at sumasagot para sa kanyang sarili. Live leaderboard na nagpaparangal sa pinakamabilis na tamang sagot."
                    en="Each student has their own screen and submits their own answers. Live leaderboard with first-correct recognition."
                  />
                </p>
              </button>

              {/* Group Mode */}
              <button
                type="button"
                onClick={() => setMode('group')}
                className={`p-6 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                  mode === 'group'
                    ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-heading font-black text-slate-900 mb-1">
                  <Translate fil="Pangkatang Pagtutulungan" en="Group Collaboration" />
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  <Translate
                    fil="Hahatiin ang mga mag-aaral sa mga pangkat. Boboto sila ng Lider, at ang itinalagang Lider lamang ang magsusumite ng sagot para sa grupo."
                    en="Students split into groups, elect a leader, and only the leader submits answers on behalf of the group."
                  />
                </p>
              </button>
            </div>

            {/* Capacity Input */}
            <div className="pt-4 border-t border-slate-100">
              <label className="text-sm font-black text-slate-900 block mb-1.5">
                <Translate fil="Kapasidad ng Kalahok (Max 50)" en="Participant Capacity (Max 50)" />
              </label>
              <div className="flex items-center gap-4 max-w-xs">
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-black text-lg focus:outline-none focus:border-brand-primary"
                />
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  mag-aaral
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                <Translate
                  fil="Mahigpit na nililimitahan ng server sa pinakamataas na 50 para sa libreng tier ng Supabase."
                  en="Server hard-capped at 50 to strictly stay within free-tier real-time limits."
                />
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Question Selection & Randomization */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-heading font-black text-slate-900 mb-1">
                  <Translate fil="Piliin at Ayusin ang mga Tanong" en="Select & Order Questions" />
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {selectedCards.length} <Translate fil="napiling mga tanong" en="questions selected" />
                </p>
              </div>

              {/* Randomization toggles */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRandomizeChoices(!randomizeChoices)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black border transition-all flex items-center gap-1.5 cursor-pointer ${
                    randomizeChoices
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <Translate fil="I-shuffle ang Pagpipilian" en="Shuffle Choices" />
                </button>

                <button
                  type="button"
                  onClick={() => setRandomizeQuestions(!randomizeQuestions)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black border transition-all flex items-center gap-1.5 cursor-pointer ${
                    randomizeQuestions
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <Translate fil="I-shuffle ang Pagkakasunod" en="Shuffle Question Order" />
                </button>
              </div>
            </div>

            {/* Selected Questions List */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                <Translate fil="Naka-lineup na mga Tanong" en="Selected Questions Lineup" />
              </h3>

              {selectedCards.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-500 font-bold text-sm">
                  <Translate fil="Walang napiling tanong. Pumili sa ibaba." en="No questions selected. Pick from the bank below." />
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCards.map((card, idx) => (
                    <div
                      key={card.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-brand-primary text-white flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 truncate">
                            {card.question_text}
                          </p>
                          <p className="text-[11px] font-bold text-slate-500 truncate">
                            Mula: {card.quiz_title} • Tamang Sagot: {card.correct_answer}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveCard(idx, 'up')}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedCards.length - 1}
                          onClick={() => moveCard(idx, 'down')}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCardSelection(card)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bank of available cards */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                <Translate fil="Bangko ng mga Tanong (I-click para Idagdag)" en="Question Bank (Click to Add)" />
              </h3>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {allCards.map((card) => {
                  const isSelected = selectedCards.some((c) => c.id === card.id)
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => toggleCardSelection(card)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-brand-primary/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold truncate">{card.question_text}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{card.quiz_title}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${
                        isSelected ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isSelected ? 'Napili' : '+ Idagdag'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Pacing & Timer Limits */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-heading font-black text-slate-900 mb-1">
                <Translate fil="Bilis at Oras ng Sesyon" en="Session Pacing & Timers" />
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                <Translate
                  fil="Pumili kung manu-manong ililipat ng guro ang tanong o gagamit ng awtomatikong countdown timer."
                  en="Choose whether the educator advances manually or using automatic countdown timers."
                />
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Manual Pacing */}
              <button
                type="button"
                onClick={() => setPacing('manual')}
                className={`p-6 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                  pacing === 'manual'
                    ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center mb-4 shadow-xs">
                  <Play className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-heading font-black text-slate-900 mb-1">
                  <Translate fil="Manu-manong Paglipat (Manual)" en="Manual Pacing" />
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  <Translate
                    fil="Ang guro ang pipindot ng 'Susunod na Tanong' kapag handa na ang klase. Walang countdown pressure."
                    en="Educator clicks 'Next Question' when ready. No countdown timer pressure."
                  />
                </p>
              </button>

              {/* Timed Pacing */}
              <button
                type="button"
                onClick={() => setPacing('timed')}
                className={`p-6 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                  pacing === 'timed'
                    ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 shadow-xs">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-heading font-black text-slate-900 mb-1">
                  <Translate fil="May Oras (Timed Countdown)" en="Timed Pacing" />
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  <Translate
                    fil="Awtomatikong magbibilang ang oras kada tanong. Awtomatikong lilipat sa susunod kapag ubos na ang oras."
                    en="Automatic client-computed countdown per question. Auto-advances when time expires."
                  />
                </p>
              </button>
            </div>

            {/* Default Time Limit Input */}
            {pacing === 'timed' && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <label className="text-sm font-black text-slate-900 block mb-1.5">
                    <Translate fil="Default na Oras kada Tanong (Segundo)" en="Default Time Limit per Question (Seconds)" />
                  </label>
                  <div className="flex items-center gap-3 max-w-xs">
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={defaultTimeLimit}
                      onChange={(e) => setDefaultTimeLimit(Math.max(5, parseInt(e.target.value) || 5))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-black text-lg focus:outline-none focus:border-brand-primary"
                    />
                    <span className="text-xs font-bold text-slate-500">segundo</span>
                  </div>
                </div>

                {/* Preset quick buttons */}
                <div className="flex flex-wrap gap-2">
                  {[15, 20, 30, 45, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDefaultTimeLimit(sec)}
                      className={`px-3 py-1.5 rounded-full text-xs font-black border transition-all cursor-pointer ${
                        defaultTimeLimit === sec
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Reveal Mode */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-heading font-black text-slate-900 mb-1">
                <Translate fil="Paraan ng Paglalahad ng Resulta" en="Answer & Score Reveal Mode" />
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                <Translate
                  fil="Tukuyin kung kailan makikita ng mga mag-aaral ang tamang sagot at ang talaan ng marka."
                  en="Choose when students see correct answers and the live leaderboard."
                />
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Auto per question */}
              <button
                type="button"
                onClick={() => setRevealMode('auto_per_question')}
                className={`p-6 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                  revealMode === 'auto_per_question'
                    ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-heading font-black text-slate-900 mb-1">
                  <Translate fil="Awtomatiko kada Tanong" en="Auto per Question" />
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  <Translate
                    fil="Lalabas agad ang tamang sagot at kung sino ang nauna sa bawat paglipat ng tanong."
                    en="Correct answer and first-correct badge appear automatically right after question closes."
                  />
                </p>
              </button>

              {/* Manual per question */}
              <button
                type="button"
                onClick={() => setRevealMode('manual_per_question')}
                className={`p-6 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                  revealMode === 'manual_per_question'
                    ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-base font-heading font-black text-slate-900 mb-1">
                  <Translate fil="Manu-manong Paglalahad" en="Manual per Question" />
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  <Translate
                    fil="Ang guro ang magpapasiya kung kailan pipindutin ang 'Ilahad ang Sagot' para sa bawat tanong."
                    en="Teacher explicitly clicks 'Reveal' for each question at their chosen moment."
                  />
                </p>
              </button>

              {/* End of session */}
              <button
                type="button"
                onClick={() => setRevealMode('end_of_session')}
                className={`p-6 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                  revealMode === 'end_of_session'
                    ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-heading font-black text-slate-900 mb-1">
                  <Translate fil="Sa Katapusan Lamang" en="End of Session Only" />
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  <Translate
                    fil="Nakatago ang mga tamang sagot at leaderboard hanggang matapos ang buong laro para sa grand reveal."
                    en="Answers and leaderboard stay hidden until the host clicks 'Reveal Final Results' at the very end."
                  />
                </p>
              </button>
            </div>

            {/* Summary Card */}
            <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
              <h3 className="text-sm font-black text-slate-900">
                <Translate fil="Buod ng Setup" en="Setup Summary" />
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">MODE</span>
                  <span className="text-slate-900 text-sm">{mode === 'group' ? 'Pangkatang' : 'Indibidwal'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">KAPASIDAD</span>
                  <span className="text-slate-900 text-sm">{capacity} mag-aaral</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">MGA TANONG</span>
                  <span className="text-slate-900 text-sm">{selectedCards.length} aytem</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">BILIS</span>
                  <span className="text-slate-900 text-sm">{pacing === 'timed' ? `${defaultTimeLimit}s timer` : 'Manual'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <Translate fil="Bumalik" en="Previous" />
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold rounded-full text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Translate fil="Susunod" en="Next Step" />
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending || selectedCards.length === 0}
              onClick={handleCreateSession}
              className="px-8 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-black rounded-full text-sm shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Translate fil="Buksan ang Lobby 🚀" en="Open Lobby 🚀" />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
