'use client'

import { useState, useEffect } from 'react'
import { submitQuizAttempt } from '@/app/student/quiz/actions'
import { ArrowLeft, Clock, CheckCircle2, XCircle, ChevronRight, Loader2, Play, FileQuestion, Zap, Shield, HeartPulse, Flame, Trophy, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Translate } from '@/components/Translate'

export function QuizPlayer({ quiz, cards, pastAttemptsCount = 0 }: { quiz: any, cards: any[], pastAttemptsCount?: number }) {
  const router = useRouter()
  const [hasStarted, setHasStarted] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  
  // Game State
  const card = cards[currentIdx]
  const [timeLeft, setTimeLeft] = useState(card?.time_limit_override || quiz.time_limit_seconds)
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sentence Scramble State
  const [scrambleAnswer, setScrambleAnswer] = useState<string[]>([])

  // V2 Specific Modes State
  const [strikes, setStrikes] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [streakScore, setStreakScore] = useState(0) // Raw score is `score`, this is points
  const [eliminated, setEliminated] = useState(false)

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
    setTimeLeft(card?.time_limit_override || quiz.time_limit_seconds)
  }

  const handleTimeOut = () => {
    setIsEvaluating(true)
    setIsCorrect(false)
    processResult(false)
    setTimeout(() => {
      goToNextCard()
    }, 2000)
  }

  const submitAnswer = () => {
    if (isEvaluating || isFinished || eliminated) return
    setIsEvaluating(true)

    let correct = false
    if (card.question_type === 'multiple_choice') {
      correct = selectedAnswer === card.correct_answer
    } else if (card.question_type === 'fill_blank') {
      correct = textAnswer.trim().toLowerCase() === card.correct_answer.toLowerCase()
    } else if (card.question_type === 'sentence_scramble') {
      const normalizedUser = scrambleAnswer.join(' ').toLowerCase().replace(/[.,!?]/g, '').trim()
      const normalizedCorrect = card.correct_sentence.toLowerCase().replace(/[.,!?]/g, '').trim()
      correct = normalizedUser === normalizedCorrect
    }
    
    setIsCorrect(correct)
    processResult(correct)

    setTimeout(() => {
      goToNextCard()
    }, 1500)
  }

  const processResult = (correct: boolean) => {
    if (correct) {
      setScore(s => s + 1)
      const newStreak = currentStreak + 1
      setCurrentStreak(newStreak)
      if (newStreak > longestStreak) setLongestStreak(newStreak)
      
      // Points calculation
      const multiplier = quiz.game_mode === 'survival' && quiz.streak_multiplier ? Math.min(1 + Math.floor(newStreak / 3) * 0.5, 3) : 1
      setStreakScore(s => s + (100 * multiplier))
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
      setCurrentIdx(i => i + 1)
      setIsEvaluating(false)
      setIsCorrect(null)
      setSelectedAnswer(null)
      setTextAnswer('')
      setScrambleAnswer([])
      setTimeLeft(cards[currentIdx + 1]?.time_limit_override || quiz.time_limit_seconds)
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = async () => {
    setIsFinished(true)
    setIsSaving(true)
    try {
      await submitQuizAttempt(
        quiz.id, 
        score,
        cards.length,
        0, // simple MVP time tracking
        {},
        {
          game_mode: quiz.game_mode,
          streak_max: longestStreak,
          streak_score: streakScore,
          eliminated_at_card: eliminated ? currentIdx + 1 : null
        }
      )
    } catch(e) {
      console.error(e)
    }
    setIsSaving(false)
  }

  if (!hasStarted) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center animate-fade-in bg-slate-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-[120px]" />
        <div className="max-w-2xl w-full relative z-10 bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center shadow-xl">
           
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

           <h1 className="text-4xl md:text-5xl font-heading font-black text-slate-900 mb-4 leading-tight">{quiz.title}</h1>
           <p className="text-slate-600 mb-8 max-w-lg font-medium">{quiz.description}</p>
           
           <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-sm font-bold text-slate-700">
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                <FileQuestion className="w-5 h-5 text-brand-primary" /> {cards.length} <Translate fil="Mga Tanong" en="Questions" />
             </div>
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                <Clock className="w-5 h-5 text-orange-500" /> {quiz.time_limit_seconds}s <Translate fil="avg" en="avg" />
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
               <Translate fil="SIMULAN ANG PAGSUSULIT" en="START QUIZ" />
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
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center animate-fade-in bg-slate-50 overflow-y-auto">
         <div className="max-w-xl w-full relative z-10 bg-white p-10 rounded-3xl border border-slate-200 flex flex-col items-center my-8 shadow-xl">
            
            <h1 className={`text-4xl font-heading font-black mb-2 ${eliminated ? 'text-rose-600' : 'text-slate-900'}`}>
              {eliminated ? <Translate fil="Tanggal!" en="Eliminated!" /> : <Translate fil="Tapos na ang Pagsusulit!" en="Quiz Complete!" />}
            </h1>
            <p className="text-slate-600 font-medium mb-10">
              {eliminated ? <Translate fil={`Nakaligtas ka sa ${currentIdx} na round.`} en={`You survived ${currentIdx} rounds.`} /> : <Translate fil="Narito ang iyong nakuha." en="Here's how you did." />}
            </p>
            
            <div className="relative mb-12">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="88" className="stroke-slate-100" strokeWidth="12" fill="transparent" />
                <circle cx="96" cy="96" r="88" className={`transition-all duration-1000 ease-out ${eliminated ? 'stroke-rose-500' : 'stroke-brand-primary'}`} strokeWidth="12" fill="transparent" strokeDasharray="552.92" strokeDashoffset={552.92 - (552.92 * score) / cards.length} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                 <span className="text-5xl font-black font-heading tracking-tighter">{score}</span>
                 <span className="text-slate-500 font-bold">/ {cards.length}</span>
              </div>
            </div>

            {quiz.game_mode === 'survival' && (
              <div className="grid grid-cols-2 gap-4 w-full mb-10">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1"><Translate fil="Pinakamahabang Streak" en="Max Streak" /></p>
                  <p className="text-2xl font-black text-slate-900">{longestStreak}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <Zap className="w-6 h-6 text-brand-primary mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1"><Translate fil="Kabuuang Puntos" en="Total Points" /></p>
                  <p className="text-2xl font-black text-slate-900">{streakScore}</p>
                </div>
              </div>
            )}

            {isSaving ? (
               <div className="flex items-center justify-center text-slate-500 font-bold text-sm gap-2">
                 <Loader2 className="w-4 h-4 animate-spin" /> <Translate fil="Sini-save ang resulta..." en="Saving results..." />
               </div>
            ) : (
               <div className="flex gap-4 w-full">
                 {quiz.is_practice ? (
                   <div className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl text-center border border-slate-200">
                     <Translate fil="Tala ng Pagsasanay" en="Practice Record" />
                   </div>
                 ) : (
                   <Link href={`/student/quiz/${quiz.id}/results`} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-center border border-slate-200">
                     <Translate fil="Tingnan ang Kasaysayan" en="View History" />
                   </Link>
                 )}
                 <Link href={`/student/classrooms/${quiz.classroom_id}`} className="flex-1 py-4 bg-brand-primary hover:bg-slate-600 text-white font-bold rounded-2xl transition-colors shadow-md text-center">
                   <Translate fil="Bumalik sa Silid-aralan" en="Back to Classroom" />
                 </Link>
               </div>
            )}

         </div>
      </div>
    )
  }

  const progressPct = ((currentIdx + (isEvaluating && !eliminated ? 1 : 0)) / cards.length) * 100

  // Multiplier logic
  const currentMultiplier = quiz.game_mode === 'survival' && quiz.streak_multiplier ? Math.min(1 + Math.floor(currentStreak / 3) * 0.5, 3) : 1

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      
      <div className={`absolute inset-0 transition-colors duration-500 ${isEvaluating ? (isCorrect ? 'bg-slate-50' : 'bg-red-50') : 'bg-transparent'}`} />

      {/* Top Header */}
      <header className="h-20 w-full px-6 flex items-center justify-between relative z-10 bg-white shadow-sm border-b border-slate-200">
         <div className="flex items-center gap-4 text-slate-500">
           <Link href={`/student/classrooms/${quiz.classroom_id}`} className="hover:text-brand-primary transition-colors">
             <ArrowLeft className="w-5 h-5" />
           </Link>
           <span className="font-heading font-medium tracking-wide font-bold">Q. {currentIdx + 1} / {cards.length}</span>
         </div>

         {/* V2 Survival Mode HUD */}
         {quiz.game_mode === 'survival' && (
           <div className="flex items-center gap-8">
             {quiz.streak_multiplier && currentStreak > 0 && (
               <div className="flex items-center gap-2 text-orange-500 font-bold bg-orange-50 px-3 py-1 rounded-full animate-fade-in border border-orange-200 shadow-sm">
                 <Flame className="w-4 h-4" /> 
                 {currentMultiplier}x 
                 <span className="text-xs opacity-75 font-medium ml-1">({currentStreak} <Translate fil="streak" en="streak" />)</span>
               </div>
             )}
             <div className="flex items-center gap-2">
               {[...Array(quiz.survival_strikes)].map((_, i) => (
                 <HeartPulse key={i} className={`w-5 h-5 ${i < (quiz.survival_strikes - strikes) ? 'text-rose-500 fill-rose-500' : 'text-slate-300'}`} />
               ))}
             </div>
           </div>
         )}
         
         <div className="flex items-center gap-3">
           <Clock className={`w-5 h-5 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`} />
           <span className={`font-mono text-xl font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-slate-900'}`}>{timeLeft}</span>
         </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 relative z-10">
        <div className="h-full bg-brand-primary transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Main Play Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
         
         {eliminated ? (
           <div className="text-center animate-fade-in bg-white p-12 rounded-3xl border border-slate-200 shadow-xl">
             <XCircle className="w-24 h-24 text-rose-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]" />
             <h2 className="text-4xl font-heading font-black text-slate-900 mb-2"><Translate fil="Tanggal!" en="Eliminated!" /></h2>
             <p className="text-slate-600 font-medium mb-8"><Translate fil="Wala ka nang buhay." en="You ran out of lives." /></p>
             <button onClick={finishQuiz} className="px-8 py-3 bg-brand-primary hover:bg-slate-600 shadow-md text-white rounded-full font-bold transition-all">
               <Translate fil="Magpatuloy sa Resulta" en="Continue to Results" />
             </button>
           </div>
         ) : (
           <div className="w-full max-w-3xl bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-xl relative animate-slide-up" key={currentIdx}>
             
             <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-10 text-center leading-relaxed">
               {card?.question_text}
             </h2>

             {card?.question_type === 'multiple_choice' && card.options && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {card.options.map((opt: string, idx: number) => {
                   let btnClass = "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm"
                   if (selectedAnswer === idx) btnClass = "bg-slate-50 border-slate-200 text-brand-primary shadow-md"
                   
                   if (isEvaluating) {
                     if (card.correct_answer === idx) btnClass = "bg-slate-500 text-white border-slate-500 scale-105 shadow-xl shadow-slate-500/20 font-bold"
                     else if (selectedAnswer === idx) btnClass = "bg-red-50 text-red-600 border-red-200 shadow-sm font-bold"
                     else btnClass = "bg-slate-50 border-slate-200 text-slate-400 opacity-50 shadow-none"
                   }

                   return (
                     <button 
                       key={idx}
                       disabled={isEvaluating}
                       onClick={() => setSelectedAnswer(idx)}
                       className={`p-6 rounded-2xl border text-left text-lg font-medium transition-all duration-200 focus:outline-none ${btnClass}`}
                     >
                       {opt}
                     </button>
                   )
                 })}
               </div>
             )}

             {card?.question_type === 'fill_blank' && (
               <div className="max-w-md mx-auto text-center">
                 <input 
                   type="text" 
                   value={textAnswer}
                   onChange={(e) => setTextAnswer(e.target.value)}
                   disabled={isEvaluating}
                   placeholder="I-type ang iyong sagot..."
                   className={`w-full bg-white border rounded-2xl px-6 py-5 text-xl font-bold text-center shadow-sm focus:outline-none transition-all ${
                     isEvaluating 
                       ? isCorrect 
                         ? 'border-slate-500 text-slate-700 bg-slate-50' 
                         : 'border-red-500 text-red-700 bg-red-50'
                       : 'border-slate-300 text-slate-900 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary'
                   }`}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && textAnswer.trim()) submitAnswer()
                   }}
                 />
                 {isEvaluating && !isCorrect && (
                   <div className="mt-4 flex flex-col items-center">
                      <p className="text-slate-700 font-bold shadow-sm inline-block px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <Translate fil="Tamang sagot" en="Correct answer" />: {card.correct_answer}
                      </p>
                   </div>
                 )}
               </div>
             )}

             {isEvaluating && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center animate-fade-in pointer-events-none">
                 {isCorrect ? (
                   <div className="bg-white/80 backdrop-blur text-slate-500 p-8 rounded-full border border-slate-200 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
                      <CheckCircle2 className="w-24 h-24" />
                   </div>
                 ) : (
                   <div className="bg-white/80 backdrop-blur text-red-500 p-8 rounded-full border border-red-200 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
                      <XCircle className="w-24 h-24" />
                   </div>
                 )}
               </div>
             )}
             
           </div>
         )}
         
         {!isEvaluating && !eliminated && (
           <div className="mt-10 h-16 pointer-events-none w-full max-w-3xl flex justify-end relative z-20">
             {((card?.question_type === 'multiple_choice' && selectedAnswer !== null) || 
               (card?.question_type === 'fill_blank' && textAnswer.trim() !== '')) && (
               <button 
                 onClick={submitAnswer}
                 className="pointer-events-auto px-8 py-4 bg-brand-primary hover:bg-slate-600 text-white rounded-full font-black tracking-wide shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.5)] hover:-translate-y-1 transition-all flex items-center gap-2 animate-slide-up"
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
