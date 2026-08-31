'use client'

import { useState, useRef } from 'react'
import { 
  Sparkles, FileText, Upload, X, Loader2, CheckCircle2, 
  AlertCircle, ArrowRight, BookOpen, Layers, Edit3, Trash2,
  Check, Clock, Key
} from 'lucide-react'
import { Translate } from '@/components/Translate'

export interface GeneratedCard {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'fill_blank' | 'enumeration'
  options?: string[]
  correct_answer: any
  time_limit?: number | null
  explanation?: string | null
}

interface AIQuestionGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCards: (cards: GeneratedCard[]) => void
}

export function AIQuestionGeneratorModal({
  isOpen,
  onClose,
  onAddCards
}: AIQuestionGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'pdf'>('prompt')
  
  // Prompt form state
  const [topic, setTopic] = useState('')
  const [gradeLevel, setGradeLevel] = useState('Baitang 4-6 (Grade 4-6)')
  const [count, setCount] = useState(5)
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'fill_blank' | 'both'>('multiple_choice')
  const [promptText, setPromptText] = useState('')

  // PDF form state
  const [pdfMode, setPdfMode] = useState<'extract_pdf' | 'lesson_pdf'>('lesson_pdf')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Status & Results
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missingApiKey, setMissingApiKey] = useState(false)
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([])
  const [selectedCardIds, setSelectedCardIds] = useState<Record<string, boolean>>({})
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setError('Tanging mga PDF file lamang ang maaaring i-upload.')
        return
      }
      if (file.size > 20 * 1024 * 1024) {
        setError('Ang PDF ay dapat mas maliit sa 20MB.')
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleGenerate = async () => {
    setError(null)
    setMissingApiKey(false)

    if (activeTab === 'prompt' && !topic.trim() && !promptText.trim()) {
      setError('Mangyaring maglagay ng paksa o tagubilin para sa AI.')
      return
    }

    if (activeTab === 'pdf' && !selectedFile) {
      setError('Mangyaring pumili ng PDF file na susuriin.')
      return
    }

    setIsGenerating(true)

    try {
      const formData = new FormData()
      formData.append('mode', activeTab === 'pdf' ? pdfMode : 'prompt')
      formData.append('topic', topic)
      formData.append('gradeLevel', gradeLevel)
      formData.append('count', String(count))
      formData.append('questionType', questionType)
      formData.append('prompt', promptText)

      if (activeTab === 'pdf' && selectedFile) {
        formData.append('file', selectedFile)
      }

      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.missingKey) {
          setMissingApiKey(true)
        }
        throw new Error(data.error || 'Nabigo sa pagbuo ng mga tanong gamit ang AI.')
      }

      const cards: GeneratedCard[] = data.cards || []
      setGeneratedCards(cards)
      
      // Auto select all generated cards
      const selMap: Record<string, boolean> = {}
      cards.forEach((c) => {
        selMap[c.id] = true
      })
      setSelectedCardIds(selMap)

    } catch (err: any) {
      console.error('Error generating questions:', err)
      setError(err?.message || 'Nagkaroon ng aberya sa AI generator.')
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleSelectCard = (id: string) => {
    setSelectedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const toggleSelectAll = () => {
    const allSelected = generatedCards.every((c) => selectedCardIds[c.id])
    const newMap: Record<string, boolean> = {}
    generatedCards.forEach((c) => {
      newMap[c.id] = !allSelected
    })
    setSelectedCardIds(newMap)
  }

  const handleApplyCards = () => {
    const cardsToAdd = generatedCards.filter((c) => selectedCardIds[c.id])
    if (cardsToAdd.length === 0) {
      setError('Pumili ng kahit isang kard na idaragdag.')
      return
    }
    onAddCards(cardsToAdd)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full border border-slate-200 shadow-2xl relative my-8 animate-scale-up max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-heading font-black text-slate-900 flex items-center gap-2">
              <Translate fil="AI Question Generator" en="AI Question Generator" />
              <span className="px-2 py-0.5 text-[10px] uppercase font-black bg-amber-100 text-amber-900 rounded-full">
                Gemini 2.5
              </span>
            </h2>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              <Translate 
                fil="Bumuo ng mga pagsusulit mula sa paksa o mag-upload ng PDF aralin / question sheet." 
                en="Generate quiz cards from a prompt topic or uploaded lesson PDF / Q&A sheet." 
              />
            </p>
          </div>
        </div>

        {/* Missing API Key Alert */}
        {missingApiKey && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-start gap-3 shrink-0">
            <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Kailangan ng Gemini API Key!</p>
              <p className="text-slate-600">
                Upang magamit ang AI generator, magdagdag ng <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900">GEMINI_API_KEY=iyong_api_key</code> sa iyong <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900">.env.local</code> file at i-restart ang server.
              </p>
              <p className="text-[11px] text-amber-800">
                Makakakuha ng libreng API key sa Google AI Studio (aistudio.google.com).
              </p>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* VIEW 1: FORM INPUT (When not showing generated results) */}
        {generatedCards.length === 0 ? (
          <div className="flex-1 overflow-y-auto pr-1 space-y-6">
            
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('prompt')}
                className={`py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'prompt'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <Translate fil="Paksa / Prompt" en="Topic / Prompt" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'pdf'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-brand-primary" />
                <Translate fil="Mag-upload ng PDF" en="Upload PDF" />
              </button>
            </div>

            {/* TAB 1: PROMPT / TOPIC FORM */}
            {activeTab === 'prompt' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    <Translate fil="Paksa ng Pagsusulit" en="Quiz Topic" /> *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="hal. Pandiwa at Aspekto, Paggamit ng ng at nang, Talasalitaan..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      <Translate fil="Baitang / Antas" en="Grade Level" />
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-hidden"
                    >
                      <option value="Baitang 1-3 (Grade 1-3)">Baitang 1-3 (Primary / Mababa)</option>
                      <option value="Baitang 4-6 (Grade 4-6)">Baitang 4-6 (Intermediate / Gitna)</option>
                      <option value="Junior High School (Grade 7-10)">Junior High School (Baitang 7-10)</option>
                      <option value="Senior High School / Kolehiyo">Senior High School / Kolehiyo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      <Translate fil="Bilang ng Tanong" en="Question Count" />
                    </label>
                    <select
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value, 10))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-hidden"
                    >
                      <option value={3}>3 Tanong</option>
                      <option value={5}>5 Tanong</option>
                      <option value={10}>10 Tanong</option>
                      <option value={15}>15 Tanong</option>
                      <option value={20}>20 Tanong</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    <Translate fil="Uri ng Tanong" en="Question Type" />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'multiple_choice', label: 'Multiple Choice (4 Opsyon)' },
                      { id: 'fill_blank', label: 'Punan ang Patlang' },
                      { id: 'both', label: 'Kumbinasyon' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setQuestionType(type.id as any)}
                        className={`p-3 rounded-2xl text-xs font-extrabold border transition-all text-center cursor-pointer ${
                          questionType === type.id
                            ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    <Translate fil="Karagdagang Tagubilin (Opsyonal)" en="Custom Instructions (Optional)" />
                  </label>
                  <textarea
                    rows={2}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="hal. Magpokus sa mga halimbawa sa pang-araw-araw na buhay, o magbigay ng maikling talata na susuriin..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-hidden resize-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: PDF UPLOAD FORM */}
            {activeTab === 'pdf' && (
              <div className="space-y-4">
                {/* PDF Mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPdfMode('lesson_pdf')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      pdfMode === 'lesson_pdf'
                        ? 'bg-brand-light/30 border-brand-primary text-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 text-brand-primary mb-1.5" />
                    <p className="font-extrabold text-xs text-slate-900">Aralin / Module PDF</p>
                    <p className="text-[11px] text-slate-500 font-medium">Bumuo ng mga bagong tanong batay sa nilalaman ng aralin o kwento.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfMode('extract_pdf')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      pdfMode === 'extract_pdf'
                        ? 'bg-brand-light/30 border-brand-primary text-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Layers className="w-5 h-5 text-brand-primary mb-1.5" />
                    <p className="font-extrabold text-xs text-slate-900">Question Sheet PDF</p>
                    <p className="text-[11px] text-slate-500 font-medium">I-extract at isaayos ang mga nakasulat na tanong at sagot mula sa PDF.</p>
                  </button>
                </div>

                {/* Drag & drop upload area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-brand-primary rounded-3xl p-6 text-center cursor-pointer transition-all bg-slate-50 hover:bg-slate-100/70"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-2 text-brand-primary shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-extrabold text-slate-900">{selectedFile.name}</p>
                      <p className="text-xs font-semibold text-emerald-600">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Handa nang iproseso
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-extrabold text-slate-800">
                        <Translate fil="Pindutin para pumili ng PDF file" en="Click to select a PDF file" />
                      </p>
                      <p className="text-xs text-slate-500 font-medium">Hanggang 20MB na PDF module, story, o quiz sheet</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      <Translate fil="Target na Bilang ng Tanong" en="Question Count" />
                    </label>
                    <select
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value, 10))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-primary focus:bg-white transition-all outline-hidden"
                    >
                      <option value={3}>3 Tanong</option>
                      <option value={5}>5 Tanong</option>
                      <option value={10}>10 Tanong</option>
                      <option value={15}>15 Tanong</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      <Translate fil="Antas / Baitang" en="Grade Level" />
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-primary focus:bg-white transition-all outline-hidden"
                    >
                      <option value="Baitang 1-3">Baitang 1-3</option>
                      <option value="Baitang 4-6">Baitang 4-6</option>
                      <option value="Junior High School">Junior High School</option>
                      <option value="Senior High School">Senior High School</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    <Translate fil="Karagdagang Tagubilin (Opsyonal)" en="Custom Instructions (Optional)" />
                  </label>
                  <textarea
                    rows={2}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="hal. Magpokus sa kabanata 2 o sa talasalitaan..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-primary focus:bg-white transition-all outline-hidden resize-none"
                  />
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs cursor-pointer"
              >
                <Translate fil="Kanselahin" en="Cancel" />
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-3 bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black rounded-full text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Binubuo ang mga tanong gamit ang Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bumuo ng mga Kard Gamit ang AI ➔</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ) : (
          /* VIEW 2: GENERATED CARDS PREVIEW & REVIEW */
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 flex flex-col">
            <div className="flex items-center justify-between shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  {generatedCards.every((c) => selectedCardIds[c.id]) ? 'Alisin Lahat' : 'Piliin Lahat'}
                </button>
                <span className="text-xs font-bold text-slate-500">
                  {generatedCards.filter((c) => selectedCardIds[c.id]).length} sa {generatedCards.length} napiling kard
                </span>
              </div>

              <button
                type="button"
                onClick={() => setGeneratedCards([])}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Muling Bumuo
              </button>
            </div>

            {/* List of cards */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {generatedCards.map((card, idx) => {
                const isSelected = !!selectedCardIds[card.id]

                return (
                  <div
                    key={card.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCard(card.id)}
                        className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-black text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-slate-200 text-slate-700">
                            {card.question_type === 'multiple_choice' ? 'Multiple Choice' : 'Punan ang Patlang'}
                          </span>
                          {card.time_limit && (
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {card.time_limit}s
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-extrabold text-slate-900 mb-2">{card.question_text}</p>

                        {/* Options if multiple choice */}
                        {card.question_type === 'multiple_choice' && card.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {card.options.map((opt, oIdx) => {
                              const isCorrect = String(opt).trim().toLowerCase() === String(card.correct_answer).trim().toLowerCase() || String(card.correct_answer) === String(oIdx)

                              return (
                                <div
                                  key={oIdx}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center justify-between ${
                                    isCorrect
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Fill blank answer */}
                        {card.question_type === 'fill_blank' && (
                          <div className="mt-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl inline-block border border-emerald-300">
                            Tamang Sagot: {card.correct_answer}
                          </div>
                        )}

                        {card.explanation && (
                          <p className="text-[11px] text-slate-500 font-medium mt-2 italic">
                            💡 Paliwanag: {card.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Apply footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setGeneratedCards([])}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs cursor-pointer"
              >
                Bumalik sa Form
              </button>

              <button
                type="button"
                onClick={handleApplyCards}
                className="px-6 py-3 bg-brand-primary hover:bg-slate-800 text-white font-black rounded-full text-sm shadow-md flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Idagdag ang {generatedCards.filter((c) => selectedCardIds[c.id]).length} Kard sa Sesyon ➔</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
