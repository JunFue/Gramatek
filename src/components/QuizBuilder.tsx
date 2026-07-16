'use client'

import { useState } from 'react'
import { saveQuiz } from '@/app/educator/quizzes/actions'
import { ArrowLeft, Save, FileQuestion, Plus, Trash2, GripVertical, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

type QuestionType = 'multiple_choice' | 'fill_blank' | 'enumeration'

interface CardData {
  id: string
  type: QuestionType
  text: string
  options?: string[]
  correctAnswer: any
}

export function QuizBuilder({ classrooms, defaultClassroomId }: { classrooms: any[], defaultClassroomId?: string }) {
  const [classroomId, setClassroomId] = useState(defaultClassroomId || classrooms[0]?.id || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState(60) // in seconds
  const [cards, setCards] = useState<CardData[]>([])
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addCard = (type: QuestionType) => {
    const newCard: CardData = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : undefined,
      correctAnswer: type === 'multiple_choice' ? 0 : type === 'enumeration' ? [] : ''
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
    if (!classroomId || !title) return alert('Classroom and Title are required.')
    if (cards.length === 0) return alert('Add at least one question.')
    
    setIsSubmitting(true)
    try {
      await saveQuiz(classroomId, title, description, timeLimit, is_published, cards)
    } catch (e) {
      console.error(e)
      setIsSubmitting(false)
      alert('Failed to save quiz.')
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in relative z-10">
      
      <div className="flex items-center justify-between mb-8">
        <Link href={defaultClassroomId ? `/educator/classrooms/${defaultClassroomId}` : "/educator"} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <button 
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="px-4 py-2 border border-white/20 hover:bg-white/5 text-white rounded-full text-sm font-medium transition-colors"
          >
            Save Draft
          </button>
          <button 
            disabled={isSubmitting}
            onClick={() => handleSave(true)}
            className="px-6 py-2 bg-brand-secondary hover:bg-violet-500 text-white rounded-full text-sm font-medium shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Publish Playable</>}
          </button>
        </div>
      </div>

      {/* Quiz Settings */}
      <div className="glass-strong rounded-3xl p-8 mb-8 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <h2 className="text-2xl font-heading font-bold text-white mb-6 relative z-10 flex items-center gap-2">
          <FileQuestion className="w-6 h-6 text-brand-secondary" />
          Quiz Settings
        </h2>
        
        <div className="space-y-6 relative z-10">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Assign to Classroom</label>
            <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary transition-all appearance-none">
              <option value="" disabled>Select Classroom...</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Quiz Title</label>
            <input 
              type="text" 
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 1 Review"
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-secondary focus:ring-1 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea 
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this quiz about?"
              rows={2}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-secondary focus:ring-1 transition-all resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Time Limit per Question (avg)</label>
            <select value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="w-full max-w-[250px] bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-secondary transition-all appearance-none">
               <option value={15}>15 Seconds (Rapid)</option>
               <option value={30}>30 Seconds (Fast)</option>
               <option value={60}>1 Minute (Standard)</option>
               <option value={120}>2 Minutes (Extended)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards (Questions) */}
      <div className="space-y-6">
        <h2 className="text-2xl font-heading font-bold text-white flex items-center justify-between">
          <span>Deck Cards ({cards.length})</span>
        </h2>

        {cards.map((card, index) => (
          <div key={card.id} className="glass rounded-xl p-6 relative group border border-white/5 animate-slide-up bg-slate-800/80">
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => removeCard(card.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mb-4 flex items-center gap-2 text-brand-secondary">
              <GripVertical className="w-4 h-4 text-slate-500 cursor-move" />
              <span className="font-mono text-sm font-bold uppercase tracking-wider">Card {index + 1} - {card.type.replace('_', ' ')}</span>
            </div>

            <div className="space-y-4">
              <input 
                 type="text"
                 placeholder="Question text..."
                 value={card.text}
                 onChange={(e) => updateCard(card.id, { text: e.target.value })}
                 className="w-full bg-slate-900/50 border-b border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-secondary transition-all text-lg font-medium"
              />

              {card.type === 'multiple_choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {card.options?.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                       <button 
                         onClick={() => updateCard(card.id, { correctAnswer: i })}
                         className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0 ${card.correctAnswer === i ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 hover:border-slate-400'}`}
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
                         className={`flex-1 bg-slate-900/50 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-secondary ${card.correctAnswer === i ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10'}`}
                       />
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 col-span-full mt-1">Select the circle to mark the correct answer.</p>
                </div>
              )}

              {card.type === 'fill_blank' && (
                <div className="mt-4">
                  <label className="text-xs text-slate-400 block mb-1">Correct Answer</label>
                  <input 
                     type="text"
                     placeholder="The exact word/phrase"
                     value={card.correctAnswer}
                     onChange={(e) => updateCard(card.id, { correctAnswer: e.target.value })}
                     className="w-full max-w-sm bg-slate-900/50 border border-emerald-500/50 rounded-lg px-4 py-2 text-emerald-400 focus:outline-none focus:border-brand-secondary transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-2">Make sure to indicate the missing part with "___" in your question text.</p>
                </div>
              )}

            </div>
          </div>
        ))}

        {/* Add Card Menu */}
        <div className="glass-subtle rounded-xl p-4 border border-dashed border-white/20 flex flex-col md:flex-row items-center justify-center gap-4">
           <span className="text-sm font-medium text-slate-400">Add new card:</span>
           <button onClick={() => addCard('multiple_choice')} className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
             <Plus className="w-4 h-4" /> Multiple Choice
           </button>
           <button onClick={() => addCard('fill_blank')} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
             <Plus className="w-4 h-4" /> Fill in the Blank
           </button>
           <button onClick={() => alert("Enumeration coming soon")} className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
             <Plus className="w-4 h-4" /> Enumeration
           </button>
        </div>
      </div>
    </div>
  )
}
