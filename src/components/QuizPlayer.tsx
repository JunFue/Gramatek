'use client'

import { useState, useEffect } from 'react'
import { submitQuizAttempt } from '@/app/student/quiz/actions'
import { ArrowLeft, Clock, CheckCircle2, XCircle, ChevronRight, Loader2, Play, FileQuestion } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function QuizPlayer({ quiz, cards }: { quiz: any, cards: any[] }) {
  const router = useRouter()
  const [hasStarted, setHasStarted] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  
  // Game State
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit_seconds)
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const card = cards[currentIdx]

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (hasStarted && !isEvaluating && !isFinished && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft((prev: number) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && !isEvaluating && !isFinished) {
      handleTimeOut()
    }
    return () => clearTimeout(timer)
  }, [hasStarted, isEvaluating, isFinished, timeLeft])

  const startQuiz = () => {
    setHasStarted(true)
    setTimeLeft(quiz.time_limit_seconds)
  }

  const handleTimeOut = () => {
    setIsEvaluating(true)
    setIsCorrect(false)
    setTimeout(() => {
      goToNextCard()
    }, 2000)
  }

  const submitAnswer = () => {
    if (isEvaluating || isFinished) return
    setIsEvaluating(true)

    let correct = false
    if (card.question_type === 'multiple_choice') {
      correct = selectedAnswer === card.correct_answer
    } else if (card.question_type === 'fill_blank') {
      correct = textAnswer.trim().toLowerCase() === card.correct_answer.toLowerCase()
    }
    
    setIsCorrect(correct)
    if (correct) setScore(s => s + 1)

    // Wait a brief moment to show they were correct/incorrect, then move on
    setTimeout(() => {
      goToNextCard()
    }, 1500)
  }

  const goToNextCard = () => {
    if (currentIdx < cards.length - 1) {
      setCurrentIdx(i => i + 1)
      setIsEvaluating(false)
      setIsCorrect(null)
      setSelectedAnswer(null)
      setTextAnswer('')
      setTimeLeft(quiz.time_limit_seconds)
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
        score + (isCorrect ? 1 : 0), // account for the very last question status
        cards.length,
        0, // simple MVP time tracking
        {} // detailed answers omitted for MVP
      )
    } catch(e) {
      console.error(e)
    }
    setIsSaving(false)
  }

  if (!hasStarted) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center animate-fade-in bg-gradient-to-br from-background to-slate-900">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/20 rounded-full blur-[120px]" />
        <div className="max-w-2xl relative z-10 glass-strong p-12 rounded-3xl border border-white/10 flex flex-col items-center shadow-2xl">
           <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4 leading-tight">{quiz.title}</h1>
           <p className="text-slate-400 mb-8 max-w-lg">{quiz.description}</p>
           
           <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-sm font-medium text-slate-300">
             <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-white/5">
                <FileQuestion className="w-5 h-5 text-brand-secondary" /> {cards.length} Questions
             </div>
             <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-white/5">
                <Clock className="w-5 h-5 text-orange-400" /> {quiz.time_limit_seconds}s per item
             </div>
           </div>
           
           <button onClick={startQuiz} className="group relative px-10 py-5 bg-brand-accent hover:bg-emerald-500 rounded-full text-white font-bold text-xl transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] hover:-translate-y-1 hover:scale-105 active:scale-95 duration-200">
             <span className="flex items-center gap-3">
               <Play className="w-6 h-6 fill-white" />
               START QUIZ
             </span>
           </button>
           
           <Link href={`/student/classrooms/${quiz.classroom_id}`} className="mt-8 text-slate-500 hover:text-white transition-colors text-sm font-medium">
             Back to Classroom
           </Link>
        </div>
      </div>
    )
  }

  if (isFinished) {
    // We compute the final score dynamically based on the state since setScore is async
    const finalScore = isCorrect && !isSaving ? score + 1 : score;
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center animate-fade-in bg-gradient-to-br from-background to-slate-900">
         <div className="max-w-xl w-full relative z-10 glass p-10 rounded-3xl border border-white/10 flex flex-col items-center">
            
            <h1 className="text-4xl font-heading font-bold text-white mb-2">Quiz Complete!</h1>
            <p className="text-slate-400 mb-10">Here's how you did.</p>
            
            <div className="relative mb-12">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="88" className="stroke-slate-800" strokeWidth="12" fill="transparent" />
                <circle cx="96" cy="96" r="88" className="stroke-brand-accent transition-all duration-1000 ease-out" strokeWidth="12" fill="transparent" strokeDasharray="552.92" strokeDashoffset={552.92 - (552.92 * finalScore) / cards.length} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                 <span className="text-5xl font-black font-heading tracking-tighter">{finalScore}</span>
                 <span className="text-slate-400 font-medium">/ {cards.length}</span>
              </div>
            </div>

            {isSaving ? (
               <div className="flex items-center justify-center text-slate-400 text-sm gap-2">
                 <Loader2 className="w-4 h-4 animate-spin" /> Saving results...
               </div>
            ) : (
               <div className="flex gap-4 w-full">
                 <Link href={`/student/quiz/${quiz.id}/results`} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl transition-colors">
                   View History
                 </Link>
                 <Link href={`/student/classrooms/${quiz.classroom_id}`} className="flex-1 py-4 bg-brand-primary hover:bg-blue-500 text-white font-medium rounded-2xl transition-colors shadow-lg shadow-blue-500/20">
                   Back to Classroom
                 </Link>
               </div>
            )}

         </div>
      </div>
    )
  }

  const progressPct = ((currentIdx + 1) / cards.length) * 100

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      
      {/* Dynamic Background depending on evaluation state */}
      <div className={`absolute inset-0 transition-colors duration-500 ${isEvaluating ? (isCorrect ? 'bg-emerald-500/10' : 'bg-red-500/10') : 'bg-transparent'}`} />

      {/* Top Header */}
      <header className="h-20 w-full px-6 flex items-center justify-between relative z-10 glass-subtle border-b border-white/5">
         <div className="flex items-center gap-4 text-slate-400">
           <Link href={`/student/classrooms/${quiz.classroom_id}`} className="hover:text-white transition-colors">
             <ArrowLeft className="w-5 h-5" />
           </Link>
           <span className="font-heading font-medium tracking-wide">Q. {currentIdx + 1} / {cards.length}</span>
         </div>
         
         <div className="flex items-center gap-3">
           <Clock className={`w-5 h-5 ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
           <span className={`font-mono text-xl font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>{timeLeft}</span>
         </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 relative z-10">
        <div className="h-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all duration-300" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Main Play Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
         
         <div className="w-full max-w-3xl glass-strong rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl relative animate-slide-up" key={currentIdx}>
           
           <h2 className="text-2xl md:text-3xl font-medium text-white mb-10 text-center leading-relaxed">
             {card.question_text}
           </h2>

           {card.question_type === 'multiple_choice' && card.options && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {card.options.map((opt: string, idx: number) => {
                 let btnClass = "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                 if (selectedAnswer === idx) btnClass = "bg-white/20 border-white/30 text-white shadow-lg"
                 
                 // Evaluation coloring
                 if (isEvaluating) {
                   if (card.correct_answer === idx) btnClass = "bg-emerald-500 text-white border-emerald-400 scale-105 shadow-xl shadow-emerald-500/20"
                   else if (selectedAnswer === idx) btnClass = "bg-red-500/20 text-red-500 border-red-500/50"
                   else btnClass = "bg-white/5 border-white/5 text-slate-500 opacity-50"
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

           {card.question_type === 'fill_blank' && (
             <div className="max-w-md mx-auto text-center">
               <input 
                 type="text" 
                 value={textAnswer}
                 onChange={(e) => setTextAnswer(e.target.value)}
                 disabled={isEvaluating}
                 placeholder="Type your answer..."
                 className={`w-full bg-slate-900/50 border rounded-2xl px-6 py-5 text-xl font-medium text-center focus:outline-none transition-all ${
                   isEvaluating 
                     ? isCorrect 
                       ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' 
                       : 'border-red-500 text-red-400 bg-red-500/10'
                     : 'border-white/20 text-white focus:border-brand-primary'
                 }`}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && textAnswer.trim()) submitAnswer()
                 }}
               />
               {isEvaluating && !isCorrect && (
                 <p className="mt-4 text-emerald-400 font-medium">Correct answer: {card.correct_answer}</p>
               )}
             </div>
           )}

           {/* Feedback Icon Overlay */}
           {isEvaluating && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center animate-fade-in pointer-events-none">
               {isCorrect ? (
                 <div className="bg-emerald-500/20 backdrop-blur text-emerald-400 p-8 rounded-full border border-emerald-500/30 animate-pulse">
                    <CheckCircle2 className="w-24 h-24" />
                 </div>
               ) : (
                 <div className="bg-red-500/20 backdrop-blur text-red-400 p-8 rounded-full border border-red-500/30 animate-pulse">
                    <XCircle className="w-24 h-24" />
                 </div>
               )}
             </div>
           )}
           
         </div>

         {/* Submit Button (manual trigger if they don't hit enter) */}
         {!isEvaluating && (
           <div className="mt-10 h-16 pointer-events-none w-full max-w-3xl flex justify-end">
             {((card.question_type === 'multiple_choice' && selectedAnswer !== null) || 
               (card.question_type === 'fill_blank' && textAnswer.trim() !== '')) && (
               <button 
                 onClick={submitAnswer}
                 className="pointer-events-auto px-8 py-4 bg-brand-primary hover:bg-blue-500 text-white rounded-full font-bold tracking-wide shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:-translate-y-1 transition-all flex items-center gap-2 animate-slide-up"
               >
                 SUBMIT <ChevronRight className="w-5 h-5" />
               </button>
             )}
           </div>
         )}
      </main>

    </div>
  )
}
