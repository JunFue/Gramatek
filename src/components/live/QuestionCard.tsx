'use client'

import { useState, useMemo, useEffect } from 'react'
import { LiveSessionQuestion } from '@/types/live-session'
import { normalizeChoices, shuffleChoicesDeterministically } from '@/lib/utils/randomize'
import { CountdownTimer } from './CountdownTimer'
import { CheckCircle2, XCircle, Clock, Send, ShieldAlert, Sparkles, Loader2, Check } from 'lucide-react'
import { Translate } from '@/components/Translate'

interface QuestionCardProps {
  question: LiveSessionQuestion
  pacing: 'manual' | 'timed'
  startedAt?: string | null
  serverOffset?: number
  randomizeChoices?: boolean
  seedKey?: string
  isRevealed?: boolean
  canSubmit?: boolean
  isGroupMode?: boolean
  leaderName?: string
  myAnswer?: string | null
  submittedResult?: {
    isCorrect?: boolean
    points?: number
  } | null
  readOnly?: boolean
  onExpire?: () => void
  onSubmit?: (answer: string) => Promise<void>
}

export function QuestionCard({
  question,
  pacing,
  startedAt,
  serverOffset = 0,
  randomizeChoices = false,
  seedKey = '',
  isRevealed = false,
  canSubmit = true,
  isGroupMode = false,
  leaderName,
  myAnswer = null,
  submittedResult = null,
  readOnly = false,
  onExpire,
  onSubmit
}: QuestionCardProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(myAnswer)
  const [customTextInput, setCustomTextInput] = useState<string>(myAnswer || '')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitted, setSubmitted] = useState<boolean>(!!myAnswer)

  // Sync state whenever question or myAnswer changes
  useEffect(() => {
    setSelectedChoice(myAnswer)
    setCustomTextInput(myAnswer || '')
    setSubmitted(!!myAnswer)
    setSubmitting(false)
  }, [question.id, myAnswer])

  // Normalize and optionally shuffle choices deterministically
  const displayChoices = useMemo(() => {
    const raw = normalizeChoices(question.choices)
    if (randomizeChoices && seedKey) {
      return shuffleChoicesDeterministically(raw, `${seedKey}-${question.id}`)
    }
    return raw
  }, [question.choices, randomizeChoices, seedKey, question.id])

  const handleSubmit = async (answerText: string) => {
    if (!canSubmit || readOnly || submitted || submitting || !onSubmit || !answerText.trim()) return
    setSubmitting(true)

    try {
      await onSubmit(answerText.trim())
      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting answer:', err)
      setSubmitted(false)
    } finally {
      setSubmitting(false)
    }
  }

  const durationSeconds = question.time_limit_seconds || 30

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Question Index & Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-brand-primary text-white rounded-full text-xs font-black shadow-xs">
            Aytem {question.order_index + 1}
          </span>
          {isGroupMode && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
              Pangkatang Mode
            </span>
          )}
        </div>

        {pacing === 'timed' && startedAt && !isRevealed && (
          <div className="w-full sm:w-64">
            <CountdownTimer
              startedAt={startedAt}
              durationSeconds={durationSeconds}
              serverOffset={serverOffset}
              onExpire={onExpire}
              variant="bar"
            />
          </div>
        )}
      </div>

      {/* Prompt */}
      <div className="mb-8 relative z-10">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-heading font-black text-slate-900 leading-snug">
          {question.prompt}
        </h2>
      </div>

      {/* Role Notice (for non-leader in group mode) */}
      {isGroupMode && !canSubmit && !readOnly && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-800 text-sm font-bold animate-fade-in">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            {leaderName
              ? `Si ${leaderName} (Lider) ang magsusumite ng sagot para sa inyong pangkat.`
              : 'Ang inyong Lider lamang ang magsusumite ng sagot para sa pangkat.'}
          </span>
        </div>
      )}

      {/* Choices Grid or Text Input */}
      {displayChoices.length > 0 ? (
        <div className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayChoices.map((choice, idx) => {
              const choiceLetter = String.fromCharCode(65 + idx)
              const isSelected = selectedChoice === choice.text || myAnswer === choice.text
              const isCorrect = isRevealed && (choice.text.trim().toLowerCase() === question.correct_answer.trim().toLowerCase())
              const isWrongSelected = isRevealed && isSelected && !isCorrect

              let choiceStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:border-brand-primary hover:bg-brand-primary/5 cursor-pointer'

              if (isRevealed) {
                if (isCorrect) {
                  choiceStyle = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-black shadow-md'
                } else if (isWrongSelected) {
                  choiceStyle = 'bg-rose-50 border-2 border-rose-500 text-rose-950 font-bold'
                } else {
                  choiceStyle = 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-60'
                }
              } else if (submitted && isSelected) {
                choiceStyle = 'bg-brand-primary/10 border-2 border-brand-primary text-brand-primary font-black shadow-md'
              } else if (submitted) {
                choiceStyle = 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-60 cursor-default'
              } else if (isSelected) {
                choiceStyle = 'bg-brand-primary/10 border-2 border-brand-primary text-brand-primary font-black shadow-md scale-[1.01]'
              }

              return (
                <button
                  key={choice.id}
                  disabled={readOnly || !canSubmit || submitted || isRevealed}
                  onClick={() => {
                    if (!submitted && !readOnly && canSubmit && !isRevealed) {
                      setSelectedChoice(choice.text)
                    }
                  }}
                  className={`w-full p-4 md:p-5 rounded-2xl border text-left transition-all flex items-start gap-3.5 shadow-sm active:scale-[0.99] disabled:cursor-default ${choiceStyle}`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                      isRevealed && isCorrect
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : isRevealed && isWrongSelected
                        ? 'bg-rose-500 text-white border-rose-600'
                        : isSelected
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'bg-white text-slate-700 border-slate-200 shadow-inner'
                    }`}
                  >
                    {choiceLetter}
                  </span>

                  <span className="text-base md:text-lg font-bold flex-1 pt-0.5 leading-relaxed">
                    {choice.text}
                  </span>

                  {isRevealed && isCorrect && (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 self-center" />
                  )}
                  {isRevealed && isWrongSelected && (
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0 self-center" />
                  )}
                  {!isRevealed && isSelected && !submitted && (
                    <Check className="w-5 h-5 text-brand-primary shrink-0 self-center animate-scale-up" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Explicit Submit Button for Choices */}
          {!submitted && canSubmit && !readOnly && !isRevealed && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl animate-fade-in shadow-xs">
              <div className="text-xs text-slate-600">
                {selectedChoice ? (
                  <span>
                    Napiling Sagot: <strong className="text-slate-900 font-black text-sm">{selectedChoice}</strong>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium italic">
                    <Translate fil="Pumili ng isa sa mga opsyon sa itaas bago magpasa." en="Select an option above before submitting." />
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => selectedChoice && handleSubmit(selectedChoice)}
                disabled={!selectedChoice || submitting}
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-primary hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span><Translate fil="Ipinapasa..." en="Submitting..." /></span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span><Translate fil="Ipasa ang Sagot ➔" en="Submit Answer ➔" /></span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-lg mx-auto space-y-4 relative z-10">
          <input
            type="text"
            value={customTextInput}
            onChange={(e) => setCustomTextInput(e.target.value)}
            disabled={readOnly || !canSubmit || submitted || isRevealed}
            placeholder="I-type ang iyong sagot..."
            className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-5 py-3.5 text-lg font-bold text-slate-900 focus:outline-none focus:border-brand-primary uppercase shadow-inner"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customTextInput.trim()) {
                handleSubmit(customTextInput.trim())
              }
            }}
          />
          {!submitted && canSubmit && !readOnly && !isRevealed && (
            <button
              type="button"
              onClick={() => handleSubmit(customTextInput.trim())}
              disabled={!customTextInput.trim() || submitting}
              className="w-full py-3.5 bg-brand-primary hover:bg-slate-800 text-white font-black rounded-2xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span><Translate fil="Ipinapasa..." en="Submitting..." /></span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span><Translate fil="Ipasa ang Sagot ➔" en="Submit Answer ➔" /></span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Submission Feedback Banner (Neutral confirmation without leaking points or correctness) */}
      {!readOnly && submitted && !isRevealed && (
        <div className="mt-6 p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0" />
            <span className="text-slate-900 font-extrabold text-sm">
              <Translate fil="Naisumite na ang iyong sagot! Naka-record na sa sesyon." en="Your answer is submitted and recorded for this session." />
            </span>
          </div>
          <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full font-black text-xs">
            <Translate fil="Naisumite" en="Submitted" />
          </span>
        </div>
      )}

      {/* Reveal Result Banner */}
      {isRevealed && (
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Translate fil="Tamang Sagot" en="Correct Answer" />
              </p>
              <p className="text-base font-black text-slate-900">
                {question.correct_answer}
              </p>
            </div>
          </div>

          {submittedResult?.points !== undefined && (
            <div className="text-right">
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs ${
                submittedResult.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {submittedResult.isCorrect ? `+${submittedResult.points} pts` : 'Walang puntos'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
