'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Clock, FileQuestion, Users, CheckCircle2, 
  Edit3, EyeOff, Send, Trash2, AlertTriangle, X, 
  Loader2, Trophy, CalendarClock, Zap, Eye, RefreshCw
} from 'lucide-react'
import { Translate } from '@/components/Translate'
import { withdrawQuiz, publishQuiz, deleteQuiz } from '@/app/educator/quizzes/actions'

interface QuizDetailClientProps {
  quiz: any
  cards: any[]
  attempts: any[]
}

export function QuizDetailClient({ quiz, cards, attempts }: QuizDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Feedback toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleWithdraw = async () => {
    startTransition(async () => {
      const res = await withdrawQuiz(quiz.id)
      if (res?.error) {
        showToast('error', res.error)
      } else {
        showToast('success', res.message || 'Nai-withdraw ang pagsusulit.')
        setIsWithdrawModalOpen(false)
        router.refresh()
      }
    })
  }

  const handlePublish = async () => {
    startTransition(async () => {
      const res = await publishQuiz(quiz.id)
      if (res?.error) {
        showToast('error', res.error)
      } else {
        showToast('success', res.message || 'Matagumpay na nailathala ang pagsusulit!')
        router.refresh()
      }
    })
  }

  const handleDelete = async () => {
    startTransition(async () => {
      const res = await deleteQuiz(quiz.id, quiz.classroom_id)
      if (res?.error) {
        showToast('error', res.error)
        setIsDeleteModalOpen(false)
      } else {
        router.push(quiz.classroom_id ? `/educator/classrooms/${quiz.classroom_id}` : '/educator')
      }
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[150] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm text-white animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Back Link */}
      <Link 
        href={quiz.classroom_id ? `/educator/classrooms/${quiz.classroom_id}` : "/educator"} 
        className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-6 relative z-10 font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        <Translate fil="Bumalik sa Silid-aralan" en="Back to Classroom" />
      </Link>

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 mb-8 border border-slate-200 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
         
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-heading font-black text-slate-900">{quiz.title}</h1>
              
              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-black shadow-xs ${
                quiz.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {quiz.is_published ? '🟢 Nailathala' : '🟡 Draft / Na-withdraw'}
              </span>

              {/* Game Mode Badge */}
              {quiz.game_mode === 'mastery' && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-slate-500" /> <Translate fil="Masteriya" en="Mastery" />
                </span>
              )}
              {quiz.game_mode === 'scheduled' && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-slate-500" /> <Translate fil="Nakatakda" en="Scheduled" />
                </span>
              )}
              {quiz.game_mode === 'survival' && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-rose-500" /> <Translate fil="Kaligtasan" en="Survival" />
                </span>
              )}
            </div>

            <p className="text-slate-600 max-w-2xl text-base md:text-lg mb-5 font-medium">
              {quiz.description || 'Walang ibinigay na paglalarawan.'}
            </p>
            
            {/* Meta Tags / Details */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-slate-600 font-bold">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                {quiz.time_limit_seconds}s <Translate fil="bawat tanong" en="per question" />
              </div>
              <div className="flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-slate-400" />
                {cards?.length || 0} <Translate fil="Kard" en="Cards" />
              </div>
              
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                <Eye className="w-4 h-4 text-slate-500" />
                <span>
                  {quiz.feedback_timing === 'delayed' ? (
                    <Translate fil="Feedback: Pagkatapos ng Pagsusulit" en="Feedback: After Whole Test" />
                  ) : (
                    <Translate fil="Feedback: Bawat Tanong" en="Feedback: Every Question" />
                  )}
                </span>
              </div>

              {quiz.classrooms && (
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                  <Translate fil="Silid" en="Room" />: <Link href={`/educator/classrooms/${quiz.classroom_id}`} className="text-brand-primary hover:underline">{quiz.classrooms.name}</Link>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap lg:flex-col items-center lg:items-stretch gap-2.5 shrink-0">
            <Link
              href={`/educator/quizzes/${quiz.id}/edit`}
              className="px-4 py-2.5 bg-brand-primary hover:bg-slate-700 text-white rounded-2xl text-xs md:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <Translate fil="I-edit ang Pagsusulit" en="Edit Quiz" />
            </Link>

            {quiz.is_published ? (
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(true)}
                disabled={isPending}
                className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-2xl text-xs md:text-sm font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
                <Translate fil="I-withdraw ang Pagsusulit" en="Withdraw Quiz" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPending}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <Translate fil="I-publish Muli" en="Publish Quiz" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <Translate fil="Burahin" en="Delete" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Scores & Deck Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Col: Leaderboard / Attempts */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-primary" />
            <Translate fil="Nangungunang Iskor" en="Top Scores" />
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {attempts && attempts.length > 0 ? (
              <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                {attempts.map((attempt: any, i: number) => (
                  <li key={attempt.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 font-bold text-base text-slate-600 flex items-center justify-center">
                        #{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-800 text-sm font-bold truncate">{attempt.profiles?.full_name || 'Mag-aaral'}</p>
                        <p className="text-slate-500 text-xs font-medium">{new Date(attempt.completed_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-brand-primary font-black">{attempt.score} / {attempt.total_questions}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center bg-slate-50">
                <p className="text-slate-600 text-sm font-medium"><Translate fil="Wala pang nagtatangka." en="No attempts yet." /></p>
                {!quiz.is_published && (
                  <p className="text-amber-600 text-xs mt-2 font-bold">
                    <Translate fil="I-publish ang pagsusulit para malaro ng mga mag-aaral." en="Publish the quiz so students can play." />
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Cards Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-brand-secondary" />
              <Translate fil="Preview ng Deck" en="Deck Preview" />
            </h2>
            <Link
              href={`/educator/quizzes/${quiz.id}/edit`}
              className="text-brand-primary hover:text-slate-700 text-xs font-extrabold flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <Translate fil="Baguhin ang mga Tanong" en="Edit Questions" />
            </Link>
          </div>

          {cards && cards.length > 0 ? (
            <div className="space-y-4">
              {cards.map((card, i) => (
                <div key={card.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-brand-secondary text-sm font-mono font-bold tracking-wider mb-2">
                    <span>Kard {i + 1} • {card.question_type.replace('_', ' ')}</span>
                    {card.time_limit_override && (
                      <span className="text-xs text-slate-500 font-sans font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {card.time_limit_override}s
                      </span>
                    )}
                  </div>
                  <h3 className="text-slate-900 text-base md:text-lg font-bold mb-4">{card.question_text}</h3>
                  
                  {card.question_type === 'multiple_choice' && card.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {card.options.map((opt: string, idx: number) => (
                        <div 
                          key={idx} 
                          className={`px-4 py-3 rounded-xl text-sm flex items-center justify-between border font-bold ${
                            card.correct_answer === idx 
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs' 
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{opt}</span>
                          {card.correct_answer === idx && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 ml-2" />}
                        </div>
                      ))}
                    </div>
                  )}

                  {card.question_type === 'fill_blank' && (
                    <div className="mt-4">
                      <div className="px-4 py-2 bg-emerald-50 border border-emerald-500 text-emerald-700 rounded-xl text-sm inline-flex items-center gap-2 font-bold shadow-xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="font-mono">{card.correct_answer}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 font-medium"><Translate fil="Wala pang nilikhang mga kard sa pagsusulit na ito." en="No cards in this quiz." /></p>
          )}

        </div>

      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Withdraw Confirmation Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 text-center animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <EyeOff className="w-7 h-7" />
            </div>
            
            <h3 className="text-xl font-heading font-black text-slate-900 mb-2">
              <Translate fil="I-withdraw ang Pagsusulit?" en="Withdraw this Quiz?" />
            </h3>
            
            <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
              <Translate 
                fil="Kapag nai-withdraw, itatago ang pagsusulit na ito mula sa silid-aralan ng mga mag-aaral at magiging Draft ito. Maaari mo itong i-edit o i-publish muli kahit kailan." 
                en="When withdrawn, this quiz will be hidden from students in the classroom and set to Draft. You can edit or republish it anytime." 
              />
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-sm cursor-pointer"
              >
                <Translate fil="Kanselahin" en="Cancel" />
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isPending}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-full text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Translate fil="Oo, I-withdraw" en="Yes, Withdraw" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 text-center animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            
            <h3 className="text-xl font-heading font-black text-slate-900 mb-2">
              <Translate fil="Burahin ang Pagsusulit?" en="Delete this Quiz?" />
            </h3>
            
            <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
              <Translate 
                fil={`Sigurado ka bang nais mong burahin ang "${quiz.title}"? Mabubura ang lahat ng kard at rekord ng pagtatangka sa pagsusulit na ito.`} 
                en={`Are you sure you want to delete "${quiz.title}"? All cards and attempt records for this quiz will be permanently deleted.`} 
              />
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-sm cursor-pointer"
              >
                <Translate fil="Kanselahin" en="Cancel" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-full text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Translate fil="Oo, Burahin" en="Yes, Delete" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
