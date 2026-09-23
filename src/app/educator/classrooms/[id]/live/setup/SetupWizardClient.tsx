'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Users, User, Clock, CheckCircle2, ChevronRight, 
  ChevronLeft, Sparkles, Shuffle, Eye, HelpCircle, Plus, 
  Trash2, ArrowUp, ArrowDown, AlertCircle, Loader2, Play,
  Edit3, Check, FileQuestion, BookOpen, Layers, X
} from 'lucide-react'
import { Translate } from '@/components/Translate'
import { createLiveSessionAction } from '@/app/educator/live/actions'
import { LiveSessionMode, LiveSessionPacing, LiveSessionRevealMode } from '@/types/live-session'
import { AIQuestionGeneratorModal, GeneratedCard } from '@/components/AIQuestionGeneratorModal'

export interface CardItem {
  id: string
  quiz_id?: string
  quiz_title?: string
  question_text: string
  question_type: 'multiple_choice' | 'fill_blank' | 'enumeration' | 'word_scramble' | 'true_false' | 'sentence_scramble'
  options?: string[]
  correct_answer: any
  time_limit?: number | null
}

export interface QuizDraft {
  id: string
  title: string
  description?: string | null
  is_published: boolean
  classroom_id: string
  classroom_name: string
  cards: CardItem[]
}

interface SetupWizardClientProps {
  classroomId: string
  classroomName: string
  availableDrafts: QuizDraft[]
  duplicateFromId?: string
  activeSession?: {
    id: string
    status: string
    code?: string
  } | null
}

