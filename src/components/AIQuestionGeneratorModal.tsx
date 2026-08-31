'use client'

import { useState, useRef } from 'react'
import { 
  Sparkles, FileText, Upload, X, Loader2, CheckCircle2, 
  AlertCircle, BookOpen, Layers, Check, Key, Plus, Minus,
  RotateCcw, Sliders, CheckSquare, Zap
} from 'lucide-react'
import { Translate } from '@/components/Translate'

export interface GeneratedCard {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'fill_blank' | 'enumeration' | 'word_scramble' | 'true_false' | 'sentence_scramble'
  options?: string[]
  correct_answer: any
  time_limit?: number | null
  explanation?: string | null
}

const CARD_TYPES_METADATA = [
  { id: 'multiple_choice', name: 'Multiple Choice', desc: '4 Pagpipilian', color: 'border-blue-200 bg-blue-50/50 text-blue-900', badge: 'bg-blue-100 text-blue-800' },
  { id: 'fill_blank', name: 'Punan ang Patlang', desc: 'May nawawalang salita (___)', color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900', badge: 'bg-indigo-100 text-indigo-800' },
  { id: 'enumeration', name: 'Enumerasyon', desc: 'Listahan ng mga aytem', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'word_scramble', name: 'Word Scramble', desc: 'Nagulong mga titik', color: 'border-amber-200 bg-amber-50/50 text-amber-900', badge: 'bg-amber-100 text-amber-800' },
  { id: 'true_false', name: 'Tama o Mali', desc: 'TAMA / MALI buttons', color: 'border-rose-200 bg-rose-50/50 text-rose-900', badge: 'bg-rose-100 text-rose-800' },
  { id: 'sentence_scramble', name: 'Ayusin ang Pangungusap', desc: 'Nagulong mga salita', color: 'border-purple-200 bg-purple-50/50 text-purple-900', badge: 'bg-purple-100 text-purple-800' }
]

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
  const [promptText, setPromptText] = useState('')

  // Per-type count breakdown (for Prompt & Lesson PDF)
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({
    multiple_choice: 3,
    fill_blank: 2,
    enumeration: 0,
    word_scramble: 0,
    true_false: 2,
    sentence_scramble: 0
  })

  // PDF form state
  const [pdfMode, setPdfMode] = useState<'extract_pdf' | 'lesson_pdf'>('extract_pdf')
  const [pdfCount, setPdfCount] = useState(100)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Status & Results
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missingApiKey, setMissingApiKey] = useState(false)
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([])
  const [selectedCardIds, setSelectedCardIds] = useState<Record<string, boolean>>({})

  if (!isOpen) return null

  const totalCalculatedQuestions = Object.values(typeCounts).reduce((acc, curr) => acc + (Number(curr) || 0), 0)

  const updateTypeCount = (typeId: string, delta: number) => {
    setTypeCounts((prev) => {
      const current = prev[typeId] || 0
      const next = Math.max(0, Math.min(50, current + delta))
      return { ...prev, [typeId]: next }
    })
  }

  const setDirectTypeCount = (typeId: string, val: number) => {
    setTypeCounts((prev) => ({
      ...prev,
      [typeId]: Math.max(0, Math.min(50, val || 0))
    }))
  }

  const applyPreset = (preset: 'mcq5' | 'tf5' | 'mixed' | 'all1' | 'clear') => {
    if (preset === 'mcq5') {
      setTypeCounts({ multiple_choice: 5, fill_blank: 0, enumeration: 0, word_scramble: 0, true_false: 0, sentence_scramble: 0 })
    } else if (preset === 'tf5') {
      setTypeCounts({ multiple_choice: 0, fill_blank: 0, enumeration: 0, word_scramble: 0, true_false: 5, sentence_scramble: 0 })
    } else if (preset === 'mixed') {
      setTypeCounts({ multiple_choice: 2, fill_blank: 2, enumeration: 1, word_scramble: 2, true_false: 2, sentence_scramble: 1 })
    } else if (preset === 'all1') {
      setTypeCounts({ multiple_choice: 1, fill_blank: 1, enumeration: 1, word_scramble: 1, true_false: 1, sentence_scramble: 1 })
    } else if (preset === 'clear') {
      setTypeCounts({ multiple_choice: 0, fill_blank: 0, enumeration: 0, word_scramble: 0, true_false: 0, sentence_scramble: 0 })
    }
  }

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

    // Check count for prompt or lesson_pdf
    if (activeTab === 'prompt' || (activeTab === 'pdf' && pdfMode === 'lesson_pdf')) {
      if (totalCalculatedQuestions === 0) {
        setError('Pumili ng kahit isang tanong sa alinmang uri ng kard bago magpatuloy.')
        return
      }
    }

    setIsGenerating(true)

    try {
      const formData = new FormData()
      formData.append('mode', activeTab === 'pdf' ? pdfMode : 'prompt')
      formData.append('topic', topic)
      formData.append('gradeLevel', gradeLevel)
      formData.append('prompt', promptText)

      if (activeTab === 'prompt' || (activeTab === 'pdf' && pdfMode === 'lesson_pdf')) {
        formData.append('typeCounts', JSON.stringify(typeCounts))
        formData.append('count', String(totalCalculatedQuestions))
      } else {
        // extract_pdf mode: auto-detect with total question limit
        formData.append('count', String(pdfCount))
      }

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

      const cards: GeneratedCard[] = (data.cards || []).map((c: any) => ({
        ...c,
        time_limit: null
      }))
      
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
                Gemini 3.6 Flash
              </span>
            </h2>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              <Translate 
                fil="Bumuo ng plain draft cards sa 6 na uri gamit ang prompt o PDF na may auto-detection at custom breakdown." 
                en="Generate plain draft cards in 6 types via prompt or PDF with auto-detection and custom breakdown." 
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

        {/* VIEW 1: FORM INPUT */}
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
                <Translate fil="Mag-upload ng PDF (Hanggang 100)" en="Upload PDF (Up to 100)" />
              </button>
            </div>

            {/* TAB 1: PROMPT / TOPIC FORM */}
            {activeTab === 'prompt' && (
              <div className="space-y-5">
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

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    <Translate fil="Baitang / Antas" en="Grade Level" />
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-hidden"
                  >
                    <option value="Baitang 1-3 (Grade 1-3)">Baitang 1-3 (Primary / Mababa)</option>
                    <option value="Baitang 4-6 (Grade 4-6)">Baitang 4-6 (Intermediate / Gitna)</option>
                    <option value="Junior High School (Grade 7-10)">Junior High School (Baitang 7-10)</option>
                    <option value="Senior High School / Kolehiyo">Senior High School / Kolehiyo</option>
                  </select>
                </div>

                {/* Card Type Breakdown Configurator */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-brand-primary" />
                        <Translate fil="I-configure ang Dami ng Bawat Uri ng Kard" en="Configure Quantity per Card Type" />
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">Itakda kung ilang tanong ang nais mong buuin para sa bawat uri.</p>
                    </div>

                    <div className="px-3 py-1 bg-amber-100 text-amber-950 font-black text-xs rounded-xl self-start sm:self-auto border border-amber-300">
                      Kabuoan: {totalCalculatedQuestions} Tanong
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 self-center">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('mcq5')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      5 Multiple Choice
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('tf5')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      5 Tama o Mali
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('mixed')}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-black text-amber-900 cursor-pointer"
                    >
                      ✨ Halo-halo (10 Tanong)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('all1')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      1 Bawat Uri (6 Tanong)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('clear')}
                      className="px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer ml-auto"
                    >
                      I-reset
                    </button>
                  </div>

                  {/* 6 Type Counters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {CARD_TYPES_METADATA.map((meta) => {
                      const count = typeCounts[meta.id] || 0

                      return (
                        <div
                          key={meta.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            count > 0 ? 'bg-white border-slate-300 shadow-xs' : 'bg-slate-100/60 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate">{meta.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">{meta.desc}</p>
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() => updateTypeCount(meta.id, -1)}
                              disabled={count === 0}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30 cursor-pointer shadow-2xs"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={count}
                              onChange={(e) => setDirectTypeCount(meta.id, parseInt(e.target.value, 10))}
                              className="w-8 text-center text-xs font-black text-slate-900 bg-transparent focus:outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => updateTypeCount(meta.id, 1)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
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
              <div className="space-y-5">
                {/* PDF Mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPdfMode('extract_pdf')
                      setPdfCount(100)
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      pdfMode === 'extract_pdf'
                        ? 'bg-brand-light/30 border-brand-primary text-slate-900 shadow-sm ring-1 ring-brand-primary/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Layers className="w-5 h-5 text-brand-primary mb-1.5" />
                    <p className="font-extrabold text-xs text-slate-900">Question Sheet / Reviewer PDF</p>
                    <p className="text-[11px] text-slate-500 font-medium">Awtomatikong tutukuyin (Auto-detect) ang uri ng bawat tanong mula sa PDF.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPdfMode('lesson_pdf')
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      pdfMode === 'lesson_pdf'
                        ? 'bg-brand-light/30 border-brand-primary text-slate-900 shadow-sm ring-1 ring-brand-primary/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 text-brand-primary mb-1.5" />
                    <p className="font-extrabold text-xs text-slate-900">Aralin / Kwento / Module PDF</p>
                    <p className="text-[11px] text-slate-500 font-medium">I-configure ang dami ng bawat uri ng kard na bubuuin mula sa aralin.</p>
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

                {/* PDF MODE 1: AUTO-DETECT FOR QUESTION SHEET */}
                {pdfMode === 'extract_pdf' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2.5 text-xs font-semibold">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-amber-950">✨ Awtomatikong Tutukuyin ng AI ang Uri ng Kard</p>
                        <p className="text-[11px] text-amber-900/90 font-medium mt-0.5">
                          Awtomatikong susuriin ng Gemini ang bawat tanong sa iyong PDF at ikaklasipika ito bilang Multiple Choice, Punan ang Patlang, Enumerasyon, Word Scramble, Tama o Mali, o Ayusin ang Pangungusap batay sa mismong pormat nito.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                        <Translate fil="Limitasyon sa Bilang ng Tanong" en="Question Count Limit" />
                      </label>
                      <select
                        value={pdfCount}
                        onChange={(e) => setPdfCount(parseInt(e.target.value, 10))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-primary focus:bg-white transition-all outline-hidden"
                      >
                        <option value={100}>Lahat ng Tanong sa PDF (Hanggang 100 Tanong)</option>
                        <option value={75}>Hanggang 75 Tanong</option>
                        <option value={50}>Hanggang 50 Tanong</option>
                        <option value={30}>Hanggang 30 Tanong</option>
                        <option value={20}>Hanggang 20 Tanong</option>
                        <option value={10}>Hanggang 10 Tanong</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* PDF MODE 2: PER-TYPE CONFIGURATOR FOR LESSON MATERIAL */}
                {pdfMode === 'lesson_pdf' && (
                  <div className="space-y-4">
                    <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-brand-primary" />
                            <Translate fil="Dami ng Bawat Uri ng Kard mula sa Aralin" en="Quantity per Card Type from Lesson" />
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">Itakda kung ilang tanong ang bubuuin ng AI batay sa nilalaman ng PDF.</p>
                        </div>

                        <div className="px-3 py-1 bg-amber-100 text-amber-950 font-black text-xs rounded-xl self-start sm:self-auto border border-amber-300">
                          Kabuoan: {totalCalculatedQuestions} Tanong
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-500 self-center">Presets:</span>
                        <button
                          type="button"
                          onClick={() => applyPreset('mcq5')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
                        >
                          5 Multiple Choice
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('tf5')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
                        >
                          5 Tama o Mali
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('mixed')}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-black text-amber-900 cursor-pointer"
                        >
                          ✨ Halo-halo (10 Tanong)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('all1')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
                        >
                          1 Bawat Uri (6 Tanong)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('clear')}
                          className="px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer ml-auto"
                        >
                          I-reset
                        </button>
                      </div>

                      {/* 6 Type Counters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        {CARD_TYPES_METADATA.map((meta) => {
                          const count = typeCounts[meta.id] || 0

                          return (
                            <div
                              key={meta.id}
                              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                count > 0 ? 'bg-white border-slate-300 shadow-xs' : 'bg-slate-100/60 border-slate-200 opacity-60'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">{meta.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium truncate">{meta.desc}</p>
                              </div>

                              {/* Stepper */}
                              <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                <button
                                  type="button"
                                  onClick={() => updateTypeCount(meta.id, -1)}
                                  disabled={count === 0}
                                  className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30 cursor-pointer shadow-2xs"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>

                                <input
                                  type="number"
                                  min={0}
                                  max={50}
                                  value={count}
                                  onChange={(e) => setDirectTypeCount(meta.id, parseInt(e.target.value, 10))}
                                  className="w-8 text-center text-xs font-black text-slate-900 bg-transparent focus:outline-none"
                                />

                                <button
                                  type="button"
                                  onClick={() => updateTypeCount(meta.id, 1)}
                                  className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    <Translate fil="Karagdagang Tagubilin (Opsyonal)" en="Custom Instructions (Optional)" />
                  </label>
                  <textarea
                    rows={2}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="hal. Kunin ang lahat ng pagsusulit at gawing halo-halong uri..."
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
                    <span>
                      {activeTab === 'pdf' && pdfMode === 'extract_pdf' 
                        ? 'I-extract at I-autodetect ang mga Kard ➔' 
                        : `Bumuo ng ${totalCalculatedQuestions} Kard gamit ang AI ➔`}
                    </span>
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
                            {card.question_type === 'multiple_choice' && 'Multiple Choice'}
                            {card.question_type === 'fill_blank' && 'Punan ang Patlang'}
                            {card.question_type === 'enumeration' && 'Enumerasyon'}
                            {card.question_type === 'word_scramble' && 'Word Scramble'}
                            {card.question_type === 'true_false' && 'Tama o Mali'}
                            {card.question_type === 'sentence_scramble' && 'Ayusin ang Pangungusap'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Plain Draft Card (Walang Pre-set Timer)
                          </span>
                        </div>

                        <p className="text-sm font-extrabold text-slate-900 mb-2">{card.question_text}</p>

                        {/* 1. Multiple choice preview */}
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

                        {/* 2. Fill blank preview */}
                        {card.question_type === 'fill_blank' && (
                          <div className="mt-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl inline-block border border-emerald-300">
                            Tamang Sagot: {card.correct_answer}
                          </div>
                        )}

                        {/* 3. Enumeration preview */}
                        {card.question_type === 'enumeration' && (
                          <div className="mt-1 space-y-1">
                            <span className="text-[11px] font-bold text-slate-500 block">Mga Katanggap-tanggap na Sagot:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(Array.isArray(card.options) ? card.options : [card.correct_answer]).map((ans, aIdx) => (
                                <span key={aIdx} className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-lg">
                                  {aIdx + 1}. {ans}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Word scramble preview */}
                        {card.question_type === 'word_scramble' && (
                          <div className="mt-1.5 flex items-center gap-3">
                            <div className="flex gap-1">
                              {(card.options || []).map((letter, lIdx) => (
                                <span key={lIdx} className="w-7 h-7 bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs rounded-lg flex items-center justify-center">
                                  {letter}
                                </span>
                              ))}
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                              ➔ {card.correct_answer}
                            </span>
                          </div>
                        )}

                        {/* 5. True False preview */}
                        {card.question_type === 'true_false' && (
                          <div className="mt-2 flex gap-2">
                            {['TAMA', 'MALI'].map((tf) => {
                              const isCorrect = String(card.correct_answer).toUpperCase() === tf
                              return (
                                <span key={tf} className={`px-4 py-1.5 rounded-xl text-xs font-black border ${
                                  isCorrect 
                                    ? (tf === 'TAMA' ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : 'bg-rose-100 text-rose-800 border-rose-400')
                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                  {tf} {isCorrect && '✓'}
                                </span>
                              )
                            })}
                          </div>
                        )}

                        {/* 6. Sentence scramble preview */}
                        {card.question_type === 'sentence_scramble' && (
                          <div className="mt-1.5 space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {(card.options || []).map((w, wIdx) => (
                                <span key={wIdx} className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold rounded-md">
                                  {w}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block border border-emerald-200 mt-1">
                              Tamang Ayos: {card.correct_answer}
                            </p>
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
                <span>Idagdag ang {generatedCards.filter((c) => selectedCardIds[c.id]).length} Kard bilang Plain Draft ➔</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
