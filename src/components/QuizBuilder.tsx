'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveQuiz, updateQuiz } from '@/app/educator/quizzes/actions'
import { 
  ArrowLeft, Save, FileQuestion, Plus, Trash2, GripVertical, 
  CheckCircle2, Clock, Swords, CalendarClock, Trophy, Zap, 
  Shuffle, Shield, Target, Loader2, Eye, HelpCircle, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'
import { AIQuestionGeneratorModal, GeneratedCard } from '@/components/AIQuestionGeneratorModal'

type QuestionType = 'multiple_choice' | 'fill_blank' | 'enumeration'
type GameMode = 'mastery' | 'scheduled' | 'survival'
type FeedbackTiming = 'immediate' | 'delayed'

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
  { id: 'scheduled', label: { fil: 'Nakatakdang Misyon', en: 'Scheduled Mission' }, description: { fil: 'Magtakda ng oras. Makakatanggap ng abiso ang mga mag-aaral at may skip at review bago magpasa.', en: 'Set a time window. Students can skip, review answers, and submit individually.' }, icon: CalendarClock, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200 hover:border-slate-400' },
  { id: 'survival', label: { fil: 'Mode ng Kaligtasan', en: 'Survival / Streak' }, description: { fil: 'Ginagantimpalaan ng streak multiplier ang pagiging pare-pareho. Matanggal kapag maraming mali.', en: 'Streak multipliers reward consistency. Miss too many and you\'re eliminated.' }, icon: Zap, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200 hover:border-rose-400' },
]

function formatDatetimeForInput(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}

export function QuizBuilder({ 
  classrooms, 
  defaultClassroomId,
  initialQuiz,
  initialCards
}: { 
  classrooms: any[], 
  defaultClassroomId?: string,
  initialQuiz?: any,
  initialCards?: any[]
}) {
  const router = useRouter()
  const isEditMode = !!initialQuiz

  const [classroomId, setClassroomId] = useState(
    initialQuiz?.classroom_id || defaultClassroomId || classrooms[0]?.id || ''
  )
  const [title, setTitle] = useState(initialQuiz?.title || '')
  const [description, setDescription] = useState(initialQuiz?.description || '')
  const [timeLimit, setTimeLimit] = useState(initialQuiz?.time_limit_seconds || 60)
  
  // Cards State
  const [cards, setCards] = useState<CardData[]>(() => {
    if (initialCards && initialCards.length > 0) {
      return initialCards.map((c: any) => ({
        id: c.id || Math.random().toString(36).substr(2, 9),
        type: c.question_type || c.type || 'multiple_choice',
        text: c.question_text || c.text || '',
        options: c.options || (c.question_type === 'multiple_choice' ? ['', '', '', ''] : undefined),
        correctAnswer: c.correct_answer !== undefined ? c.correct_answer : c.correctAnswer,
        timeLimitOverride: c.time_limit_override || c.timeLimitOverride || null
      }))
    }
    return []
  })
  
  // Game Mode State
  const [gameMode, setGameMode] = useState<GameMode>(initialQuiz?.game_mode || 'mastery')
  const [maxAttempts, setMaxAttempts] = useState<number | null>(
    initialQuiz?.max_attempts !== undefined ? initialQuiz.max_attempts : 3
  )
  const [scoringMethod, setScoringMethod] = useState<'highest' | 'average'>(
    initialQuiz?.scoring_method || 'highest'
  )
  const [scheduledStart, setScheduledStart] = useState(
    formatDatetimeForInput(initialQuiz?.scheduled_start)
  )
  const [scheduledEnd, setScheduledEnd] = useState(
    formatDatetimeForInput(initialQuiz?.scheduled_end)
  )
  const [survivalStrikes, setSurvivalStrikes] = useState(initialQuiz?.survival_strikes || 3)
  const [streakMultiplier, setStreakMultiplier] = useState(
    initialQuiz?.streak_multiplier !== undefined ? initialQuiz.streak_multiplier : true
  )
  const [shuffleQuestions, setShuffleQuestions] = useState(
    initialQuiz?.shuffle_questions || false
  )
  const [shuffleOptions, setShuffleOptions] = useState(
    initialQuiz?.shuffle_options || false
  )
  
  // Feedback Timing (Answer Reveal) State
  const [feedbackTiming, setFeedbackTiming] = useState<FeedbackTiming>(
    initialQuiz?.feedback_timing || 'immediate'
  )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  const handleAddAICards = (aiCards: GeneratedCard[]) => {
    const newCards: CardData[] = aiCards.map((c) => ({
      id: c.id || Math.random().toString(36).substr(2, 9),
      type: (c.question_type as QuestionType) || 'multiple_choice',
      text: c.question_text,
      options: c.options || (c.question_type === 'multiple_choice' ? ['', '', '', ''] : undefined),
      correctAnswer: c.correct_answer,
      timeLimitOverride: c.time_limit || null
    }))

    setCards((prev) => [...prev, ...newCards])
  }

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
    if (!classroomId || !title.trim()) return alert('Classroom and Title are required.')
    if (cards.length === 0) return alert('Add at least one question.')
    if (gameMode === 'scheduled') {
      if (!scheduledStart || !scheduledEnd) return alert('Scheduled missions require a start and end time.')
      if (new Date(scheduledEnd) <= new Date(scheduledStart)) return alert('End time must be after start time.')
    }
    
    setIsSubmitting(true)
    try {
      const config = {
        gameMode,
        maxAttempts: gameMode === 'mastery' ? maxAttempts : null,
        scoringMethod: gameMode === 'mastery' ? scoringMethod : 'highest',
        scheduledStart: gameMode === 'scheduled' ? scheduledStart : null,
        scheduledEnd: gameMode === 'scheduled' ? scheduledEnd : null,
        survivalStrikes: gameMode === 'survival' ? survivalStrikes : 3,
        streakMultiplier: gameMode === 'survival' ? streakMultiplier : false,
        shuffleQuestions,
        shuffleOptions,
        feedbackTiming,
      }

      let res
      if (isEditMode) {
        res = await updateQuiz(
          initialQuiz.id,
          classroomId,
          title,
          description,
          timeLimit,
          is_published,
          cards,
          config
        )
      } else {
        res = await saveQuiz(
          classroomId,
          title,
          description,
          timeLimit,
          is_published,
          cards,
          config
        )
      }

      if (res?.error) {
        alert(res.error)
        setIsSubmitting(false)
        return
      }

      const targetQuizId = res?.quizId || initialQuiz?.id
      if (targetQuizId) {
        router.push(`/educator/quizzes/${targetQuizId}`)
        router.refresh()
      }
    } catch (e: any) {
      console.error('Failed to save quiz:', e)
      setIsSubmitting(false)
      alert(e?.message || 'Failed to save quiz.')
    }
  }

  const selectedMode = GAME_MODES.find(m => m.id === gameMode)!

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in relative z-10">
      
      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link 
          href={
            isEditMode 
              ? `/educator/quizzes/${initialQuiz.id}` 
              : defaultClassroomId 
              ? `/educator/classrooms/${defaultClassroomId}` 
              : "/educator"
          } 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <Translate fil="Bumalik" en="Back" />
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-full text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEditMode ? (
              <Translate fil="I-save bilang Draft / Withdrawn" en="Save as Draft / Withdrawn" />
            ) : (
              <Translate fil="I-save bilang Draft" en="Save Draft" />
            )}
          </button>
          
          <button 
            disabled={isSubmitting}
            onClick={() => handleSave(true)}
            className="px-6 py-2 bg-brand-primary hover:bg-slate-600 text-white rounded-full text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <Translate fil="Sini-save..." en="Saving..." />
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> 
                {isEditMode ? (
                  <Translate fil="I-update at I-publish" en="Update & Publish" />
                ) : (
                  <Translate fil="I-publish para Mai-play" en="Publish Playable" />
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Mode Notice Banner */}
      {isEditMode && (
        <div className="mb-6 p-4 bg-slate-100 border border-slate-300 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-brand-primary" />
            <div>
              <p className="text-slate-900 font-heading font-bold text-sm">
                <Translate fil="Nasa Mode ng Pag-eedit ng Pagsusulit" en="Currently Editing Quiz" />
              </p>
              <p className="text-slate-500 text-xs font-medium">
                {initialQuiz.is_published 
                  ? <Translate fil="Nailathala ang pagsusulit na ito. Maaari mo itong baguhin o i-save muli." en="This quiz is currently published. You can modify cards and settings." />
                  : <Translate fil="Naka-draft / withdrawn ang pagsusulit na ito." en="This quiz is currently drafted / withdrawn." />
                }
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold ${initialQuiz.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {initialQuiz.is_published ? 'Nailathala' : 'Draft / Withdrawn'}
          </span>
        </div>
      )}

      {/* ── Game Mode Selector ── */}
      <div className="bg-white rounded-3xl p-8 mb-8 border border-slate-200 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -ml-32 -mt-32 pointer-events-none" />
        
        <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2 relative z-10 flex items-center gap-2">
          <Swords className="w-6 h-6 text-brand-primary" />
          <Translate fil="Mode ng Laro" en="Game Mode" />
        </h2>
        <p className="text-slate-600 text-sm mb-6 relative z-10 font-medium">
          <Translate fil="Piliin kung paano mararanasan ng mga mag-aaral ang pagsusulit na ito." en="Choose how students will experience this quiz." />
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {GAME_MODES.map((mode) => {
            const Icon = mode.icon
            const isSelected = gameMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => setGameMode(mode.id)}
                className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected 
                    ? `${mode.bg} scale-[1.02] shadow-md ring-1 ring-slate-200` 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 shadow-sm'
                }`}
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
                  type="button"
                  onClick={() => setScoringMethod('highest')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border cursor-pointer ${scoringMethod === 'highest' ? 'bg-slate-500 text-white border-slate-600 shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'}`}
                >
                  🏆 <Translate fil="Pinakamataas na Iskor" en="Highest Score" />
                </button>
                <button
                  type="button"
                  onClick={() => setScoringMethod('average')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border cursor-pointer ${scoringMethod === 'average' ? 'bg-slate-500 text-white border-slate-600 shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'}`}
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
          <p className="text-xs text-slate-700/80 font-medium mt-3">
            <Translate fil="Makakatanggap ng abiso ang mga mag-aaral kapag bukas na ang pagsusulit. Maaari silang mag-skip at mag-review bago magpasa." en="Students enrolled in this classroom will receive a notification and can skip & review answers before final submission." />
          </p>
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
                    type="button"
                    onClick={() => setSurvivalStrikes(n)}
                    className={`w-12 h-12 rounded-xl border text-lg font-bold transition-all shadow-sm cursor-pointer ${survivalStrikes === n ? 'bg-rose-500 border-rose-600 text-white' : 'bg-white border-rose-200 text-rose-600 hover:bg-rose-100'}`}
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
                type="button"
                onClick={() => setStreakMultiplier(!streakMultiplier)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all border shadow-sm cursor-pointer ${streakMultiplier ? 'bg-rose-500 border-rose-600 text-white' : 'bg-white border-rose-200 text-rose-600 hover:bg-rose-100'}`}
              >
                {streakMultiplier ? <Translate fil="🔥 Bukas — Dumadami ang puntos kapag sunod-sunod ang tama" en="🔥 Enabled — Points multiply on streaks" /> : <Translate fil="Sarado — Flat na pagmamarka" en="Disabled — Flat scoring" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback Reveal Timing Settings (Mastery & Scheduled) ── */}
      <div className="bg-white rounded-3xl p-8 mb-8 border border-slate-200 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] -mr-24 -mt-24 pointer-events-none" />
        
        <h2 className="text-xl font-heading font-bold text-slate-900 mb-2 relative z-10 flex items-center gap-2">
          <Eye className="w-5 h-5 text-brand-primary" />
          <Translate fil="Oras ng Pagpapakita ng Tamang Sagot at Iskor" en="Answer & Score Feedback Timing" />
        </h2>
        <p className="text-slate-600 text-sm mb-6 relative z-10 font-medium">
          <Translate 
            fil="Piliin kung kailan makikita ng mag-aaral ang tamang sagot at ang kanilang kabuuang marka." 
            en="Choose when students will see correct answers and their final score." 
          />
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {/* Option 1: Immediate / Every Question */}
          <button
            type="button"
            onClick={() => setFeedbackTiming('immediate')}
            className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
              feedbackTiming === 'immediate'
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400 shadow-md scale-[1.01]'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
                  <CheckCircle2 className={`w-5 h-5 ${feedbackTiming === 'immediate' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <Translate fil="Bawat Pagkatapos ng Tanong" en="After Every Question" />
                </span>
                {feedbackTiming === 'immediate' && (
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-[10px] font-extrabold rounded-md">Aktibo</span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                <Translate 
                  fil="Ipinapakita agad kung tama o mali ang sagot at ibinubunyag ang tamang sagot pagkatapos sagutan ang bawat aytem." 
                  en="Shows immediate right/wrong feedback and reveals the correct answer right after each question." 
                />
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
              <span>💡</span> <Translate fil="Angkop para sa aktibong pagsasanay" en="Great for active practice" />
            </div>
          </button>

          {/* Option 2: Delayed / After Whole Test */}
          <button
            type="button"
            onClick={() => setFeedbackTiming('delayed')}
            className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
              feedbackTiming === 'delayed'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400 shadow-md scale-[1.01]'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
                  <Trophy className={`w-5 h-5 ${feedbackTiming === 'delayed' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <Translate fil="Pagkatapos ng Buong Pagsusulit" en="After Whole Test" />
                </span>
                {feedbackTiming === 'delayed' && (
                  <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-[10px] font-extrabold rounded-md">Aktibo</span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                <Translate 
                  fil="Walang sagot na ipinapakita habang sumasagot. Ang kabuuang iskor at pagsusuri ng mga tanong ay makikita lamang matapos ipasa ang buong pagsusulit." 
                  en="No answers are shown during the test. Total score and answer review are revealed only after submitting the whole test." 
                />
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
              <span>📝</span> <Translate fil="Angkop para sa pormal na eksaminasyon at misyon" en="Ideal for formal exams and missions" />
            </div>
          </button>
        </div>
      </div>

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
            <select 
              value={classroomId} 
              onChange={(e) => setClassroomId(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all appearance-none shadow-sm"
            >
              <option value="" disabled><Translate fil="Pumili ng Silid..." en="Select Classroom..." /></option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700"><Translate fil="Pamagat ng Pagsusulit" en="Quiz Title" /></label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kabanata 1: Mga Bahagi ng Pananalita"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700"><Translate fil="Paglalarawan" en="Description" /></label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tungkol saan ang pagsusulit na ito?"
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700"><Translate fil="Oras Bawat Tanong" en="Default Time per Question" /></label>
              <select 
                value={timeLimit} 
                onChange={(e) => setTimeLimit(Number(e.target.value))} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all appearance-none shadow-sm"
              >
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
                  type="button"
                  onClick={() => setShuffleQuestions(!shuffleQuestions)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                    shuffleQuestions ? 'bg-violet-100 border-violet-300 text-violet-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Shuffle className="w-4 h-4" /> <Translate fil="Mga Tanong" en="Questions" />
                </button>
                <button
                  type="button"
                  onClick={() => setShuffleOptions(!shuffleOptions)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                    shuffleOptions ? 'bg-violet-100 border-violet-300 text-violet-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-2xl font-heading font-black text-slate-900">
            <Translate fil="Mga Card ng Pagsusulit" en="Deck Cards" /> ({cards.length})
          </h2>

          <button
            type="button"
            onClick={() => setIsAIModalOpen(true)}
            className="px-4 py-2 bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black rounded-xl text-xs md:text-sm shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span><Translate fil="Bumuo gamit ang AI (Gemini)" en="Generate with AI (Gemini)" /> ✨</span>
          </button>
        </div>

        {cards.map((card, index) => (
          <div key={card.id} className="bg-white rounded-xl p-6 relative group border border-slate-200 animate-slide-up shadow-sm">
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                type="button"
                onClick={() => removeCard(card.id)} 
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-colors border border-red-100 cursor-pointer"
                title="Burahin ang tanong"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-primary">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                <span className="font-mono text-sm font-bold uppercase tracking-wider">
                  <Translate fil={`Card ${index + 1} - ${card.type.replace('_', ' ')}`} en={`Card ${index + 1} - ${card.type.replace('_', ' ')}`} />
                </span>
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
                         type="button"
                         onClick={() => updateCard(card.id, { correctAnswer: i })}
                         className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                           card.correctAnswer === i ? 'bg-slate-500 border-slate-500 text-white' : 'border-slate-300 hover:border-slate-400'
                         }`}
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
                         className={`flex-1 bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-brand-primary ${
                           card.correctAnswer === i ? 'border-slate-300 bg-slate-50 shadow-sm' : 'border-slate-200'
                         }`}
                       />
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 font-medium col-span-full mt-1">
                    <Translate fil="Piliin ang bilog para itakda ang tamang sagot." en="Select the circle to mark the correct answer." />
                  </p>
                </div>
              )}

              {card.type === 'fill_blank' && (
                <div className="mt-4">
                  <label className="text-xs text-slate-500 font-bold block mb-1">
                    <Translate fil="Tamang Sagot" en="Correct Answer" />
                  </label>
                  <input 
                     type="text" 
                     placeholder="The exact word/phrase"
                     value={card.correctAnswer}
                     onChange={(e) => updateCard(card.id, { correctAnswer: e.target.value })}
                     className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-bold focus:outline-none focus:border-brand-primary transition-all shadow-sm"
                  />
                  <p className="text-xs text-slate-500 font-medium mt-2">
                    <Translate fil='Tiyaking ilagay ang nawawalang bahagi gamit ang "___" sa text ng tanong.' en='Make sure to indicate the missing part with "___" in your question text.' />
                  </p>
                </div>
              )}

            </div>
          </div>
        ))}

        {/* Add Card Menu */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-dashed border-slate-300 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500"><Translate fil="Magdagdag ng card:" en="Add new card:" /></span>
            <button 
              type="button"
              onClick={() => addCard('multiple_choice')} 
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> <Translate fil="Pagpipilian" en="Multiple Choice" />
            </button>
            <button 
              type="button"
              onClick={() => addCard('fill_blank')} 
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> <Translate fil="Punan ang Patlang" en="Fill in the Blank" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAIModalOpen(true)}
            className="px-5 py-2.5 bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <Translate fil="Bumuo gamit ang AI (Gemini)" en="Generate with AI (Gemini)" /> ✨
          </button>
        </div>
      </div>

      {/* AI Question Generator Modal */}
      <AIQuestionGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onAddCards={handleAddAICards}
      />

    </div>
  )
}
