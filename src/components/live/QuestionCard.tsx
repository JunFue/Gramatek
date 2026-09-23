'use client'

import { useState, useMemo, useEffect } from 'react'
import { LiveSessionQuestion } from '@/types/live-session'
import { normalizeChoices, shuffleChoicesDeterministically } from '@/lib/utils/randomize'
import { resolveQuestionType, extractChoicesList, getQuestionTypeMeta } from '@/lib/utils/live-questions'
import { CountdownTimer } from './CountdownTimer'
import { 
  CheckCircle2, XCircle, Clock, Send, ShieldAlert, 
  Sparkles, Loader2, Check, RotateCcw, ListOrdered, Type, HelpCircle 
} from 'lucide-react'
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
  isPaused?: boolean
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
  isPaused = false,
  onExpire,
  onSubmit
}: QuestionCardProps) {
  // Determine question type reliably
  const qType = useMemo(() => resolveQuestionType(question), [question])
  const typeMeta = useMemo(() => getQuestionTypeMeta(qType), [qType])

  // Extract raw option strings (for scramble, enumeration, true/false)
  const rawOptionsList = useMemo(() => {
    const list = extractChoicesList(question.choices)
    if (qType === 'word_scramble' && list.length === 0 && question.correct_answer) {
      // Fallback scrambled letters if not pre-stored
      return question.correct_answer.toUpperCase().replace(/\s+/g, '').split('').sort(() => 0.5 - Math.random())
    }
    return list
  }, [question.choices, question.correct_answer, qType])

  // State for multiple choice & true/false
  const [selectedChoice, setSelectedChoice] = useState<string | null>(myAnswer)
  
  // State for fill in blank
  const [customTextInput, setCustomTextInput] = useState<string>(myAnswer || '')

  // State for scramble (word or sentence)
  const [scrambleSelectedIndices, setScrambleSelectedIndices] = useState<number[]>([])

  // State for enumeration
  const enumSlotsCount = useMemo(() => {
    const fromOptions = rawOptionsList.length
    const fromCorrect = question.correct_answer ? question.correct_answer.split(',').length : 0
    return Math.max(2, fromOptions || fromCorrect || 3)
  }, [rawOptionsList.length, question.correct_answer])

  const [enumAnswers, setEnumAnswers] = useState<string[]>(() => {
    if (myAnswer && qType === 'enumeration') {
      const parts = myAnswer.split(',').map((s) => s.trim())
      while (parts.length < enumSlotsCount) parts.push('')
      return parts
    }
    return Array.from({ length: enumSlotsCount }, () => '')
  })

  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitted, setSubmitted] = useState<boolean>(!!myAnswer)

  // Sync state whenever question or myAnswer changes
  useEffect(() => {
    setSelectedChoice(myAnswer)
    setCustomTextInput(myAnswer || '')
    setSubmitted(!!myAnswer)
    setSubmitting(false)
    setScrambleSelectedIndices([])

    if (myAnswer && qType === 'enumeration') {
      const parts = myAnswer.split(',').map((s) => s.trim())
      while (parts.length < enumSlotsCount) parts.push('')
      setEnumAnswers(parts)
    } else {
      setEnumAnswers(Array.from({ length: enumSlotsCount }, () => ''))
    }
  }, [question.id, myAnswer, qType, enumSlotsCount])

  // Normalize choices for multiple choice mode
  const displayChoices = useMemo(() => {
    if (qType !== 'multiple_choice') return []
    const raw = normalizeChoices(question.choices)
    if (randomizeChoices && seedKey) {
      return shuffleChoicesDeterministically(raw, `${seedKey}-${question.id}`)
    }
    return raw
  }, [question.choices, randomizeChoices, seedKey, question.id, qType])

  const handleSubmit = async (answerText: string) => {
    if (!canSubmit || readOnly || isPaused || submitted || submitting || !onSubmit || !answerText.trim()) return
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

  // Scramble word / sentence helpers
  const constructedScrambleAnswer = useMemo(() => {
    if (qType === 'word_scramble') {
      return scrambleSelectedIndices.map((i) => rawOptionsList[i] || '').join('').toUpperCase()
    }
    if (qType === 'sentence_scramble') {
      return scrambleSelectedIndices.map((i) => rawOptionsList[i] || '').join(' ')
    }
    return ''
  }, [qType, scrambleSelectedIndices, rawOptionsList])

  // Enumeration submit handler
  const handleEnumSubmit = () => {
    const cleaned = enumAnswers.map((s) => s.trim()).filter(Boolean)
    if (cleaned.length === 0) return
    handleSubmit(cleaned.join(', '))
  }

  const durationSeconds = question.time_limit_seconds || 30

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Question Index, Type Badge & Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3.5 py-1.5 bg-brand-primary text-white rounded-full text-xs font-black shadow-xs">
            Aytem {question.order_index + 1}
          </span>

          {/* Explicit Card Type Badge */}
          <span className={`px-3 py-1 rounded-full text-xs font-black border ${typeMeta.badgeClass}`}>
            <Translate fil={typeMeta.labelFil} en={typeMeta.labelEn} />
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
              isPaused={isPaused}
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

      {/* ========================================================================= */}
      {/* 1. WORD SCRAMBLE INTERACTIVE VIEW */}
      {/* ========================================================================= */}
      {qType === 'word_scramble' && (
        <div className="space-y-6 relative z-10 max-w-xl mx-auto">
          {/* Construction Slot */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                <Translate fil="Binuong Salita:" en="Constructed Word:" />
              </span>
              {scrambleSelectedIndices.length > 0 && !submitted && !isRevealed && canSubmit && (
                <button
                  type="button"
                  onClick={() => setScrambleSelectedIndices([])}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <Translate fil="I-reset ang Titik" en="Reset Letters" />
                </button>
              )}
            </div>

            <div className="min-h-[76px] p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-amber-300 flex flex-wrap gap-2.5 items-center justify-center shadow-inner">
              {scrambleSelectedIndices.length === 0 && !submitted ? (
                <p className="text-slate-400 font-bold text-xs md:text-sm text-center">
                  <Translate fil="I-tap ang mga titik sa ibaba upang buuin ang salita..." en="Tap the letters below to construct the word..." />
                </p>
              ) : submitted && !scrambleSelectedIndices.length && myAnswer ? (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {myAnswer.split('').map((char, idx) => (
                    <span
                      key={idx}
                      className="w-10 h-10 md:w-12 md:h-12 bg-brand-primary text-white font-black text-xl rounded-xl shadow-md flex items-center justify-center font-mono"
                    >
                      {char.toUpperCase()}
                    </span>
                  ))}
                </div>
              ) : (
                scrambleSelectedIndices.map((letterIdx, pos) => {
                  const char = rawOptionsList[letterIdx]
                  return (
                    <button
                      key={`slot_${letterIdx}_${pos}`}
                      type="button"
                      disabled={readOnly || !canSubmit || submitted || isRevealed}
                      onClick={() => {
                        setScrambleSelectedIndices((prev) => prev.filter((_, i) => i !== pos))
                      }}
                      className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 hover:bg-rose-500 text-white font-black text-xl rounded-xl shadow-md flex items-center justify-center transition-all cursor-pointer animate-scale-up font-mono"
                      title="I-tap para alisin"
                    >
                      {char}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Letter Bank Pool */}
          {!submitted && !isRevealed && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-center">
                <Translate fil="Pagpipiliang mga Titik:" en="Available Letter Tiles:" />
              </span>
              <div className="flex flex-wrap gap-2.5 justify-center p-5 bg-slate-100/80 rounded-2xl border border-slate-200">
                {rawOptionsList.map((char: string, lIdx: number) => {
                  const isUsed = scrambleSelectedIndices.includes(lIdx)

                  return (
                    <button
                      key={`letter_${lIdx}`}
                      type="button"
                      disabled={readOnly || !canSubmit || isUsed}
                      onClick={() => {
                        setScrambleSelectedIndices((prev) => [...prev, lIdx])
                      }}
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl font-black text-xl md:text-2xl border transition-all flex items-center justify-center font-mono ${
                        isUsed
                          ? 'bg-slate-200 text-slate-400 border-slate-300 opacity-40 cursor-not-allowed scale-95'
                          : 'bg-white hover:bg-amber-400 hover:text-slate-950 text-slate-900 border-slate-300 shadow-sm active:scale-90 cursor-pointer'
                      }`}
                    >
                      {char}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          {!submitted && canSubmit && !readOnly && !isRevealed && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => constructedScrambleAnswer && handleSubmit(constructedScrambleAnswer)}
                disabled={!constructedScrambleAnswer || submitting}
                className="w-full py-4 bg-brand-primary hover:bg-slate-800 text-white font-black rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span><Translate fil="Ipinapasa..." en="Submitting..." /></span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-emerald-400" />
                    <span>
                      <Translate
                        fil={`Ipasa ang Salita: "${constructedScrambleAnswer || '...'}" ➔`}
                        en={`Submit Word: "${constructedScrambleAnswer || '...'}" ➔`}
                      />
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ENUMERATION INTERACTIVE VIEW */}
      {/* ========================================================================= */}
      {qType === 'enumeration' && (
        <div className="space-y-6 relative z-10 max-w-xl mx-auto">
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs md:text-sm font-bold flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <Translate
                fil="Ilista ang mga sagot sa mga kahon sa ibaba (anumang pagkakasunod-sunod):"
                en="List your answers in the boxes below (any order accepted):"
              />
            </span>
          </div>

          <div className="space-y-3">
            {enumAnswers.map((val, slotIdx) => (
              <div key={slotIdx} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-300 shadow-xs">
                  {slotIdx + 1}
                </span>
                <input
                  type="text"
                  value={val}
                  disabled={readOnly || !canSubmit || submitted || isRevealed}
                  onChange={(e) => {
                    const newArr = [...enumAnswers]
                    newArr[slotIdx] = e.target.value
                    setEnumAnswers(newArr)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEnumSubmit()
                  }}
                  placeholder={`Sagot ${slotIdx + 1}...`}
                  className="flex-1 bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:border-brand-primary shadow-inner disabled:bg-slate-100 disabled:text-slate-700"
                />
              </div>
            ))}
          </div>

          {/* Submit Button */}
          {!submitted && canSubmit && !readOnly && !isRevealed && (
            <button
              type="button"
              onClick={handleEnumSubmit}
              disabled={!enumAnswers.some((s) => s.trim().length > 0) || submitting}
              className="w-full py-4 bg-brand-primary hover:bg-slate-800 text-white font-black rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span><Translate fil="Ipinapasa..." en="Submitting..." /></span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 text-emerald-400" />
                  <span><Translate fil="Ipasa ang Listahan ➔" en="Submit List ➔" /></span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SENTENCE SCRAMBLE INTERACTIVE VIEW */}
      {/* ========================================================================= */}
      {qType === 'sentence_scramble' && (
        <div className="space-y-6 relative z-10 max-w-xl mx-auto">
          {/* Construction Slot */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                <Translate fil="Binuong Pangungusap:" en="Constructed Sentence:" />
              </span>
              {scrambleSelectedIndices.length > 0 && !submitted && !isRevealed && canSubmit && (
                <button
                  type="button"
                  onClick={() => setScrambleSelectedIndices([])}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <Translate fil="I-reset ang mga Salita" en="Reset Words" />
                </button>
              )}
            </div>

            <div className="min-h-[88px] p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-purple-300 flex flex-wrap gap-2.5 items-center justify-start shadow-inner">
              {scrambleSelectedIndices.length === 0 && !submitted ? (
                <p className="text-slate-400 font-bold text-xs md:text-sm text-center w-full">
                  <Translate fil="I-tap ang mga salita sa ibaba sa tamang pagkakasunod-sunod..." en="Tap the words below in the correct order..." />
                </p>
              ) : submitted && !scrambleSelectedIndices.length && myAnswer ? (
                <p className="text-base md:text-lg font-black text-slate-900 leading-relaxed">
                  {myAnswer}
                </p>
              ) : (
                scrambleSelectedIndices.map((idx, pos) => {
                  const word = rawOptionsList[idx]
                  return (
                    <button
                      key={`sent_slot_${idx}_${pos}`}
                      type="button"
                      disabled={readOnly || !canSubmit || submitted || isRevealed}
                      onClick={() => {
                        setScrambleSelectedIndices((prev) => prev.filter((_, i) => i !== pos))
                      }}
                      className="px-4 py-2 bg-brand-primary hover:bg-rose-500 text-white font-bold text-sm md:text-base rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer animate-scale-up"
                      title="I-tap para alisin"
                    >
                      <span>{word}</span>
                      <span className="text-white/60 text-xs font-mono">✕</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Word Bank Pool */}
          {!submitted && !isRevealed && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-center">
                <Translate fil="Pagpipiliang mga Salita:" en="Available Words:" />
              </span>
              <div className="flex flex-wrap gap-2 justify-center p-5 bg-slate-100/80 rounded-2xl border border-slate-200">
                {rawOptionsList.map((word: string, wIdx: number) => {
                  const isUsed = scrambleSelectedIndices.includes(wIdx)

                  return (
                    <button
                      key={`word_${wIdx}`}
                      type="button"
                      disabled={readOnly || !canSubmit || isUsed}
                      onClick={() => {
                        setScrambleSelectedIndices((prev) => [...prev, wIdx])
                      }}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm md:text-base border transition-all flex items-center justify-center ${
                        isUsed
                          ? 'bg-slate-200 text-slate-400 border-slate-300 opacity-40 cursor-not-allowed scale-95'
                          : 'bg-white hover:bg-purple-100 hover:border-purple-400 text-slate-900 border-slate-300 shadow-sm active:scale-95 cursor-pointer'
                      }`}
                    >
                      {word}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          {!submitted && canSubmit && !readOnly && !isRevealed && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => constructedScrambleAnswer && handleSubmit(constructedScrambleAnswer)}
                disabled={!constructedScrambleAnswer || submitting}
                className="w-full py-4 bg-brand-primary hover:bg-slate-800 text-white font-black rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span><Translate fil="Ipinapasa..." en="Submitting..." /></span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-emerald-400" />
                    <span><Translate fil="Ipasa ang Pangungusap ➔" en="Submit Sentence ➔" /></span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TRUE OR FALSE INTERACTIVE VIEW */}
      {/* ========================================================================= */}
      {qType === 'true_false' && (
        <div className="space-y-6 relative z-10 max-w-xl mx-auto">
          <div className="grid grid-cols-2 gap-4">
            {['TAMA', 'MALI'].map((option) => {
              const isSelected = selectedChoice?.toUpperCase() === option
              const isOptionCorrect = isRevealed && question.correct_answer.trim().toUpperCase() === option
              const isOptionWrongSelected = isRevealed && isSelected && !isOptionCorrect

              let style = option === 'TAMA'
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-950'

              if (isRevealed) {
                if (isOptionCorrect) {
                  style = 'bg-emerald-500 border-2 border-emerald-600 text-white shadow-xl scale-[1.02]'
                } else if (isOptionWrongSelected) {
                  style = 'bg-rose-500 border-2 border-rose-600 text-white shadow-md'
                } else {
                  style = 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
                }
              } else if (isSelected) {
                style = option === 'TAMA'
                  ? 'bg-emerald-600 border-2 border-emerald-700 text-white shadow-xl scale-[1.02]'
                  : 'bg-rose-600 border-2 border-rose-700 text-white shadow-xl scale-[1.02]'
              }

              return (
                <button
                  key={option}
                  type="button"
                  disabled={readOnly || !canSubmit || submitted || isRevealed}
                  onClick={() => setSelectedChoice(option)}
                  className={`p-6 rounded-3xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 disabled:cursor-default cursor-pointer ${style}`}
                >
                  <span className="text-3xl md:text-4xl font-black">
                    {option === 'TAMA' ? '✓' : '✗'}
                  </span>
                  <span className="text-lg md:text-xl font-black">
                    {option === 'TAMA' ? 'TAMA (True)' : 'MALI (False)'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Submit Button */}
          {!submitted && canSubmit && !readOnly && !isRevealed && (
            <button
              type="button"
              onClick={() => selectedChoice && handleSubmit(selectedChoice)}
              disabled={!selectedChoice || submitting}
              className="w-full py-4 bg-brand-primary hover:bg-slate-800 text-white font-black rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span><Translate fil="Ipinapasa..." en="Submitting..." /></span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 text-emerald-400" />
                  <span>
                    <Translate
                      fil={`Ipasa ang Sagot (${selectedChoice || 'Pumili sa itaas'}) ➔`}
                      en={`Submit Answer (${selectedChoice || 'Select above'}) ➔`}
                    />
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MULTIPLE CHOICE INTERACTIVE VIEW */}
      {/* ========================================================================= */}
      {qType === 'multiple_choice' && (
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
      )}

      {/* ========================================================================= */}
      {/* 6. FILL IN THE BLANK INTERACTIVE VIEW */}
      {/* ========================================================================= */}
      {qType === 'fill_blank' && (
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

      {/* Submission Feedback Banner */}
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
