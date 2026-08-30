'use client'

import { useState, useEffect, useMemo } from 'react'
import { submitQuizAttempt } from '@/app/student/quiz/actions'
import { 
  ArrowLeft, Clock, CheckCircle2, XCircle, ChevronRight, 
  Loader2, Play, FileQuestion, Zap, Shield, HeartPulse, 
  Flame, Trophy, CalendarClock, RotateCcw, Award, Sparkles 
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Translate } from '@/components/Translate'

export function QuizPlayer({ quiz, cards, pastAttemptsCount = 0 }: { quiz: any, cards: any[], pastAttemptsCount?: number }) {
  const router = useRouter()
  const [hasStarted, setHasStarted] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  
  // Game State
  const card = cards[currentIdx]
  const [timeLeft, setTimeLeft] = useState(card?.time_limit_override || quiz.time_limit_seconds || 15)
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sentence Scramble State (track selected token indices)
  const [scrambleSelectedIndices, setScrambleSelectedIndices] = useState<number[]>([])

  // V2 Specific Modes State
  const [strikes, setStrikes] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [streakScore, setStreakScore] = useState(0)
  const [eliminated, setEliminated] = useState(false)

  // Calculate total max score across all cards
  const totalMaxScore = useMemo(() => {
    return cards.reduce((sum, c) => {
      const pts = c.points || (quiz.id === 'level-2' ? 2 : quiz.id === 'level-3' ? 3 : 1)
      return sum + pts
    }, 0)
  }, [cards, quiz.id])

  const currentCardPoints = card?.points || (quiz.id === 'level-2' ? 2 : quiz.id === 'level-3' ? 3 : 1)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (hasStarted && !isEvaluating && !isFinished && !eliminated && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft((prev: number) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && !isEvaluating && !isFinished && !eliminated) {
      handleTimeOut()
    }
    return () => clearTimeout(timer)
  }, [hasStarted, isEvaluating, isFinished, eliminated, timeLeft])

  const startQuiz = () => {
    setHasStarted(true)
    setTimeLeft(card?.time_limit_override || quiz.time_limit_seconds || 15)
    setScrambleSelectedIndices([])
    setTextAnswer('')
    setSelectedAnswer(null)
  }

  const handleTimeOut = () => {
    setIsEvaluating(true)
    setIsCorrect(false)
    processResult(false)
    setTimeout(() => {
      goToNextCard()
    }, 2000)
  }

  // Answer verification helper
  const submitAnswer = () => {
    if (isEvaluating || isFinished || eliminated) return
    setIsEvaluating(true)

    let correct = false
    if (card.question_type === 'multiple_choice') {
      correct = selectedAnswer === card.correct_answer
    } else if (card.question_type === 'fill_blank') {
      const normalizeText = (str: string) => (str || '').toLowerCase().replace(/['"’`]/g, "'").trim()
      const cleanText = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const userNorm = normalizeText(textAnswer)
      const correctNorm = normalizeText(String(card.correct_answer || ''))
      correct = userNorm === correctNorm || cleanText(textAnswer) === cleanText(String(card.correct_answer || ''))
    } else if (card.question_type === 'sentence_scramble') {
      const normalizeSentence = (str: string) => 
        (str || '').toLowerCase().replace(/['"’“”,.!?\-–—]/g, ' ').replace(/\s+/g, ' ').trim()
      
      const userSentence = scrambleSelectedIndices
        .map(i => card.scrambled_words?.[i] || '')
        .join(' ')
      
      const correctSentence = card.correct_sentence || ''
      correct = normalizeSentence(userSentence) === normalizeSentence(correctSentence)
    }
    
    setIsCorrect(correct)
    processResult(correct)

    setTimeout(() => {
      goToNextCard()
    }, 1800)
  }

  const processResult = (correct: boolean) => {
    if (correct) {
      setScore(s => s + currentCardPoints)
      setCorrectCount(c => c + 1)
      const newStreak = currentStreak + 1
      setCurrentStreak(newStreak)
      if (newStreak > longestStreak) setLongestStreak(newStreak)
      
      // Points calculation
      const multiplier = quiz.game_mode === 'survival' && quiz.streak_multiplier ? Math.min(1 + Math.floor(newStreak / 3) * 0.5, 3) : 1
      setStreakScore(s => s + (currentCardPoints * 100 * multiplier))
    } else {
      setCurrentStreak(0)
      if (quiz.game_mode === 'survival') {
        const newStrikes = strikes + 1
        setStrikes(newStrikes)
        if (newStrikes >= (quiz.survival_strikes || 3)) {
          setEliminated(true)
          return
        }
      }
    }
  }

  const goToNextCard = () => {
    if (eliminated) {
      finishQuiz()
      return
    }

    if (currentIdx < cards.length - 1) {
      const nextIdx = currentIdx + 1
      setCurrentIdx(nextIdx)
      setIsEvaluating(false)
      setIsCorrect(null)
      setSelectedAnswer(null)
      setTextAnswer('')
      setScrambleSelectedIndices([])
      setTimeLeft(cards[nextIdx]?.time_limit_override || quiz.time_limit_seconds || 15)
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = async () => {
    setIsFinished(true)
    setIsSaving(true)

    // Calculate final score
    const finalScore = score + (isCorrect ? currentCardPoints : 0)

    // Persist practice progress in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`completed_${quiz.id}`, 'true')
        const prevHigh = parseInt(localStorage.getItem(`score_${quiz.id}`) || '0', 10)
        if (finalScore > prevHigh) {
          localStorage.setItem(`score_${quiz.id}`, String(finalScore))
        }

        // Save to local practice attempts array for instant offline/unconnected stats
        const existingLocal = JSON.parse(localStorage.getItem('gramatek_practice_attempts') || '[]')
        existingLocal.push({
          id: `practice_${Date.now()}`,
          quiz_id: quiz.id,
          quiz_title: quiz.title,
          score: finalScore,
          total_questions: totalMaxScore,
          game_mode: quiz.game_mode,
          streak_max: longestStreak,
          streak_score: streakScore,
          completed_at: new Date().toISOString()
        })
        localStorage.setItem('gramatek_practice_attempts', JSON.stringify(existingLocal))
      } catch (err) {
        console.warn('LocalStorage save error:', err)
      }
    }

    // Persist attempt to Supabase
    try {
      await submitQuizAttempt(
        quiz.id, 
        finalScore,
        totalMaxScore,
        0,
        {
          game_mode: quiz.game_mode,
          quiz_title: quiz.title,
          cards_count: cards.length
        },
        {
          game_mode: quiz.game_mode,
          streak_max: longestStreak,
          streak_score: streakScore,
          eliminated_at_card: eliminated ? currentIdx + 1 : null
        }
      )
    } catch(e) {
      console.error('Quiz submission notice:', e)
    }
    setIsSaving(false)
  }

  // Sentence Scramble handlers
  const handleToggleWord = (tokenIndex: number) => {
    if (isEvaluating) return
    setScrambleSelectedIndices(prev => {
      if (prev.includes(tokenIndex)) {
        return prev.filter(i => i !== tokenIndex)
      } else {
        return [...prev, tokenIndex]
      }
    })
  }

  const handleResetSentence = () => {
    if (isEvaluating) return
    setScrambleSelectedIndices([])
  }

  // Next level helper
  const getNextLevelInfo = () => {
    if (quiz.id === 'level-1') return { id: 'level-2', label: 'Antas 2 – Pagpupuno ng Patlang' }
    if (quiz.id === 'level-2') return { id: 'level-3', label: 'Antas 3 – Pagbuo ng Pangungusap' }
    return null
  }

  const nextLevel = getNextLevelInfo()

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 text-center animate-fade-in bg-slate-50 overflow-y-auto custom-scrollbar">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-[120px]" />
        <div className="max-w-2xl w-full relative z-10 bg-white p-8 md:p-12 rounded-3xl border border-slate-200 flex flex-col items-center shadow-xl my-auto">
           
           {quiz.game_mode === 'mastery' && (
             <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold border border-slate-200 mb-6">
               <Trophy className="w-4 h-4" /> <Translate fil="Mode ng Masteriya" en="Mastery Mode" />
             </span>
           )}
           {quiz.game_mode === 'scheduled' && (
             <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold border border-slate-200 mb-6">
               <CalendarClock className="w-4 h-4" /> <Translate fil="Nakatakdang Misyon" en="Scheduled Mission" />
             </span>
           )}
           {quiz.game_mode === 'survival' && (
             <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-bold border border-rose-200 mb-6">
               <Zap className="w-4 h-4" /> <Translate fil="Mode ng Kaligtasan" en="Survival Mode" />
             </span>
           )}

           <h1 className="text-3xl md:text-5xl font-heading font-black text-slate-900 mb-4 leading-tight">{quiz.title}</h1>
           <p className="text-slate-600 mb-8 max-w-lg font-medium">{quiz.description}</p>
           
           <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-10 text-sm font-bold text-slate-700">
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                <FileQuestion className="w-5 h-5 text-brand-primary" /> {cards.length} <Translate fil="Aytem" en="Items" />
             </div>
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                <Award className="w-5 h-5 text-amber-500" /> {totalMaxScore} <Translate fil="Kabuuang Puntos" en="Max Points" />
             </div>
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                <Clock className="w-5 h-5 text-orange-500" /> {quiz.time_limit_seconds}s <Translate fil="bawat aytem" en="per item" />
             </div>
             {quiz.game_mode === 'survival' && (
               <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                  <Shield className="w-5 h-5 text-rose-500" /> {quiz.survival_strikes} <Translate fil="Strike" en="Strikes" />
               </div>
             )}
           </div>

           {quiz.game_mode === 'mastery' && quiz.max_attempts && (
             <p className="text-slate-600 font-bold mb-8"><Translate fil="Pagtatangka" en="Attempt" /> {pastAttemptsCount + 1} / {quiz.max_attempts}</p>
           )}
           
           <button onClick={startQuiz} className="group relative px-10 py-5 bg-brand-primary hover:bg-slate-600 rounded-full text-white font-black text-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-105 active:scale-95 duration-200">
             <span className="flex items-center gap-3">
               <Play className="w-6 h-6 fill-white" />
               <Translate fil="SIMULAN ANG LARO" en="START GAME" />
             </span>
           </button>
           
           <Link href={quiz.is_practice ? '/student/practice' : `/student/classrooms/${quiz.classroom_id}`} className="mt-8 text-slate-500 hover:text-slate-800 transition-colors text-sm font-bold">
             {quiz.is_practice ? <Translate fil="Bumalik sa Pagsasanay" en="Back to Practice Hub" /> : <Translate fil="Bumalik sa Silid-aralan" en="Back to Classroom" />}
           </Link>
        </div>
      </div>
    )
  }

  if (isFinished) {
    const pct = totalMaxScore > 0 ? Math.round((score / totalMaxScore) * 100) : 0
    const isPassing = pct >= 60

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 text-center animate-fade-in bg-slate-50 overflow-y-auto custom-scrollbar">
         <div className="max-w-xl w-full relative z-10 bg-white p-8 md:p-10 rounded-3xl border border-slate-200 flex flex-col items-center my-auto shadow-xl">
            
            <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mb-4 shadow-sm">
              <Sparkles className="w-8 h-8 text-brand-primary" />
            </div>

            <h1 className={`text-3xl md:text-4xl font-heading font-black mb-2 ${eliminated ? 'text-rose-600' : 'text-slate-900'}`}>
              {eliminated ? <Translate fil="Tanggal!" en="Eliminated!" /> : <Translate fil="Natapos ang Antas!" en="Level Complete!" />}
            </h1>
            <p className="text-slate-600 font-medium mb-8">
              {eliminated 
                ? <Translate fil={`Nakaligtas ka sa ${currentIdx} na round.`} en={`You survived ${currentIdx} rounds.`} /> 
                : <Translate fil={`Nakamit mo ang ${score} sa kabuuang ${totalMaxScore} puntos!`} en={`You scored ${score} out of ${totalMaxScore} total points!`} />
              }
            </p>
            
            <div className="relative mb-8">
              <svg className="w-44 h-44 transform -rotate-90">
                <circle cx="88" cy="88" r="78" className="stroke-slate-100" strokeWidth="12" fill="transparent" />
                <circle 
                  cx="88" 
                  cy="88" 
                  r="78" 
                  className={`transition-all duration-1000 ease-out ${eliminated ? 'stroke-rose-500' : 'stroke-brand-primary'}`} 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray="490" 
                  strokeDashoffset={490 - (490 * (totalMaxScore > 0 ? score / totalMaxScore : 0))} 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                 <span className="text-4xl font-black font-heading tracking-tighter">{score}</span>
                 <span className="text-slate-500 font-bold text-sm">/ {totalMaxScore} pts</span>
                 <span className="text-xs font-extrabold text-brand-primary mt-1">{pct}%</span>
              </div>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm">
                <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5"><Translate fil="Pinakamahabang Streak" en="Max Streak" /></p>
                <p className="text-xl font-black text-slate-900">{longestStreak} 🔥</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm">
                <Award className="w-5 h-5 text-brand-primary mx-auto mb-1" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5"><Translate fil="Tamang Sagot" en="Accuracy" /></p>
                <p className="text-xl font-black text-slate-900">{correctCount} / {cards.length}</p>
              </div>
            </div>

            {isSaving ? (
               <div className="flex items-center justify-center text-slate-500 font-bold text-sm gap-2 my-4">
                 <Loader2 className="w-4 h-4 animate-spin" /> <Translate fil="Sini-save ang resulta..." en="Saving results..." />
               </div>
            ) : (
               <div className="flex flex-col gap-3 w-full">
                 {/* Next level button if available */}
                 {quiz.is_practice && nextLevel && (
                   <Link 
                     href={`/student/practice/${nextLevel.id}?mode=${quiz.game_mode}`} 
                     className="w-full py-4 bg-brand-primary hover:bg-slate-600 text-white font-extrabold text-lg rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 group"
                   >
                     <span><Translate fil="Pumunta sa Susunod na Antas" en="Proceed to Next Level" /> ➔</span>
                   </Link>
                 )}

                 {quiz.is_practice && !nextLevel && (
                   <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-bold text-center">
                     🎉 <Translate fil="Binabati kita! Natapos mo ang lahat ng 3 Antas!" en="Congratulations! You completed all 3 Levels!" />
                   </div>
                 )}

                 <div className="flex gap-3 w-full mt-2">
                   <Link 
                     href={quiz.is_practice ? '/student/practice' : `/student/classrooms/${quiz.classroom_id}`} 
                     className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-center border border-slate-200 text-sm"
                   >
                     {quiz.is_practice ? <Translate fil="Pagsasanay" en="Practice Hub" /> : <Translate fil="Silid-aralan" en="Classroom" />}
                   </Link>
                   <Link 
                     href="/student/performance" 
                     className="flex-1 py-3.5 bg-brand-secondary hover:bg-amber-600 text-white font-bold rounded-2xl transition-colors shadow-sm text-center text-sm"
                   >
                     <Translate fil="Aking Pag-unlad" en="My Growth" /> ➔
                   </Link>
                 </div>
               </div>
            )}

         </div>
      </div>
    )
  }

  const progressPct = ((currentIdx + (isEvaluating && !eliminated ? 1 : 0)) / cards.length) * 100
  const currentMultiplier = quiz.game_mode === 'survival' && quiz.streak_multiplier ? Math.min(1 + Math.floor(currentStreak / 3) * 0.5, 3) : 1

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col overflow-hidden h-[100dvh] max-h-[100dvh] w-screen max-w-screen select-none">
      
      <div className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${isEvaluating ? (isCorrect ? 'bg-emerald-50/50' : 'bg-rose-50/50') : 'bg-transparent'}`} />

      {/* Top Header - Fixed & Pinned */}
      <header className="h-16 md:h-20 w-full px-4 md:px-8 flex items-center justify-between shrink-0 bg-white shadow-sm border-b border-slate-200 z-20">
         <div className="flex items-center gap-3 md:gap-4 text-slate-700">
           <Link href={quiz.is_practice ? '/student/practice' : `/student/classrooms/${quiz.classroom_id}`} className="hover:text-brand-primary transition-colors p-2 rounded-xl hover:bg-slate-100">
             <ArrowLeft className="w-5 h-5" />
           </Link>
           <div>
             <span className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-wider block truncate max-w-[150px] md:max-w-none">{quiz.title}</span>
             <span className="font-heading font-black text-slate-900 text-sm md:text-base">Aytem {currentIdx + 1} / {cards.length}</span>
           </div>
         </div>

         {/* V2 Survival Mode HUD */}
         {quiz.game_mode === 'survival' && (
           <div className="flex items-center gap-3 md:gap-6">
             {quiz.streak_multiplier && currentStreak > 0 && (
               <div className="flex items-center gap-1.5 text-orange-600 font-bold bg-orange-50 px-2.5 py-1 rounded-full animate-fade-in border border-orange-200 shadow-sm text-xs md:text-sm">
                 <Flame className="w-4 h-4" /> 
                 {currentMultiplier}x 
                 <span className="text-[10px] opacity-75 font-medium ml-0.5 hidden sm:inline">({currentStreak} streak)</span>
               </div>
             )}
             <div className="flex items-center gap-1">
               {[...Array(quiz.survival_strikes || 3)].map((_, i) => (
                 <HeartPulse key={i} className={`w-4 h-4 md:w-5 md:h-5 ${i < ((quiz.survival_strikes || 3) - strikes) ? 'text-rose-500 fill-rose-500' : 'text-slate-300'}`} />
               ))}
             </div>
           </div>
         )}
         
         <div className="flex items-center gap-2 md:gap-3 bg-slate-100 px-3 md:px-4 py-1.5 md:py-2 rounded-2xl border border-slate-200 shadow-sm">
           <Clock className={`w-4 h-4 md:w-5 md:h-5 ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-600'}`} />
           <span className={`font-mono text-base md:text-xl font-black ${timeLeft <= 5 ? 'text-rose-600 font-black' : 'text-slate-900'}`}>{timeLeft}s</span>
         </div>
      </header>

      {/* Progress Bar - Fixed & Pinned */}
      <div className="w-full h-1.5 bg-slate-200 shrink-0 z-20">
        <div className="h-full bg-brand-primary transition-all duration-300 shadow-[0_0_10px_rgba(40,88,64,0.5)]" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Main Play Area */}
      <main className="flex-1 w-full overflow-y-auto flex flex-col items-center justify-center p-4 md:p-6 relative z-10 custom-scrollbar">
         
         {eliminated ? (
           <div className="text-center animate-fade-in bg-white p-12 rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full">
             <XCircle className="w-24 h-24 text-rose-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]" />
             <h2 className="text-4xl font-heading font-black text-slate-900 mb-2"><Translate fil="Tanggal!" en="Eliminated!" /></h2>
             <p className="text-slate-600 font-medium mb-8"><Translate fil="Wala ka nang buhay." en="You ran out of lives." /></p>
             <button onClick={finishQuiz} className="px-8 py-3 bg-brand-primary hover:bg-slate-600 shadow-md text-white rounded-full font-bold transition-all">
               <Translate fil="Magpatuloy sa Resulta" en="Continue to Results" />
             </button>
           </div>
         ) : (
           <div className="w-full max-w-3xl bg-white rounded-3xl p-6 md:p-12 border border-slate-200 shadow-xl relative animate-slide-up" key={currentIdx}>
             
             {/* Question Badge / Points Indicator */}
             <div className="flex items-center justify-between mb-6">
               <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold uppercase tracking-wider border border-slate-200">
                 {card?.question_type === 'multiple_choice' && <Translate fil="Pagpipilian (Multiple Choice)" en="Multiple Choice" />}
                 {card?.question_type === 'fill_blank' && <Translate fil="Punan ang Patlang" en="Fill in the Blank" />}
                 {card?.question_type === 'sentence_scramble' && <Translate fil="Ayusin ang Pangungusap" en="Sentence Unscramble" />}
               </span>
               <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                 +{currentCardPoints} <Translate fil="puntos" en="pts" />
               </span>
             </div>

             {/* Question Text */}
             <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-8 text-center leading-relaxed font-heading">
               {card?.question_text}
             </h2>

             {/* 1. Multiple Choice Options (Antas 1) */}
             {card?.question_type === 'multiple_choice' && card.options && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {card.options.map((opt: string, idx: number) => {
                   let btnClass = "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm"
                   if (selectedAnswer === idx) btnClass = "bg-brand-primary/10 border-brand-primary text-brand-primary font-bold shadow-md scale-[1.01]"
                   
                   if (isEvaluating) {
                     if (card.correct_answer === idx) btnClass = "bg-emerald-500 text-white border-emerald-600 scale-105 shadow-xl shadow-emerald-500/20 font-black"
                     else if (selectedAnswer === idx) btnClass = "bg-rose-50 text-rose-600 border-rose-200 shadow-sm font-bold"
                     else btnClass = "bg-slate-50 border-slate-200 text-slate-400 opacity-50 shadow-none"
                   }

                   return (
                     <button 
                       key={idx}
                       disabled={isEvaluating}
                       onClick={() => setSelectedAnswer(idx)}
                       className={`p-5 md:p-6 rounded-2xl border text-left text-base md:text-lg font-semibold transition-all duration-200 focus:outline-none flex items-center justify-between ${btnClass}`}
                     >
                       <span>{opt}</span>
                       <span className="w-7 h-7 rounded-xl border border-slate-300 flex items-center justify-center text-xs font-black text-slate-500 shrink-0 ml-3">
                         {String.fromCharCode(65 + idx)}
                       </span>
                     </button>
                   )
                 })}
               </div>
             )}

             {/* 2. Fill in the Blank with Clue (Antas 2) */}
             {card?.question_type === 'fill_blank' && (
               <div className="max-w-lg mx-auto text-center space-y-6">
                 {card.pattern_clue && (
                   <div className="bg-slate-100 py-3 px-6 rounded-2xl border border-slate-300 shadow-inner">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                       <Translate fil="Gabay na Titik" en="Letter Pattern" />:
                     </p>
                     <p className="font-mono text-2xl md:text-3xl font-black tracking-widest text-slate-800">
                       {card.pattern_clue}
                     </p>
                   </div>
                 )}

                 <input 
                   type="text" 
                   value={textAnswer}
                   onChange={(e) => setTextAnswer(e.target.value.toUpperCase())}
                   disabled={isEvaluating}
                   placeholder="I-type ang buong salita..."
                   className={`w-full bg-white border-2 rounded-2xl px-6 py-4 text-xl md:text-2xl font-black text-center tracking-wider shadow-sm focus:outline-none transition-all uppercase ${
                     isEvaluating 
                       ? isCorrect 
                         ? 'border-emerald-500 text-emerald-700 bg-emerald-50' 
                         : 'border-rose-500 text-rose-700 bg-rose-50'
                       : 'border-slate-300 text-slate-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20'
                   }`}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && textAnswer.trim()) submitAnswer()
                   }}
                   autoFocus
                 />

                 {isEvaluating && !isCorrect && (
                   <div className="mt-4 flex flex-col items-center animate-fade-in">
                      <p className="text-slate-800 font-bold shadow-sm inline-block px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl">
                        <Translate fil="Tamang sagot" en="Correct answer" />: <strong className="text-emerald-700">{card.correct_answer}</strong>
                      </p>
                   </div>
                 )}
               </div>
             )}

             {/* 3. Sentence Scramble Builder (Antas 3) */}
             {card?.question_type === 'sentence_scramble' && card.scrambled_words && (
               <div className="space-y-8">
                 {/* Active Constructed Sentence Slot */}
                 <div className="min-h-[100px] p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-wrap gap-2.5 items-center justify-start relative shadow-inner">
                   {scrambleSelectedIndices.length === 0 ? (
                     <p className="text-slate-400 font-semibold italic text-sm text-center w-full">
                       <Translate fil="I-tap ang mga salita sa ibaba upang buuin ang wastong pangungusap..." en="Tap the words below to arrange them into the correct sentence..." />
                     </p>
                   ) : (
                     scrambleSelectedIndices.map((idx, pos) => {
                       const word = card.scrambled_words[idx]
                       return (
                         <button
                           key={`sel_${idx}_${pos}`}
                           disabled={isEvaluating}
                           onClick={() => handleToggleWord(idx)}
                           className="px-4 py-2.5 bg-brand-primary hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-all transform active:scale-95 text-base flex items-center gap-1.5 animate-pop"
                           title="I-tap upang alisin"
                         >
                           <span>{word}</span>
                           <span className="text-white/60 text-xs font-mono">✕</span>
                         </button>
                       )
                     })
                   )}
                 </div>

                 {/* Word Bank Pool */}
                 <div>
                   <div className="flex items-center justify-between mb-3">
                     <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                       <Translate fil="Bangko ng mga Salita" en="Word Bank" />
                     </span>
                     {scrambleSelectedIndices.length > 0 && !isEvaluating && (
                       <button 
                         onClick={handleResetSentence}
                         className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                       >
                         <RotateCcw className="w-3.5 h-3.5" /> <Translate fil="Linisin / I-reset" en="Clear" />
                       </button>
                     )}
                   </div>

                   <div className="flex flex-wrap gap-2.5 justify-center p-4 bg-slate-100 rounded-2xl border border-slate-200">
                     {card.scrambled_words.map((word: string, idx: number) => {
                       const isSelected = scrambleSelectedIndices.includes(idx)
                       return (
                         <button
                           key={`pool_${idx}`}
                           disabled={isEvaluating || isSelected}
                           onClick={() => handleToggleWord(idx)}
                           className={`px-4 py-2.5 rounded-xl font-bold text-base transition-all duration-150 ${
                             isSelected 
                               ? 'bg-slate-200 text-slate-400 border border-slate-300 scale-95 opacity-40 cursor-not-allowed' 
                               : 'bg-white hover:bg-brand-primary hover:text-white text-slate-800 border border-slate-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95'
                           }`}
                         >
                           {word}
                         </button>
                       )
                     })}
                   </div>
                 </div>

                 {isEvaluating && !isCorrect && (
                   <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center animate-fade-in">
                     <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-1"><Translate fil="Wastong Pangungusap" en="Correct Sentence" />:</p>
                     <p className="text-slate-900 font-extrabold text-base leading-relaxed">{card.correct_sentence}</p>
                   </div>
                 )}
               </div>
             )}

             {/* Evaluating Feedback Overlay */}
             {isEvaluating && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center animate-fade-in pointer-events-none z-30">
                 {isCorrect ? (
                   <div className="bg-white/90 backdrop-blur text-emerald-500 p-8 rounded-full border border-emerald-200 shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-bounce">
                      <CheckCircle2 className="w-24 h-24" />
                   </div>
                 ) : (
                   <div className="bg-white/90 backdrop-blur text-rose-500 p-8 rounded-full border border-rose-200 shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-bounce">
                      <XCircle className="w-24 h-24" />
                   </div>
                 )}
               </div>
             )}
             
           </div>
         )}
         
         {/* Bottom Action Submit Button */}
         {!isEvaluating && !eliminated && (
           <div className="mt-8 h-16 pointer-events-none w-full max-w-3xl flex justify-end relative z-20">
             {((card?.question_type === 'multiple_choice' && selectedAnswer !== null) || 
               (card?.question_type === 'fill_blank' && textAnswer.trim() !== '') ||
               (card?.question_type === 'sentence_scramble' && scrambleSelectedIndices.length > 0)) && (
               <button 
                 onClick={submitAnswer}
                 className="pointer-events-auto px-8 py-4 bg-brand-primary hover:bg-slate-600 text-white rounded-full font-black tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 animate-slide-up active:scale-95"
               >
                 <Translate fil="IPASAGOT" en="SUBMIT" /> <ChevronRight className="w-5 h-5" />
               </button>
             )}
           </div>
         )}
      </main>

    </div>
  )
}

