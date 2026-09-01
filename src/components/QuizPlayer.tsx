'use client'

import { useState, useEffect, useMemo } from 'react'
import { submitQuizAttempt } from '@/app/student/quiz/actions'
import { 
  ArrowLeft, Clock, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Loader2, Play, FileQuestion, Zap, Shield, HeartPulse, 
  Flame, Trophy, CalendarClock, RotateCcw, Award, Sparkles,
  SkipForward, CheckSquare, ListChecks, HelpCircle, AlertTriangle,
  Eye, CornerDownRight, X
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Translate } from '@/components/Translate'

interface UserAnswerData {
  selectedAnswer?: any
  textAnswer?: string
  enumAnswers?: string[]
  scrambleSelectedIndices?: number[]
  isSkipped?: boolean
}

export function QuizPlayer({ 
  quiz, 
  cards, 
  pastAttemptsCount = 0 
}: { 
  quiz: any
  cards: any[]
  pastAttemptsCount?: number 
}) {
  const router = useRouter()
  const isScheduledMode = quiz.game_mode === 'scheduled'
  const isDelayedFeedback = quiz.feedback_timing === 'delayed'
  const isSurvivalMode = quiz.game_mode === 'survival'

  const [hasStarted, setHasStarted] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  
  // Game State
  const card = cards[currentIdx]
  const [timeLeft, setTimeLeft] = useState(card?.time_limit_override || quiz.time_limit_seconds || 15)
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [enumAnswers, setEnumAnswers] = useState<string[]>([])
  const [scrambleSelectedIndices, setScrambleSelectedIndices] = useState<number[]>([])

  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Scheduled Mode & Global Answers Storage
  const [answersMap, setAnswersMap] = useState<Record<number, UserAnswerData>>({})
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  
  // Final Evaluation Results (for Detailed Review at end of test)
  const [evaluatedResults, setEvaluatedResults] = useState<Array<{
    card: any
    userAnswerText: string
    correctAnswerText: string
    isCorrect: boolean
    points: number
  }>>([])

  // V2 Survival Modes State
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

  // Load saved answer for currentIdx into active inputs
  const loadCardState = (idx: number) => {
    const saved = answersMap[idx]
    if (saved) {
      setSelectedAnswer(saved.selectedAnswer !== undefined ? saved.selectedAnswer : null)
      setTextAnswer(saved.textAnswer || '')
      setEnumAnswers(saved.enumAnswers || [])
      setScrambleSelectedIndices(saved.scrambleSelectedIndices || [])
    } else {
      setSelectedAnswer(null)
      setTextAnswer('')
      setEnumAnswers([])
      setScrambleSelectedIndices([])
    }
    setIsEvaluating(false)
    setIsCorrect(null)
    setTimeLeft(cards[idx]?.time_limit_override || quiz.time_limit_seconds || 15)
  }

  // Save active inputs to answersMap for currentIdx
  const persistActiveInputs = (idx: number, isSkipped = false) => {
    setAnswersMap(prev => ({
      ...prev,
      [idx]: {
        selectedAnswer,
        textAnswer,
        enumAnswers,
        scrambleSelectedIndices,
        isSkipped
      }
    }))
  }

  // Timer Effect
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
    setCurrentIdx(0)
    setAnswersMap({})
    setTimeLeft(cards[0]?.time_limit_override || quiz.time_limit_seconds || 15)
    setScrambleSelectedIndices([])
    setTextAnswer('')
    setSelectedAnswer(null)
  }

  const handleTimeOut = () => {
    if (isScheduledMode) {
      // In scheduled mode, mark as skipped or save current answer and advance
      persistActiveInputs(currentIdx, !hasCurrentAnswer())
      if (currentIdx < cards.length - 1) {
        jumpToCard(currentIdx + 1)
      } else {
        setIsReviewModalOpen(true)
      }
      return
    }

    setIsEvaluating(true)
    setIsCorrect(false)
    processResult(false)
    setTimeout(() => {
      goToNextCard()
    }, isDelayedFeedback ? 400 : 2000)
  }

  // Helper to check if current card has an answer provided
  const hasCurrentAnswer = () => {
    if (card?.question_type === 'multiple_choice' || card?.question_type === 'true_false') return selectedAnswer !== null
    if (card?.question_type === 'fill_blank') return textAnswer.trim() !== ''
    if (card?.question_type === 'enumeration') return enumAnswers.some(a => a && a.trim() !== '')
    if (card?.question_type === 'word_scramble' || card?.question_type === 'sentence_scramble') return scrambleSelectedIndices.length > 0
    return false
  }

  // Check if a specific card index has an answer saved in answersMap or in active state
  const isCardAnswered = (idx: number) => {
    if (idx === currentIdx) return hasCurrentAnswer()
    const saved = answersMap[idx]
    if (!saved) return false
    const qType = cards[idx]?.question_type
    if (qType === 'multiple_choice' || qType === 'true_false') return saved.selectedAnswer !== null && saved.selectedAnswer !== undefined
    if (qType === 'fill_blank') return !!saved.textAnswer && saved.textAnswer.trim() !== ''
    if (qType === 'enumeration') return !!saved.enumAnswers && saved.enumAnswers.some(a => a && a.trim() !== '')
    if (qType === 'word_scramble' || qType === 'sentence_scramble') return !!saved.scrambleSelectedIndices && saved.scrambleSelectedIndices.length > 0
    return false
  }

  // Check if a card is marked as skipped
  const isCardSkipped = (idx: number) => {
    if (idx === currentIdx) return false
    const saved = answersMap[idx]
    return saved?.isSkipped === true && !isCardAnswered(idx)
  }

  // Check answer correctness for a single card
  const evaluateCardAnswer = (targetCard: any, answerData: UserAnswerData): { isCorrect: boolean; userAnswerText: string; correctAnswerText: string } => {
    let correct = false
    let userText = 'Walang Sagot / Skipped'
    let correctText = ''

    if (targetCard.question_type === 'multiple_choice') {
      const chosenIdx = answerData?.selectedAnswer
      if (chosenIdx !== undefined && chosenIdx !== null && targetCard.options) {
        userText = typeof chosenIdx === 'number' 
          ? `${String.fromCharCode(65 + chosenIdx)}. ${targetCard.options[chosenIdx] || ''}`
          : String(chosenIdx)
      }
      
      const targetAns = targetCard.correct_answer
      if (typeof targetAns === 'number') {
        correctText = `${String.fromCharCode(65 + targetAns)}. ${targetCard.options?.[targetAns] || ''}`
        correct = chosenIdx === targetAns
      } else {
        correctText = String(targetAns || '')
        const chosenText = typeof chosenIdx === 'number' ? targetCard.options?.[chosenIdx] : chosenIdx
        correct = String(chosenText || '').trim().toLowerCase() === correctText.trim().toLowerCase()
      }
    } else if (targetCard.question_type === 'true_false') {
      const chosen = answerData?.selectedAnswer
      userText = chosen ? String(chosen).toUpperCase() : 'Walang Sagot / Skipped'
      correctText = String(targetCard.correct_answer || 'TAMA').toUpperCase()
      correct = userText === correctText
    } else if (targetCard.question_type === 'fill_blank') {
      const normalizeText = (str: string) => (str || '').toLowerCase().replace(/['"’`]/g, "'").trim()
      const cleanText = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      
      const inputStr = answerData?.textAnswer || ''
      userText = inputStr ? inputStr.trim() : 'Walang Sagot / Skipped'
      correctText = String(targetCard.correct_answer || '')
      
      const userNorm = normalizeText(inputStr)
      const correctNorm = normalizeText(correctText)
      correct = userNorm === correctNorm || (cleanText(inputStr) !== '' && cleanText(inputStr) === cleanText(correctText))
    } else if (targetCard.question_type === 'enumeration') {
      const userList = (answerData?.enumAnswers || []).map(a => (a || '').trim().toLowerCase()).filter(Boolean)
      userText = userList.length > 0 ? userList.join(', ') : 'Walang Sagot / Skipped'
      
      const rawAccepted = Array.isArray(targetCard.options) && targetCard.options.length > 0
        ? targetCard.options
        : Array.isArray(targetCard.correct_answer)
        ? targetCard.correct_answer
        : String(targetCard.correct_answer || '').split(',')

      const acceptedList = rawAccepted.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean)
      correctText = acceptedList.join(', ')

      // Check that all entered answers match items in acceptedList (unique)
      const uniqueEntered = Array.from(new Set(userList))
      const matches = uniqueEntered.filter(u => acceptedList.includes(u))
      correct = matches.length > 0 && matches.length === uniqueEntered.length && uniqueEntered.length >= Math.min(2, acceptedList.length)
    } else if (targetCard.question_type === 'word_scramble') {
      const letters = targetCard.options || []
      const indices = answerData?.scrambleSelectedIndices || []
      const userWord = indices.map((i: number) => letters[i] || '').join('').toUpperCase()
      userText = userWord || 'Walang Sagot / Skipped'
      correctText = String(targetCard.correct_answer || '').toUpperCase().trim()
      correct = userWord.trim() === correctText
    } else if (targetCard.question_type === 'sentence_scramble') {
      const normalizeSentence = (str: string) => 
        (str || '').toLowerCase().replace(/['"’“”,.!?\-–—]/g, ' ').replace(/\s+/g, ' ').trim()
      
      const words = targetCard.options || targetCard.scrambled_words || []
      const indices = answerData?.scrambleSelectedIndices || []
      const userSentence = indices.map((i: number) => words[i] || '').join(' ')
      userText = userSentence ? userSentence.trim() : 'Walang Sagot / Skipped'
      correctText = String(targetCard.correct_answer || targetCard.correct_sentence || '')
      correct = normalizeSentence(userSentence) === normalizeSentence(correctText)
    }

    return { isCorrect: correct, userAnswerText: userText, correctAnswerText: correctText }
  }

  // Answer submission handler for standard / mastery / immediate mode
  const submitAnswer = () => {
    if (isEvaluating || isFinished || eliminated) return

    // If Scheduled Mode: we record and either advance or open review
    if (isScheduledMode) {
      persistActiveInputs(currentIdx, false)
      if (currentIdx < cards.length - 1) {
        jumpToCard(currentIdx + 1)
      } else {
        setIsReviewModalOpen(true)
      }
      return
    }

    setIsEvaluating(true)
    const { isCorrect: correct } = evaluateCardAnswer(card, {
      selectedAnswer,
      textAnswer,
      scrambleSelectedIndices
    })

    setIsCorrect(correct)
    processResult(correct)

    setTimeout(() => {
      goToNextCard()
    }, isDelayedFeedback ? 300 : 1800)
  }

  // Skip handler (Scheduled Mode)
  const handleSkipQuestion = () => {
    persistActiveInputs(currentIdx, true)
    if (currentIdx < cards.length - 1) {
      jumpToCard(currentIdx + 1)
    } else {
      setIsReviewModalOpen(true)
    }
  }

  // Previous Question handler (Scheduled Mode)
  const handlePrevQuestion = () => {
    if (currentIdx > 0) {
      persistActiveInputs(currentIdx, !hasCurrentAnswer())
      jumpToCard(currentIdx - 1)
    }
  }

  // Jump to specific card
  const jumpToCard = (targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= cards.length) return
    persistActiveInputs(currentIdx, !hasCurrentAnswer() && isCardSkipped(currentIdx))
    setCurrentIdx(targetIdx)
    loadCardState(targetIdx)
  }

  const processResult = (correct: boolean) => {
    if (correct) {
      setScore(s => s + currentCardPoints)
      setCorrectCount(c => c + 1)
      const newStreak = currentStreak + 1
      setCurrentStreak(newStreak)
      if (newStreak > longestStreak) setLongestStreak(newStreak)
      
      const multiplier = isSurvivalMode && quiz.streak_multiplier ? Math.min(1 + Math.floor(newStreak / 3) * 0.5, 3) : 1
      setStreakScore(s => s + (currentCardPoints * 100 * multiplier))
    } else {
      setCurrentStreak(0)
      if (isSurvivalMode) {
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
      loadCardState(nextIdx)
    } else {
      finishQuiz()
    }
  }

  // Final submission for Scheduled Mode
  const handleFinalScheduledSubmit = () => {
    setIsReviewModalOpen(false)
    persistActiveInputs(currentIdx, !hasCurrentAnswer())

    // Evaluate all cards in the test
    let totalComputedScore = 0
    let totalCorrectCount = 0
    const results: any[] = []

    const currentMap = {
      ...answersMap,
      [currentIdx]: {
        selectedAnswer,
        textAnswer,
        scrambleSelectedIndices,
        isSkipped: !hasCurrentAnswer()
      }
    }

    cards.forEach((c, idx) => {
      const answerData = currentMap[idx] || { isSkipped: true }
      const evalRes = evaluateCardAnswer(c, answerData)
      const pts = c.points || (quiz.id === 'level-2' ? 2 : quiz.id === 'level-3' ? 3 : 1)

      if (evalRes.isCorrect) {
        totalComputedScore += pts
        totalCorrectCount += 1
      }

      results.push({
        card: c,
        userAnswerText: evalRes.userAnswerText,
        correctAnswerText: evalRes.correctAnswerText,
        isCorrect: evalRes.isCorrect,
        points: pts
      })
    })

    setScore(totalComputedScore)
    setCorrectCount(totalCorrectCount)
    setEvaluatedResults(results)
    finishQuizWithScore(totalComputedScore, totalCorrectCount, results)
  }

  // Finish quiz with explicit scores
  const finishQuizWithScore = async (
    finalScore: number, 
    finalCorrectCount: number, 
    resultsSummary?: any[]
  ) => {
    setIsFinished(true)
    setIsSaving(true)

    // Save to localStorage for practice mode if applicable
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`completed_${quiz.id}`, 'true')
        const prevHigh = parseInt(localStorage.getItem(`score_${quiz.id}`) || '0', 10)
        if (finalScore > prevHigh) {
          localStorage.setItem(`score_${quiz.id}`, String(finalScore))
        }

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
          cards_count: cards.length,
          feedback_timing: quiz.feedback_timing
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

  const finishQuiz = () => {
    const finalScore = score + (isCorrect ? currentCardPoints : 0)
    const finalCorrect = correctCount + (isCorrect ? 1 : 0)
    
    // Build results summary for delayed review if not already built
    if (evaluatedResults.length === 0) {
      const results = cards.map((c, idx) => {
        const answerData = idx === currentIdx 
          ? { selectedAnswer, textAnswer, scrambleSelectedIndices }
          : answersMap[idx] || {}
        const evalRes = evaluateCardAnswer(c, answerData)
        return {
          card: c,
          userAnswerText: evalRes.userAnswerText,
          correctAnswerText: evalRes.correctAnswerText,
          isCorrect: evalRes.isCorrect,
          points: c.points || (quiz.id === 'level-2' ? 2 : quiz.id === 'level-3' ? 3 : 1)
        }
      })
      setEvaluatedResults(results)
    }

    finishQuizWithScore(finalScore, finalCorrect)
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

  // 1. START SCREEN
  if (!hasStarted) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 text-center animate-fade-in bg-slate-50 overflow-y-auto custom-scrollbar">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-[120px]" />
        <div className="max-w-2xl w-full relative z-10 bg-white p-8 md:p-12 rounded-3xl border border-slate-200 flex flex-col items-center shadow-xl my-auto">
           
           {quiz.game_mode === 'mastery' && (
             <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs md:text-sm font-bold border border-slate-200 mb-6">
               <Trophy className="w-4 h-4 text-brand-primary" /> <Translate fil="Mode ng Masteriya" en="Mastery Mode" />
             </span>
           )}
           {quiz.game_mode === 'scheduled' && (
             <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs md:text-sm font-bold border border-slate-200 mb-6">
               <CalendarClock className="w-4 h-4 text-brand-primary" /> <Translate fil="Nakatakdang Misyon (May Skip & Review)" en="Scheduled Mission (Skip & Review)" />
             </span>
           )}
           {quiz.game_mode === 'survival' && (
             <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-700 text-xs md:text-sm font-bold border border-rose-200 mb-6">
               <Zap className="w-4 h-4 text-rose-500" /> <Translate fil="Mode ng Kaligtasan" en="Survival Mode" />
             </span>
           )}

           <h1 className="text-3xl md:text-5xl font-heading font-black text-slate-900 mb-4 leading-tight">{quiz.title}</h1>
           <p className="text-slate-600 mb-8 max-w-lg font-medium">{quiz.description || 'Pagsusulit sa Gramatika at Wikang Filipino.'}</p>
           
           <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-8 text-xs md:text-sm font-bold text-slate-700">
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-xs">
                <FileQuestion className="w-4 h-4 text-brand-primary" /> {cards.length} <Translate fil="Aytem" en="Items" />
             </div>
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-xs">
                <Award className="w-4 h-4 text-amber-500" /> {totalMaxScore} <Translate fil="Kabuuang Puntos" en="Max Points" />
             </div>
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-xs">
                <Clock className="w-4 h-4 text-orange-500" /> {quiz.time_limit_seconds}s <Translate fil="bawat aytem" en="per item" />
             </div>
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-xs">
                <Eye className="w-4 h-4 text-slate-500" />
                {isDelayedFeedback ? (
                  <Translate fil="Iskor pagkatapos ng pagsusulit" en="Scores revealed after test" />
                ) : (
                  <Translate fil="Tamang sagot bawat tanong" en="Answers after each question" />
                )}
             </div>
           </div>

           {quiz.game_mode === 'mastery' && quiz.max_attempts && (
             <p className="text-slate-600 font-bold mb-6 text-sm">
               <Translate fil="Pagtatangka" en="Attempt" /> {pastAttemptsCount + 1} / {quiz.max_attempts}
             </p>
           )}
           
           <button 
             onClick={startQuiz} 
             className="group relative px-10 py-4 md:py-5 bg-brand-primary hover:bg-slate-700 rounded-full text-white font-black text-lg md:text-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-105 active:scale-95 duration-200 cursor-pointer"
           >
             <span className="flex items-center gap-3">
               <Play className="w-5 h-5 md:w-6 md:h-6 fill-white" />
               <Translate fil="SIMULAN ANG PAGSUSULIT" en="START QUIZ" />
             </span>
           </button>
           
           <Link 
             href={quiz.is_practice ? '/student/practice' : `/student/classrooms/${quiz.classroom_id}`} 
             className="mt-6 text-slate-500 hover:text-slate-800 transition-colors text-xs md:text-sm font-bold"
           >
             {quiz.is_practice ? <Translate fil="Bumalik sa Pagsasanay" en="Back to Practice Hub" /> : <Translate fil="Bumalik sa Silid-aralan" en="Back to Classroom" />}
           </Link>
        </div>
      </div>
    )
  }

  // 2. FINISHED / RESULTS SCREEN (With Itemized Question Review for Delayed & Scheduled modes)
  if (isFinished) {
    const pct = totalMaxScore > 0 ? Math.round((score / totalMaxScore) * 100) : 0
    const isPassing = pct >= 60

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 text-center animate-fade-in bg-slate-50 overflow-y-auto custom-scrollbar">
         <div className="max-w-2xl w-full relative z-10 bg-white p-6 md:p-10 rounded-3xl border border-slate-200 flex flex-col items-center my-auto shadow-xl">
            
            <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mb-4 shadow-xs">
              <Sparkles className="w-8 h-8 text-brand-primary" />
            </div>

            <h1 className={`text-3xl md:text-4xl font-heading font-black mb-2 ${eliminated ? 'text-rose-600' : 'text-slate-900'}`}>
              {eliminated ? <Translate fil="Tanggal!" en="Eliminated!" /> : <Translate fil="Tapos na ang Pagsusulit!" en="Quiz Completed!" />}
            </h1>
            
            <p className="text-slate-600 font-medium mb-6 text-sm md:text-base">
              {eliminated 
                ? <Translate fil={`Nakaligtas ka sa ${currentIdx} na round bago naubos ang strikes.`} en={`You survived ${currentIdx} rounds before running out of strikes.`} /> 
                : <Translate fil={`Nakamit mo ang ${score} sa kabuuang ${totalMaxScore} puntos!`} en={`You scored ${score} out of ${totalMaxScore} total points!`} />
              }
            </p>
            
            {/* Score Ring */}
            <div className="relative mb-6">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" className="stroke-slate-100" strokeWidth="12" fill="transparent" />
                <circle 
                  cx="80" 
                  cy="80" 
                  r="70" 
                  className={`transition-all duration-1000 ease-out ${eliminated ? 'stroke-rose-500' : 'stroke-brand-primary'}`} 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray="440" 
                  strokeDashoffset={440 - (440 * (totalMaxScore > 0 ? score / totalMaxScore : 0))} 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                 <span className="text-3xl md:text-4xl font-black font-heading tracking-tighter">{score}</span>
                 <span className="text-slate-500 font-bold text-xs">/ {totalMaxScore} pts</span>
                 <span className="text-xs font-extrabold text-brand-primary mt-0.5">{pct}%</span>
              </div>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 shadow-xs">
                <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5"><Translate fil="Pinakamahabang Streak" en="Max Streak" /></p>
                <p className="text-lg font-black text-slate-900">{longestStreak} 🔥</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 shadow-xs">
                <Award className="w-5 h-5 text-brand-primary mx-auto mb-1" />
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5"><Translate fil="Tamang Sagot" en="Accuracy" /></p>
                <p className="text-lg font-black text-slate-900">{correctCount} / {cards.length}</p>
              </div>
            </div>

            {/* Itemized Question-by-Question Review */}
            {evaluatedResults.length > 0 && (
              <div className="w-full text-left mb-8">
                <h3 className="text-sm font-heading font-black text-slate-900 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-brand-primary" />
                    <Translate fil="Pagsusuri ng Bawat Tanong" en="Question-by-Question Review" />
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {correctCount} / {evaluatedResults.length} Tama
                  </span>
                </h3>

                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {evaluatedResults.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-2xl border text-xs md:text-sm ${
                        item.isCorrect 
                          ? 'bg-emerald-50/60 border-emerald-200' 
                          : 'bg-rose-50/60 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          {item.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span>Tanong {idx + 1}: {item.card.question_text}</span>
                        </span>
                        <span className={`text-[11px] font-black shrink-0 px-2 py-0.5 rounded-md ${
                          item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.isCorrect ? `+${item.points} pts` : '0 pts'}
                        </span>
                      </div>

                      <div className="pl-5 space-y-1 text-xs">
                        <p className="text-slate-600">
                          <span className="font-bold"><Translate fil="Iyong Sagot" en="Your Answer" />:</span>{' '}
                          <span className={item.isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                            {item.userAnswerText}
                          </span>
                        </p>
                        {!item.isCorrect && (
                          <p className="text-slate-600">
                            <span className="font-bold text-slate-700"><Translate fil="Wastong Sagot" en="Correct Answer" />:</span>{' '}
                            <span className="text-emerald-700 font-bold">{item.correctAnswerText}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isSaving ? (
               <div className="flex items-center justify-center text-slate-500 font-bold text-sm gap-2 my-4">
                 <Loader2 className="w-4 h-4 animate-spin" /> <Translate fil="Sini-save ang resulta..." en="Saving results..." />
               </div>
            ) : (
               <div className="flex flex-col gap-3 w-full">
                 {quiz.is_practice && nextLevel && (
                   <Link 
                     href={`/student/practice/${nextLevel.id}?mode=${quiz.game_mode}`} 
                     className="w-full py-3.5 bg-brand-primary hover:bg-slate-700 text-white font-extrabold text-base rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 group"
                   >
                     <span><Translate fil="Pumunta sa Susunod na Antas" en="Proceed to Next Level" /> ➔</span>
                   </Link>
                 )}

                 <div className="flex gap-3 w-full mt-2">
                   <Link 
                     href={quiz.is_practice ? '/student/practice' : `/student/classrooms/${quiz.classroom_id}`} 
                     className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-center border border-slate-200 text-xs md:text-sm"
                   >
                     {quiz.is_practice ? <Translate fil="Pagsasanay" en="Practice Hub" /> : <Translate fil="Silid-aralan" en="Classroom" />}
                   </Link>
                   <Link 
                     href="/student/performance" 
                     className="flex-1 py-3 bg-brand-secondary hover:bg-amber-600 text-white font-bold rounded-2xl transition-colors shadow-xs text-center text-xs md:text-sm"
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

  const progressPct = ((currentIdx + 1) / cards.length) * 100
  const currentMultiplier = isSurvivalMode && quiz.streak_multiplier ? Math.min(1 + Math.floor(currentStreak / 3) * 0.5, 3) : 1

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col overflow-hidden h-[100dvh] max-h-[100dvh] w-screen max-w-screen select-none">
      
      {/* Background feedback tint on immediate mode */}
      {!isDelayedFeedback && (
        <div className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${isEvaluating ? (isCorrect ? 'bg-emerald-50/50' : 'bg-rose-50/50') : 'bg-transparent'}`} />
      )}

      {/* Top Header */}
      <header className="h-16 md:h-20 w-full px-4 md:px-8 flex items-center justify-between shrink-0 bg-white shadow-xs border-b border-slate-200 z-20">
         <div className="flex items-center gap-3 md:gap-4 text-slate-700">
           <Link 
             href={quiz.is_practice ? '/student/practice' : `/student/classrooms/${quiz.classroom_id}`} 
             className="hover:text-brand-primary transition-colors p-2 rounded-xl hover:bg-slate-100"
           >
             <ArrowLeft className="w-5 h-5" />
           </Link>
           <div>
             <span className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-wider block truncate max-w-[140px] md:max-w-none">
               {quiz.title}
             </span>
             <span className="font-heading font-black text-slate-900 text-sm md:text-base">
               Aytem {currentIdx + 1} / {cards.length}
             </span>
           </div>
         </div>

         {/* Scheduled Mode: Quick Review Button in Header */}
         {isScheduledMode && (
           <button
             type="button"
             onClick={() => {
               persistActiveInputs(currentIdx, !hasCurrentAnswer() && isCardSkipped(currentIdx))
               setIsReviewModalOpen(true)
             }}
             className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-300 cursor-pointer"
           >
             <ListChecks className="w-4 h-4 text-brand-primary" />
             <span className="hidden sm:inline"><Translate fil="Suriin ang mga Sagot" en="Review Answers" /></span>
             <span className="sm:hidden"><Translate fil="Suriin" en="Review" /></span>
           </button>
         )}

         {/* Survival Mode HUD */}
         {isSurvivalMode && (
           <div className="flex items-center gap-3 md:gap-6">
             {quiz.streak_multiplier && currentStreak > 0 && (
               <div className="flex items-center gap-1.5 text-orange-600 font-bold bg-orange-50 px-2.5 py-1 rounded-full animate-fade-in border border-orange-200 shadow-xs text-xs md:text-sm">
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
         
         {/* Timer Badge */}
         <div className="flex items-center gap-2 md:gap-3 bg-slate-100 px-3 md:px-4 py-1.5 md:py-2 rounded-2xl border border-slate-200 shadow-xs">
           <Clock className={`w-4 h-4 md:w-5 md:h-5 ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-600'}`} />
           <span className={`font-mono text-base md:text-xl font-black ${timeLeft <= 5 ? 'text-rose-600 font-black' : 'text-slate-900'}`}>{timeLeft}s</span>
         </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 shrink-0 z-20">
        <div className="h-full bg-brand-primary transition-all duration-300 shadow-[0_0_10px_rgba(40,88,64,0.5)]" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Scheduled Mode Question Navigator Palette Bar */}
      {isScheduledMode && (
        <div className="w-full bg-white border-b border-slate-200 px-4 py-2.5 overflow-x-auto custom-scrollbar flex items-center justify-start md:justify-center gap-2 shrink-0 z-20">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
            <Translate fil="Mga Tanong" en="Questions" />:
          </span>
          {cards.map((_, idx) => {
            const isCurrent = currentIdx === idx
            const answered = isCardAnswered(idx)
            const skipped = isCardSkipped(idx)

            let badgeClass = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            if (isCurrent) {
              badgeClass = "bg-brand-primary text-white border-brand-primary ring-2 ring-brand-primary/30 font-black scale-110 shadow-sm"
            } else if (answered) {
              badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
            } else if (skipped) {
              badgeClass = "bg-amber-100 text-amber-800 border-amber-300 font-bold"
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => jumpToCard(idx)}
                className={`w-8 h-8 rounded-xl text-xs font-mono font-bold flex items-center justify-center border transition-all shrink-0 cursor-pointer ${badgeClass}`}
                title={`Tanong ${idx + 1}: ${answered ? 'Sinagutan' : skipped ? 'Nilaktawan' : 'Hindi pa nasagutan'}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      )}

      {/* Main Play Area */}
      <main className="flex-1 w-full overflow-y-auto flex flex-col items-center justify-center p-4 md:p-6 relative z-10 custom-scrollbar">
         
         {eliminated ? (
           <div className="text-center animate-fade-in bg-white p-12 rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full">
             <XCircle className="w-24 h-24 text-rose-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]" />
             <h2 className="text-4xl font-heading font-black text-slate-900 mb-2"><Translate fil="Tanggal!" en="Eliminated!" /></h2>
             <p className="text-slate-600 font-medium mb-8"><Translate fil="Wala ka nang buhay." en="You ran out of lives." /></p>
             <button onClick={finishQuiz} className="px-8 py-3 bg-brand-primary hover:bg-slate-700 shadow-md text-white rounded-full font-bold transition-all cursor-pointer">
               <Translate fil="Magpatuloy sa Resulta" en="Continue to Results" />
             </button>
           </div>
         ) : (
            <div className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 border border-slate-200 shadow-xl relative animate-slide-up" key={currentIdx}>
              
              {/* Question Badge / Points Indicator */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <span className="px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider border border-slate-200">
                  {card?.question_type === 'multiple_choice' && <Translate fil="Pagpipilian (Multiple Choice)" en="Multiple Choice" />}
                  {card?.question_type === 'fill_blank' && <Translate fil="Punan ang Patlang" en="Fill in the Blank" />}
                  {card?.question_type === 'enumeration' && <Translate fil="Enumerasyon (Listahan)" en="Enumeration" />}
                  {card?.question_type === 'word_scramble' && <Translate fil="Ayusin ang Titik (Word Scramble)" en="Word Scramble" />}
                  {card?.question_type === 'true_false' && <Translate fil="Tama o Mali (True or False)" en="True or False" />}
                  {card?.question_type === 'sentence_scramble' && <Translate fil="Ayusin ang Pangungusap" en="Sentence Unscramble" />}
                </span>
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 sm:px-3 py-1 rounded-full border border-amber-200">
                  +{currentCardPoints} <Translate fil="puntos" en="pts" />
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-6 sm:mb-8 text-center leading-relaxed font-heading">
                {card?.question_text}
              </h2>

             {/* 1. Multiple Choice Options */}
             {card?.question_type === 'multiple_choice' && card.options && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                 {card.options.map((opt: string, idx: number) => {
                   let btnClass = "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 shadow-xs"
                   if (selectedAnswer === idx) {
                     btnClass = "bg-brand-primary/10 border-brand-primary text-brand-primary font-bold shadow-sm scale-[1.01]"
                   }
                   
                   // Only show immediate correct/incorrect coloring if feedback is immediate
                   if (isEvaluating && !isDelayedFeedback) {
                     const isTarget = card.correct_answer === idx || String(opt).trim().toLowerCase() === String(card.correct_answer).trim().toLowerCase()
                     if (isTarget) {
                       btnClass = "bg-emerald-500 text-white border-emerald-600 scale-105 shadow-xl shadow-emerald-500/20 font-black"
                     } else if (selectedAnswer === idx) {
                       btnClass = "bg-rose-50 text-rose-600 border-rose-200 shadow-xs font-bold"
                     } else {
                       btnClass = "bg-slate-50 border-slate-200 text-slate-400 opacity-50 shadow-none"
                     }
                   }

                   return (
                     <button 
                       key={idx}
                       disabled={isEvaluating}
                       onClick={() => {
                         setSelectedAnswer(idx)
                         persistActiveInputs(currentIdx, false)
                       }}
                       className={`p-4 sm:p-5 md:p-6 rounded-2xl border text-left text-sm sm:text-base md:text-lg font-semibold transition-all duration-200 focus:outline-none flex items-center justify-between cursor-pointer ${btnClass}`}
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

             {/* 2. True or False */}
             {card?.question_type === 'true_false' && (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
                 {['TAMA', 'MALI'].map((choice) => {
                   const isSelected = selectedAnswer === choice
                   let btnStyle = choice === 'TAMA' 
                     ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950' 
                     : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-950'

                   if (isSelected) {
                     btnStyle = choice === 'TAMA'
                       ? 'bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-500/20 shadow-lg scale-105'
                       : 'bg-rose-600 text-white border-rose-600 ring-4 ring-rose-500/20 shadow-lg scale-105'
                   }

                   if (isEvaluating && !isDelayedFeedback) {
                     const isCorrectChoice = String(card.correct_answer).toUpperCase() === choice
                     if (isCorrectChoice) {
                       btnStyle = 'bg-emerald-500 text-white border-emerald-600 scale-105 shadow-xl font-black ring-4 ring-emerald-500/30'
                     } else if (isSelected) {
                       btnStyle = 'bg-rose-500 text-white border-rose-600 shadow-md font-bold'
                     } else {
                       btnStyle = 'opacity-30 bg-slate-100 text-slate-400 border-slate-200 shadow-none'
                     }
                   }

                   return (
                     <button
                       key={choice}
                       disabled={isEvaluating}
                       onClick={() => {
                         setSelectedAnswer(choice)
                         persistActiveInputs(currentIdx, false)
                       }}
                       className={`p-8 rounded-3xl border-2 text-center text-xl md:text-2xl font-black transition-all duration-200 cursor-pointer ${btnStyle}`}
                     >
                       {choice === 'TAMA' ? '✓ TAMA' : '✗ MALI'}
                     </button>
                   )
                 })}
               </div>
             )}

             {/* 3. Fill in the Blank */}
             {card?.question_type === 'fill_blank' && (
               <div className="max-w-lg mx-auto text-center space-y-6">
                 <input 
                   type="text" 
                   value={textAnswer}
                   onChange={(e) => {
                     const val = e.target.value.toUpperCase()
                     setTextAnswer(val)
                     setAnswersMap(prev => ({
                       ...prev,
                       [currentIdx]: { ...prev[currentIdx], textAnswer: val, isSkipped: false }
                     }))
                   }}
                   disabled={isEvaluating}
                   placeholder="I-type ang buong salita..."
                   className={`w-full bg-white border-2 rounded-2xl px-6 py-4 text-xl md:text-2xl font-black text-center tracking-wider shadow-xs focus:outline-none transition-all uppercase ${
                     isEvaluating && !isDelayedFeedback
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

                 {isEvaluating && !isDelayedFeedback && !isCorrect && (
                   <div className="mt-4 flex flex-col items-center animate-fade-in">
                      <p className="text-slate-800 font-bold shadow-xs inline-block px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-sm">
                        <Translate fil="Tamang sagot" en="Correct answer" />: <strong className="text-emerald-700">{card.correct_answer}</strong>
                      </p>
                   </div>
                 )}
               </div>
             )}

             {/* 4. Enumeration */}
             {card?.question_type === 'enumeration' && (
               <div className="max-w-lg mx-auto space-y-4">
                 <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center mb-2">
                   <Translate fil="Ilista ang mga sagot (anumang ayos):" en="List the answers (any order):" />
                 </p>
                 
                 {Array.from({ length: Math.max(2, (card.options || []).length || 3) }).map((_, slotIdx) => (
                   <div key={slotIdx} className="flex items-center gap-3">
                     <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                       {slotIdx + 1}
                     </span>
                     <input
                       type="text"
                       value={enumAnswers[slotIdx] || ''}
                       onChange={(e) => {
                         const newAns = [...enumAnswers]
                         newAns[slotIdx] = e.target.value
                         setEnumAnswers(newAns)
                         setAnswersMap(prev => ({
                           ...prev,
                           [currentIdx]: { ...prev[currentIdx], enumAnswers: newAns, isSkipped: false }
                         }))
                       }}
                       disabled={isEvaluating}
                       placeholder={`Sagot ${slotIdx + 1}...`}
                       className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
                     />
                   </div>
                 ))}
               </div>
             )}

             {/* 5. Word Scramble */}
             {card?.question_type === 'word_scramble' && (
               <div className="space-y-6 max-w-lg mx-auto text-center">
                 {/* Word Construction Slot */}
                 <div className="min-h-[70px] p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-wrap gap-2 items-center justify-center shadow-inner">
                   {scrambleSelectedIndices.length === 0 ? (
                     <p className="text-slate-400 font-bold text-xs">I-tap ang mga titik sa ibaba...</p>
                   ) : (
                     scrambleSelectedIndices.map((letterIdx, pos) => {
                       const char = (card.options || [])[letterIdx]
                       return (
                         <button
                           key={`tile_${letterIdx}_${pos}`}
                           disabled={isEvaluating}
                           onClick={() => {
                             const newIndices = scrambleSelectedIndices.filter((_, i) => i !== pos)
                             setScrambleSelectedIndices(newIndices)
                             setAnswersMap(prev => ({
                               ...prev,
                               [currentIdx]: { ...prev[currentIdx], scrambleSelectedIndices: newIndices, isSkipped: false }
                             }))
                           }}
                           className="w-10 h-10 bg-amber-500 hover:bg-rose-500 text-white font-black text-lg rounded-xl shadow-md flex items-center justify-center transition-all cursor-pointer animate-scale-up"
                           title="I-tap para alisin"
                         >
                           {char}
                         </button>
                       )
                     })
                   )}
                 </div>

                 {/* Letter Bank */}
                 <div className="flex flex-wrap gap-2 justify-center p-4 bg-slate-100 rounded-2xl border border-slate-200">
                   {(card.options || []).map((letter: string, lIdx: number) => {
                     const isUsed = scrambleSelectedIndices.includes(lIdx)

                     return (
                       <button
                         key={`bank_${lIdx}`}
                         disabled={isEvaluating || isUsed}
                         onClick={() => {
                           const newIndices = [...scrambleSelectedIndices, lIdx]
                           setScrambleSelectedIndices(newIndices)
                           setAnswersMap(prev => ({
                             ...prev,
                             [currentIdx]: { ...prev[currentIdx], scrambleSelectedIndices: newIndices, isSkipped: false }
                           }))
                         }}
                         className={`w-12 h-12 rounded-2xl font-black text-xl border transition-all cursor-pointer flex items-center justify-center ${
                           isUsed
                             ? 'bg-slate-200 text-slate-400 border-slate-300 opacity-40 cursor-not-allowed'
                             : 'bg-white hover:bg-amber-400 hover:text-slate-950 text-slate-900 border-slate-300 shadow-sm active:scale-90'
                         }`}
                       >
                         {letter}
                       </button>
                     )
                   })}
                 </div>

                 {scrambleSelectedIndices.length > 0 && !isEvaluating && (
                   <button
                     type="button"
                     onClick={() => {
                       setScrambleSelectedIndices([])
                       setAnswersMap(prev => ({
                         ...prev,
                         [currentIdx]: { ...prev[currentIdx], scrambleSelectedIndices: [], isSkipped: false }
                       }))
                     }}
                     className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                   >
                     Alisin Lahat ng Titik
                   </button>
                 )}
               </div>
             )}

             {/* 6. Sentence Scramble Builder */}
             {card?.question_type === 'sentence_scramble' && (
               <div className="space-y-8">
                 {/* Slot */}
                 <div className="min-h-[100px] p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-wrap gap-2.5 items-center justify-start relative shadow-inner">
                   {scrambleSelectedIndices.length === 0 ? (
                     <p className="text-slate-400 font-semibold italic text-sm text-center w-full">
                       <Translate fil="I-tap ang mga salita sa ibaba upang buuin ang wastong pangungusap..." en="Tap the words below to arrange them into the correct sentence..." />
                     </p>
                   ) : (
                     scrambleSelectedIndices.map((idx, pos) => {
                       const wordsList = card.options || card.scrambled_words || []
                       const word = wordsList[idx]
                       return (
                         <button
                           key={`sel_${idx}_${pos}`}
                           disabled={isEvaluating}
                           onClick={() => {
                             const newIndices = scrambleSelectedIndices.filter((_, i) => i !== pos)
                             setScrambleSelectedIndices(newIndices)
                             setAnswersMap(prev => ({
                               ...prev,
                               [currentIdx]: { ...prev[currentIdx], scrambleSelectedIndices: newIndices, isSkipped: false }
                             }))
                           }}
                           className="px-4 py-2.5 bg-brand-primary hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-all transform active:scale-95 text-base flex items-center gap-1.5 animate-pop cursor-pointer"
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
                   <div className="flex flex-wrap gap-2.5 justify-center p-4 bg-slate-100 rounded-2xl border border-slate-200">
                     {(card.options || card.scrambled_words || []).map((word: string, idx: number) => {
                       const isSelected = scrambleSelectedIndices.includes(idx)
                       return (
                         <button
                           key={`pool_${idx}`}
                           disabled={isEvaluating || isSelected}
                           onClick={() => {
                             const newIndices = [...scrambleSelectedIndices, idx]
                             setScrambleSelectedIndices(newIndices)
                             setAnswersMap(prev => ({
                               ...prev,
                               [currentIdx]: { ...prev[currentIdx], scrambleSelectedIndices: newIndices, isSkipped: false }
                             }))
                           }}
                           className={`px-4 py-2.5 rounded-xl font-bold text-base transition-all duration-150 cursor-pointer ${
                             isSelected 
                               ? 'bg-slate-200 text-slate-400 border border-slate-300 scale-95 opacity-40 cursor-not-allowed' 
                               : 'bg-white hover:bg-brand-primary hover:text-white text-slate-800 border border-slate-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95'
                           }`}
                         >
                           {word}
                         </button>
                       )
                     })}
                   </div>
                 </div>

                 {isEvaluating && !isDelayedFeedback && !isCorrect && (
                   <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center animate-fade-in">
                     <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-1"><Translate fil="Wastong Pangungusap" en="Correct Sentence" />:</p>
                     <p className="text-slate-900 font-extrabold text-base leading-relaxed">{card.correct_sentence}</p>
                   </div>
                 )}
               </div>
             )}

             {/* Immediate feedback animated overlay */}
             {isEvaluating && !isDelayedFeedback && (
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
         
         {/* Bottom Actions Bar */}
         {!isEvaluating && !eliminated && (
           <div className="mt-6 w-full max-w-3xl flex items-center justify-between gap-3 relative z-20">
             
             {/* Left side actions (Scheduled Mode: Previous & Skip) */}
             {isScheduledMode ? (
               <div className="flex items-center gap-2">
                 <button
                   type="button"
                   disabled={currentIdx === 0}
                   onClick={handlePrevQuestion}
                   className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 rounded-full font-bold text-sm transition-all border border-slate-200 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                 >
                   <ChevronLeft className="w-4 h-4" />
                   <span className="hidden sm:inline"><Translate fil="Bumalik" en="Previous" /></span>
                 </button>

                 <button
                   type="button"
                   onClick={handleSkipQuestion}
                   className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-full font-bold text-sm transition-all border border-amber-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
                 >
                   <SkipForward className="w-4 h-4" />
                   <Translate fil="Laktawan" en="Skip" />
                 </button>
               </div>
             ) : (
               <div />
             )}

             {/* Right side actions (Next / Submit / Review) */}
             <div className="flex items-center gap-2">
               {isScheduledMode && currentIdx === cards.length - 1 ? (
                 <button
                   type="button"
                   onClick={() => {
                     persistActiveInputs(currentIdx, !hasCurrentAnswer())
                     setIsReviewModalOpen(true)
                   }}
                   className="px-6 py-3.5 bg-brand-secondary hover:bg-amber-600 text-white rounded-full font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                 >
                   <ListChecks className="w-4 h-4" />
                   <Translate fil="Suriin ang mga Sagot" en="Review & Submit" />
                 </button>
               ) : hasCurrentAnswer() ? (
                 <button 
                   type="button"
                   onClick={submitAnswer}
                   className="px-6 md:px-8 py-3.5 bg-brand-primary hover:bg-slate-700 text-white rounded-full font-black text-sm md:text-base tracking-wide shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 cursor-pointer animate-slide-up"
                 >
                   {isScheduledMode ? (
                     <>
                       <Translate fil="I-save at Susunod" en="Save & Next" /> <ChevronRight className="w-4 h-4" />
                     </>
                   ) : (
                     <>
                       <Translate fil="IPASAGOT" en="SUBMIT" /> <ChevronRight className="w-4 h-4" />
                     </>
                   )}
                 </button>
               ) : isScheduledMode ? (
                 <button
                   type="button"
                   onClick={handleSkipQuestion}
                   className="px-6 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
                 >
                   <Translate fil="Susunod" en="Next" /> <ChevronRight className="w-4 h-4" />
                 </button>
               ) : null}
             </div>

           </div>
         )}
      </main>

      {/* ================= SCHEDULED MODE: REVIEW & SUBMIT MODAL ================= */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 relative animate-slide-up max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-light flex items-center justify-center text-brand-primary">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-black text-slate-900">
                    <Translate fil="Pagsusuri ng mga Sagot" en="Review Your Answers" />
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    <Translate fil="Suriin ang iyong mga sagot bago tuluyang isumite ang pagsusulit." en="Check your responses before submitting the test." />
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Answered vs Skipped Summary Badge */}
            {(() => {
              const currentMap = {
                ...answersMap,
                [currentIdx]: {
                  selectedAnswer,
                  textAnswer,
                  scrambleSelectedIndices,
                  isSkipped: !hasCurrentAnswer()
                }
              }
              const answeredCount = cards.filter((_, i) => isCardAnswered(i)).length
              const unansweredCount = cards.length - answeredCount

              return (
                <>
                  <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shrink-0 text-xs font-bold text-slate-700">
                    <span>
                      🟢 <Translate fil="Sinagutan" en="Answered" />: <strong className="text-slate-900">{answeredCount}</strong> / {cards.length}
                    </span>
                    <span>
                      🟡 <Translate fil="Nilaktawan / Walang Sagot" en="Skipped / Empty" />: <strong className="text-amber-700">{unansweredCount}</strong>
                    </span>
                  </div>

                  {unansweredCount > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 font-bold shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <Translate 
                          fil={`Pansin: May ${unansweredCount} tanong ka pang hindi nasasagutan o nilaktawan. Maaari mo itong balikan sa ibaba.`} 
                          en={`Notice: You have ${unansweredCount} unanswered or skipped questions. You can revisit them below.`} 
                        />
                      </span>
                    </div>
                  )}

                  {/* List of cards */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 my-2 pr-1">
                    {cards.map((c, idx) => {
                      const ansData = currentMap[idx] || {}
                      const answered = isCardAnswered(idx)
                      
                      let displaySnippet = 'Walang Sagot / Nilaktawan'
                      if (answered) {
                        if (c.question_type === 'multiple_choice' && ansData.selectedAnswer !== null && ansData.selectedAnswer !== undefined) {
                          displaySnippet = `${String.fromCharCode(65 + ansData.selectedAnswer)}. ${c.options?.[ansData.selectedAnswer] || ''}`
                        } else if (c.question_type === 'fill_blank' && ansData.textAnswer) {
                          displaySnippet = ansData.textAnswer
                        } else if (c.question_type === 'sentence_scramble' && ansData.scrambleSelectedIndices) {
                          displaySnippet = ansData.scrambleSelectedIndices.map((i: number) => c.scrambled_words?.[i] || '').join(' ')
                        }
                      }

                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                            answered ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/40 border-amber-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono font-bold text-slate-800">Tanong {idx + 1}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                answered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {answered ? 'Sinagutan' : 'Nilaktawan'}
                              </span>
                            </div>
                            <p className="text-slate-600 truncate font-medium">{c.question_text}</p>
                            <p className="text-slate-500 font-mono text-[11px] truncate mt-0.5">
                              <span className="font-semibold text-slate-700">Sagot:</span> {displaySnippet}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsReviewModalOpen(false)
                              jumpToCard(idx)
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shrink-0 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Translate fil="Baguhin" en="Edit" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 mt-2">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs md:text-sm cursor-pointer"
              >
                <Translate fil="Bumalik sa Pagsusulit" en="Back to Questions" />
              </button>

              <button
                type="button"
                onClick={handleFinalScheduledSubmit}
                className="px-6 py-2.5 bg-brand-primary hover:bg-slate-700 text-white font-extrabold rounded-full text-xs md:text-sm shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <CheckSquare className="w-4 h-4" />
                <Translate fil="Isumite ang Pagsusulit" en="Submit Final Exam" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