export function SetupWizardClient({
  classroomId,
  classroomName,
  availableDrafts,
  duplicateFromId,
  activeSession
}: SetupWizardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Basics
  const [mode, setMode] = useState<LiveSessionMode>('individual')
  const [capacity, setCapacity] = useState<number>(30)

  // Step 2: Selected Cards & Filter
  const [selectedDraftId, setSelectedDraftId] = useState<string>(() => {
    // Default to the first draft in current classroom if available
    const currentDraft = availableDrafts.find((d) => d.classroom_id === classroomId)
    return currentDraft ? currentDraft.id : (availableDrafts[0]?.id || '')
  })

  // Collect all available cards across all drafts
  const allCards: CardItem[] = availableDrafts.flatMap((d) => d.cards)

  const [selectedCards, setSelectedCards] = useState<CardItem[]>(() => {
    // Default to cards of the initially selected draft
    const initialDraft = availableDrafts.find((d) => d.classroom_id === classroomId) || availableDrafts[0]
    return initialDraft ? [...initialDraft.cards] : []
  })

  const [randomizeChoices, setRandomizeChoices] = useState<boolean>(true)
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(false)

  // Step 3: Pacing
  const [pacing, setPacing] = useState<LiveSessionPacing>('timed')
  const [defaultTimeLimit, setDefaultTimeLimit] = useState<number>(30)
  const [cardTimeOverrides, setCardTimeOverrides] = useState<Record<string, number>>({})

  // Step 4: Reveal Mode
  const [revealMode, setRevealMode] = useState<LiveSessionRevealMode>('auto_per_question')

  // AI Modal State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  // In-Wizard Card Edit State
  const [editingCard, setEditingCard] = useState<CardItem | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [editType, setEditType] = useState<'multiple_choice' | 'fill_blank'>('multiple_choice')
  const [editOptions, setEditOptions] = useState<string[]>(['', '', '', ''])
  const [editCorrectAnswer, setEditCorrectAnswer] = useState<any>('')
  const [editTimeLimit, setEditTimeLimit] = useState<number | null>(null)

  // Selection helpers
  const toggleCardSelection = (card: CardItem) => {
    if (selectedCards.some((c) => c.id === card.id)) {
      setSelectedCards(selectedCards.filter((c) => c.id !== card.id))
    } else {
      setSelectedCards([...selectedCards, card])
    }
  }

  const selectEntireDraft = (draft: QuizDraft) => {
    const existingIds = new Set(selectedCards.map((c) => c.id))
    const newCards = draft.cards.filter((c) => !existingIds.has(c.id))
    setSelectedCards([...selectedCards, ...newCards])
  }

  const removeEntireDraft = (draft: QuizDraft) => {
    const draftCardIds = new Set(draft.cards.map((c) => c.id))
    setSelectedCards(selectedCards.filter((c) => !draftCardIds.has(c.id)))
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

  const removeCard = (cardId: string) => {
    setSelectedCards(selectedCards.filter((c) => c.id !== cardId))
  }

  // Edit card modal helpers
  const openEditModal = (card: CardItem) => {
    setEditingCard(card)
    setEditPrompt(card.question_text)
    setEditType((card.question_type as any) || 'multiple_choice')
    
    let opts = card.options || []
    if (card.question_type === 'multiple_choice' && opts.length < 4) {
      opts = [...opts, '', '', '', ''].slice(0, 4)
    }
    setEditOptions(opts)
    setEditCorrectAnswer(card.correct_answer)
    setEditTimeLimit(cardTimeOverrides[card.id] || card.time_limit || defaultTimeLimit)
  }

  const saveCardEdit = () => {
    if (!editingCard) return

    const updatedCard: CardItem = {
      ...editingCard,
      question_text: editPrompt.trim() || editingCard.question_text,
      question_type: editType,
      options: editType === 'multiple_choice' ? editOptions.map((o) => o.trim()) : [],
      correct_answer: editCorrectAnswer,
      time_limit: editTimeLimit
    }

    setSelectedCards(selectedCards.map((c) => (c.id === editingCard.id ? updatedCard : c)))
    if (editTimeLimit) {
      setCardTimeOverrides((prev) => ({ ...prev, [editingCard.id]: editTimeLimit }))
    }

    setEditingCard(null)
  }

  // Handle AI Generated Cards
  const handleAddAICards = (aiCards: GeneratedCard[]) => {
    const converted: CardItem[] = aiCards.map((c) => ({
      id: c.id,
      quiz_title: 'Nilikha gamit ang AI ✨',
      question_text: c.question_text,
      question_type: c.question_type,
      options: c.options || [],
      correct_answer: c.correct_answer,
      time_limit: c.time_limit || null
    }))

    setSelectedCards((prev) => [...prev, ...converted])
  }

  const handleCreateSession = () => {
    if (selectedCards.length === 0) {
      setError('Pumili o bumuo ng kahit isang tanong para sa sesyon.')
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
          question_type: c.question_type,
          choices: c.options || [],
          correct_answer: c.correct_answer,
          time_limit_seconds: cardTimeOverrides[c.id] || c.time_limit || defaultTimeLimit
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
          quiz_id: selectedDraftId || null,
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

  const activeDraft = availableDrafts.find((d) => d.id === selectedDraftId)

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

      {/* Active Live Session Alert Notice */}
      {activeSession && (
        <div className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in border-2 border-white/30 relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/40 shadow-inner">
              <span className="w-4 h-4 rounded-full bg-white animate-ping" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-orange-600 shadow-xs">
                  {activeSession.status === 'lobby' ? '⏳ LOBBY BUKAS' : '🔴 LIVE LARO'}
                </span>
                {activeSession.code && (
                  <span className="text-xs font-mono font-black bg-white/20 px-2 py-0.5 rounded-md">
                    PIN: {activeSession.code}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-heading font-black">
                May Kasalukuyang Aktibong Live Session sa Silid na Ito!
              </h2>
              <p className="text-white/90 text-xs font-semibold mt-0.5">
                Maaari kang bumalik sa umiiral na sesyon o magpatuloy sa ibaba upang magsimula ng bago.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 relative z-10 self-start md:self-auto shrink-0">
            <a
              href={`/educator/classrooms/${classroomId}/live/${activeSession.id}/display`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-white/30 cursor-pointer"
            >
              <span>Display Screen ↗</span>
            </a>
            <Link
              href={`/educator/classrooms/${classroomId}/live/${activeSession.id}/host`}
              className="px-5 py-2.5 bg-white hover:bg-amber-50 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Bumalik sa Host Panel ➔</span>
            </Link>
          </div>
        </div>
      )}

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
              fil="Pumili mula sa iyong mga draft, i-edit ang gameplay, o bumuo ng bagong tanong gamit ang AI."
              en="Select from your drafts, edit gameplay, or generate new questions using AI."
            />
          </p>
        </div>

        {/* Wizard Steps Bar */}
        <div className="grid grid-cols-4 gap-2 mt-8 pt-6 border-t border-slate-100 relative z-10">
          {[
            { step: 1, label: 'Mode & Kapasidad' },
            { step: 2, label: 'Mga Kard & Drafts' },
            { step: 3, label: 'Oras & Bilis' },
            { step: 4, label: 'Paghahayag ng Sagot' }
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setCurrentStep(item.step)}
              className={`text-left p-3 rounded-2xl transition-all cursor-pointer ${
                currentStep === item.step
                  ? 'bg-brand-light text-brand-primary font-black shadow-xs ring-2 ring-brand-primary/20'
                  : currentStep > item.step
                  ? 'bg-slate-50 text-slate-700 font-bold'
                  : 'text-slate-400 font-medium'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider block opacity-75">Hakbang {item.step}</span>
              <span className="text-xs md:text-sm truncate block">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= STEP 1: MODE & CAPACITY ================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md space-y-6 animate-fade-in">
          <h2 className="text-xl font-heading font-black text-slate-900">
            <Translate fil="Piliin ang Mode at Kapasidad" en="Select Mode & Capacity" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setMode('individual')}
              className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                mode === 'individual'
                  ? 'border-brand-primary bg-brand-light/30 shadow-md ring-2 ring-brand-primary/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center mb-4 shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-black text-slate-900 mb-1">
                <Translate fil="Indibidwal na Mode" en="Individual Mode" />
              </h3>
              <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
                <Translate
                  fil="Ang bawat mag-aaral ay magpapasa ng sariling sagot. May live leaderboard at unang tamang sagot na badge."
                  en="Each student submits their own answer. Features live leaderboard and first-correct badges."
                />
              </p>
            </div>

            <div
              onClick={() => setMode('group')}
              className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                mode === 'group'
                  ? 'border-brand-primary bg-brand-light/30 shadow-md ring-2 ring-brand-primary/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-4 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-black text-slate-900 mb-1">
                <Translate fil="Pangkatang Mode" en="Group Mode" />
              </h3>
              <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
                <Translate
                  fil="Hahatiin ang mga mag-aaral sa mga pangkat, boboto ng lider, at tanging ang lider lamang ang magpapasa para sa pangkat."
                  en="Students are split into groups, elect a leader, and only the leader submits on behalf of the group."
                />
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              <Translate fil="Limitasyon sa Bilang ng Mag-aaral (Max 50)" en="Participant Capacity Limit (Max 50)" />
            </label>
            <div className="flex items-center gap-4 max-w-xs">
              <input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-lg focus:ring-2 focus:ring-brand-primary focus:bg-white outline-hidden"
              />
              <span className="text-sm font-bold text-slate-500">mag-aaral</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: QUESTIONS & DRAFTS ================= */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top Bar: Actions & Summary */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-heading font-black text-slate-900 flex items-center gap-2">
                <Translate fil="Mga Kard para sa Live Session" en="Live Session Question Deck" />
                <span className="px-3 py-0.5 text-xs font-black bg-brand-primary text-white rounded-full">
                  {selectedCards.length} Kard
                </span>
              </h2>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Pumili mula sa iyong mga draft, i-edit ang mga tanong, o gumawa gamit ang AI.
              </p>
            </div>

            {/* AI Generator Trigger */}
            <button
              type="button"
              onClick={() => setIsAIModalOpen(true)}
              className="px-5 py-2.5 bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black rounded-2xl text-xs md:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Bumuo gamit ang AI (Gemini) ✨</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Drafts Explorer (4 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md space-y-4">
                <h3 className="font-heading font-black text-slate-900 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand-primary" />
                  <Translate fil="Iyong mga Draft at Pagsusulit" en="Your Drafts & Quizzes" />
                </h3>

                {availableDrafts.length > 0 ? (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {availableDrafts.map((draft) => {
                      const isCurrentClassroom = draft.classroom_id === classroomId
                      const isSelected = selectedDraftId === draft.id
                      const draftCardsSelectedCount = draft.cards.filter((c) =>
                        selectedCards.some((sc) => sc.id === c.id)
                      ).length

                      return (
                        <div
                          key={draft.id}
                          onClick={() => setSelectedDraftId(draft.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-brand-light/30 border-brand-primary shadow-xs'
                              : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs text-slate-900 truncate">
                                {draft.title}
                              </h4>
                              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                {isCurrentClassroom ? 'Sa silid na ito' : draft.classroom_name} • {draft.cards.length} kard
                              </p>
                            </div>

                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase shrink-0 ${
                              draft.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {draft.is_published ? 'Published' : 'Draft'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-bold">
                            <span className="text-slate-500">
                              {draftCardsSelectedCount}/{draft.cards.length} napili
                            </span>

                            <div className="flex items-center gap-1.5">
                              {draftCardsSelectedCount < draft.cards.length ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    selectEntireDraft(draft)
                                  }}
                                  className="text-brand-primary hover:underline"
                                >
                                  Piliin Lahat
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeEntireDraft(draft)
                                  }}
                                  className="text-rose-600 hover:underline"
                                >
                                  Alisin Lahat
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <FileQuestion className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">
                      Wala ka pang nalilikhang pagsusulit sa silid na ito.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAIModalOpen(true)}
                      className="px-4 py-2 bg-brand-primary text-white font-extrabold text-xs rounded-full shadow-xs cursor-pointer"
                    >
                      Bumuo ng Pagsusulit gamit ang AI ✨
                    </button>
                  </div>
                )}
              </div>

              {/* Cards inside active selected draft */}
              {activeDraft && activeDraft.cards.length > 0 && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-black text-slate-900 text-xs uppercase tracking-wider">
                      Mga Kard sa {activeDraft.title}
                    </h4>
                    <span className="text-xs font-bold text-slate-400">
                      {activeDraft.cards.length} kabuuan
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {activeDraft.cards.map((card) => {
                      const isSelected = selectedCards.some((c) => c.id === card.id)

                      return (
                        <div
                          key={card.id}
                          onClick={() => toggleCardSelection(card)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                              : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{card.question_text}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase">
                              {card.question_type === 'multiple_choice' && 'Multiple Choice'}
                              {card.question_type === 'fill_blank' && 'Punan ang Patlang'}
                              {card.question_type === 'enumeration' && 'Enumerasyon'}
                              {card.question_type === 'word_scramble' && 'Word Scramble'}
                              {card.question_type === 'true_false' && 'Tama o Mali'}
                              {card.question_type === 'sentence_scramble' && 'Ayusin ang Pangungusap'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Active Live Deck & Editor (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-black text-slate-900 text-base flex items-center gap-2">
                    <Layers className="w-5 h-5 text-brand-primary" />
                    <span>Aktibong Deck para sa Live Session</span>
                  </h3>
                  
                  {selectedCards.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCards([])}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Alisin Lahat
                    </button>
                  )}
                </div>

                {selectedCards.length > 0 ? (
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                    {selectedCards.map((card, idx) => (
                      <div
                        key={card.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all space-y-2 shadow-xs group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-extrabold text-slate-900 leading-snug">
                                {card.question_text}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded">
                                  {card.question_type === 'multiple_choice' && 'Multiple Choice'}
                                  {card.question_type === 'fill_blank' && 'Punan ang Patlang'}
                                  {card.question_type === 'enumeration' && 'Enumerasyon'}
                                  {card.question_type === 'word_scramble' && 'Word Scramble'}
                                  {card.question_type === 'true_false' && 'Tama o Mali'}
                                  {card.question_type === 'sentence_scramble' && 'Ayusin ang Pangungusap'}
                                </span>
                                {card.quiz_title && (
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    {card.quiz_title}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {cardTimeOverrides[card.id] || card.time_limit || defaultTimeLimit}s
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Reorder & Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveCard(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Ilipat pataas"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveCard(idx, 'down')}
                              disabled={idx === selectedCards.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Ilipat pababa"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(card)}
                              className="p-1 text-brand-primary hover:bg-brand-light rounded-lg cursor-pointer"
                              title="I-edit ang kard"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCard(card.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Alisin sa deck"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Choices Preview */}
                        {card.question_type === 'multiple_choice' && card.options && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {card.options.map((opt, oIdx) => {
                              const isCorrect = String(opt).trim().toLowerCase() === String(card.correct_answer).trim().toLowerCase() || String(card.correct_answer) === String(oIdx)

                              return (
                                <div
                                  key={oIdx}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold truncate border ${
                                    isCorrect
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                                      : 'bg-white border-slate-200 text-slate-600'
                                  }`}
                                >
                                  {isCorrect && '✓ '} {opt}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {card.question_type === 'fill_blank' && (
                          <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50/70 px-2.5 py-1 rounded-lg inline-block border border-emerald-200">
                            Tamang Sagot: {card.correct_answer}
                          </p>
                        )}

                        {card.question_type === 'word_scramble' && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-amber-900">Mga Titik:</span>
                            {(card.options || []).map((char, cIdx) => (
                              <span key={cIdx} className="w-5 h-5 rounded bg-amber-100 text-amber-950 font-black font-mono text-[10px] flex items-center justify-center border border-amber-300">
                                {char}
                              </span>
                            ))}
                            <span className="text-[10px] text-emerald-800 font-bold ml-1">➔ {card.correct_answer}</span>
                          </div>
                        )}

                        {card.question_type === 'enumeration' && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-emerald-900">Listahan:</span>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {Array.isArray(card.correct_answer) ? card.correct_answer.join(', ') : (card.options || []).join(', ') || card.correct_answer}
                            </span>
                          </div>
                        )}

                        {card.question_type === 'true_false' && (
                          <p className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                            Tamang Sagot: {card.correct_answer}
                          </p>
                        )}

                        {card.question_type === 'sentence_scramble' && (
                          <p className="text-[11px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block">
                            Buong Pangungusap: {card.correct_answer}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 space-y-3">
                    <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="font-heading font-black text-slate-800 text-sm">
                      Walang Kard sa Aktibong Deck
                    </h4>
                    <p className="text-slate-500 text-xs font-medium max-w-sm mx-auto">
                      Pumili ng mga kard mula sa listahan ng drafts sa kaliwa o gumawa ng bago gamit ang Gemini AI.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAIModalOpen(true)}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-full shadow-sm cursor-pointer"
                    >
                      Bumuo gamit ang AI ✨
                    </button>
                  </div>
                )}
              </div>

              {/* Randomization toggles */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md space-y-3">
                <h4 className="font-heading font-black text-slate-900 text-xs uppercase tracking-wider">
                  Randomization Settings
                </h4>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Randomize Choices</span>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        Iba-iba ang posisyon ng mga pagpipilian kada mag-aaral
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={randomizeChoices}
                      onChange={(e) => setRandomizeChoices(e.target.checked)}
                      className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Randomize Question Order</span>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        I-shuffle ang pagkakasunod-sunod ng mga tanong bago magsimula
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={randomizeQuestions}
                      onChange={(e) => setRandomizeQuestions(e.target.checked)}
                      className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary"
                    />
                  </label>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ================= STEP 3: PACING & TIMERS ================= */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md space-y-6 animate-fade-in">
          <h2 className="text-xl font-heading font-black text-slate-900">
            <Translate fil="Bilis ng Pagsusulit at Oras" en="Pacing & Time Limits" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setPacing('timed')}
              className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                pacing === 'timed'
                  ? 'border-brand-primary bg-brand-light/30 shadow-md ring-2 ring-brand-primary/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center mb-4 shadow-sm">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-black text-slate-900 mb-1">
                <Translate fil="Awtomatikong Bilis (Timed Mode)" en="Timed Mode (Auto Paced)" />
              </h3>
              <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
                <Translate
                  fil="May countdown timer kada tanong. Awtomatikong lilipat sa susunod na tanong pagkatapos ng oras."
                  en="Per-question countdown. Automatically advances to next question once time expires."
                />
              </p>
            </div>

            <div
              onClick={() => setPacing('manual')}
              className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                pacing === 'manual'
                  ? 'border-brand-primary bg-brand-light/30 shadow-md ring-2 ring-brand-primary/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center mb-4 shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-black text-slate-900 mb-1">
                <Translate fil="Mano-manong Bilis (Teacher Controlled)" en="Teacher Controlled (Manual Paced)" />
              </h3>
              <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
                <Translate
                  fil="Ang guro ang pipindot ng 'Next Question' kapag handa na ang buong klase."
                  en="The educator manually advances each question when the class is ready."
                />
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              <Translate fil="Default na Oras kada Tanong" en="Default Time Limit Per Question" />
            </label>
            <div className="flex items-center gap-3">
              {[15, 20, 30, 45, 60].map((secs) => (
                <button
                  key={secs}
                  type="button"
                  onClick={() => setDefaultTimeLimit(secs)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer ${
                    defaultTimeLimit === secs
                      ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {secs}s
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: REVEAL MODE & CONFIRM ================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md space-y-6 animate-fade-in">
          <h2 className="text-xl font-heading font-black text-slate-900">
            <Translate fil="Paghahayag ng Tamang Sagot (Reveal Mode)" en="Answer Reveal Mode" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: 'auto_per_question',
                title: 'Awtomatiko kada Tanong',
                desc: 'Ipinapakita agad ang tamang sagot pagkatapos mag-expire ang bawat tanong.'
              },
              {
                id: 'manual_per_question',
                title: 'Guro ang Magbubukas',
                desc: 'May button ang guro na "Ipakita ang Tamang Sagot" bago lumipat sa susunod.'
              },
              {
                id: 'end_of_session',
                title: 'Sa Dulo Lamang ng Sesyon',
                desc: 'Nakatago ang lahat ng tamang sagot at leaderboard hanggang sa opisyal na pagtatapos.'
              }
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => setRevealMode(item.id as any)}
                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${
                  revealMode === item.id
                    ? 'border-brand-primary bg-brand-light/30 shadow-md ring-2 ring-brand-primary/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <h3 className="text-sm font-heading font-black text-slate-900 mb-1">{item.title}</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Review Summary */}
          <div className="pt-6 border-t border-slate-100 bg-slate-50 p-6 rounded-3xl space-y-2">
            <h4 className="font-heading font-black text-slate-900 text-sm uppercase tracking-wider">
              Buod ng Sesyon
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-600 pt-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Mode</span>
                <span className="text-slate-900 font-extrabold">{mode === 'group' ? 'Pangkatang Mode' : 'Indibidwal'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Kapasidad</span>
                <span className="text-slate-900 font-extrabold">{capacity} mag-aaral</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Bilang ng Kard</span>
                <span className="text-brand-primary font-black text-sm">{selectedCards.length} Kard</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Bilis</span>
                <span className="text-slate-900 font-extrabold">{pacing === 'timed' ? `${defaultTimeLimit}s kada tanong` : 'Guro ang magkokontrol'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep - 1)}
            className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold rounded-full text-xs md:text-sm shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <Translate fil="Nakaraang Hakbang" en="Previous Step" />
          </button>
        ) : <div />}

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={() => {
              if (currentStep === 2 && selectedCards.length === 0) {
                setError('Pumili ng kahit isang kard bago magpatuloy.')
                return
              }
              setError(null)
              setCurrentStep(currentStep + 1)
            }}
            className="px-8 py-3 bg-brand-primary hover:bg-slate-800 text-white font-extrabold rounded-full text-xs md:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <span><Translate fil="Susunod na Hakbang" en="Next Step" /></span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreateSession}
            disabled={isPending || selectedCards.length === 0}
            className="px-8 py-3.5 bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black rounded-full text-sm shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Inihahanda ang Live Session...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Simulan ang Live Session (Buksan ang Lobby) ➔</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* IN-WIZARD CARD EDIT MODAL */}
      {editingCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 shadow-2xl relative animate-scale-up space-y-4 my-8">
            <button
              onClick={() => setEditingCard(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-heading font-black text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-brand-primary" />
              <span>I-edit ang Tanong / Kard</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Tanong (Question Prompt)
                </label>
                <textarea
                  rows={2}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-brand-primary focus:bg-white outline-hidden resize-none"
                />
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditType('multiple_choice')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    editType === 'multiple_choice'
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('fill_blank')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    editType === 'fill_blank'
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Punan ang Patlang
                </button>
              </div>

              {/* Options Editor */}
              {editType === 'multiple_choice' && (
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Mga Pagpipilian (Pindutin ang bilog para itakda ang Tamang Sagot)
                  </label>
                  {editOptions.map((opt, oIdx) => {
                    const isSelectedAsCorrect = String(editCorrectAnswer) === String(opt) || String(editCorrectAnswer) === String(oIdx)

                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditCorrectAnswer(opt)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                            isSelectedAsCorrect
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300 hover:border-emerald-400'
                          }`}
                          title="Itakda bilang tamang sagot"
                        >
                          {isSelectedAsCorrect && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...editOptions]
                            newOpts[oIdx] = e.target.value
                            setEditOptions(newOpts)
                            if (isSelectedAsCorrect) {
                              setEditCorrectAnswer(e.target.value)
                            }
                          }}
                          placeholder={`Opsyon ${oIdx + 1}`}
                          className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-primary focus:bg-white outline-hidden ${
                            isSelectedAsCorrect ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950 font-bold' : 'border-slate-200'
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Fill blank answer */}
              {editType === 'fill_blank' && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Tamang Sagot
                  </label>
                  <input
                    type="text"
                    value={editCorrectAnswer}
                    onChange={(e) => setEditCorrectAnswer(e.target.value)}
                    placeholder="Ilagay ang tamang sagot..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-brand-primary focus:bg-white outline-hidden"
                  />
                </div>
              )}

              {/* Time Override */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Oras para sa Kard na Ito (Segundo)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={editTimeLimit || defaultTimeLimit}
                  onChange={(e) => setEditTimeLimit(parseInt(e.target.value, 10) || defaultTimeLimit)}
                  className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary focus:bg-white outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs cursor-pointer"
              >
                Kanselahin
              </button>
              <button
                type="button"
                onClick={saveCardEdit}
                className="px-6 py-2.5 bg-brand-primary hover:bg-slate-800 text-white font-extrabold rounded-full text-xs shadow-md cursor-pointer"
              >
                I-save ang Pagbabago
              </button>
            </div>

          </div>
        </div>
      )}

      {/* AI GENERATOR MODAL */}
      <AIQuestionGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onAddCards={handleAddAICards}
      />

    </div>
  )
}
