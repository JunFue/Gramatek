'use client'

import { useState, useTransition } from 'react'
import { createClassroom } from '../actions'
import { ArrowLeft, Library, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

export default function NewClassroomPage() {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement
      
      // If Enter is pressed directly on a button, allow normal button click
      if (target.tagName === 'BUTTON') {
        return
      }

      // If user is in textarea and pressed Shift+Enter, allow inserting a newline
      if (target.tagName === 'TEXTAREA' && e.shiftKey) {
        return
      }

      // Prevent unintended form submission on Enter
      e.preventDefault()

      // Find all focusable inputs, textareas, and submit buttons in form order
      const form = e.currentTarget
      const elements = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button[type="submit"]:not([disabled])'
        )
      )

      const currentIndex = elements.indexOf(target)
      if (currentIndex > -1 && currentIndex < elements.length - 1) {
        const nextElement = elements[currentIndex + 1]
        nextElement.focus()
      }
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      try {
        await createClassroom(formData)
      } catch (err: any) {
        // NEXT_REDIRECT is internal to Next.js server actions redirect
        if (err?.message && !err.message.includes('NEXT_REDIRECT')) {
          setErrorMsg(err.message)
        }
      }
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in relative z-10">
      <Link 
        href="/educator/classrooms" 
        className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary font-bold transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <Translate fil="Bumalik sa Mga Silid-aralan" en="Back to Classrooms" />
      </Link>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center border border-brand-primary/20">
            <Library className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900">
              <Translate fil="Bumuo ng Bagong Silid-aralan" en="Create New Classroom" />
            </h1>
            <p className="text-slate-500 text-sm font-semibold">
              <Translate fil="I-set up ang espasyo para sa iyong mag-aaral." en="Set up a space for your students to join and learn." />
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-bold animate-fade-in">
            {errorMsg}
          </div>
        )}

        <form 
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown} 
          className="flex flex-col gap-6 relative z-10"
        >
          
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-extrabold text-slate-700">
              <Translate fil="Pangalan ng Silid-aralan" en="Classroom Name" /> *
            </label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required
              placeholder="HAL: Filipino 101 - Batayang Gramatika"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-sm"
              autoFocus
            />
            <span className="text-[11px] font-semibold text-slate-400">
              <Translate fil="Pindutin ang Enter upang lumipat sa susunod na field." en="Press Enter to jump to the next field." />
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-sm font-extrabold text-slate-700">
              <Translate fil="Paglalarawan (Opsiyonal)" en="Description (Optional)" />
            </label>
            <textarea 
              id="description" 
              name="description" 
              rows={3}
              placeholder="Ano ang matututunan ng mag-aaral dito?"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none shadow-sm"
            ></textarea>
            <span className="text-[11px] font-semibold text-slate-400">
              <Translate fil="Pindutin ang Enter upang lumipat, o Shift+Enter para sa bagong linya." en="Press Enter to jump to limit, or Shift+Enter for a new line." />
            </span>
          </div>

          <div className="flex flex-col gap-2">
             <label htmlFor="enrollment_limit" className="text-sm font-extrabold text-slate-700 flex justify-between">
               <span><Translate fil="Limitasyon ng Pagpapatala" en="Enrollment Limit" /></span>
               <span className="text-slate-500 text-xs font-semibold">
                 <Translate fil="Kino-kontrol kung ilan ang pwedeng sumali" en="Controls how many students can join" />
               </span>
             </label>
             <input 
               type="number" 
               id="enrollment_limit" 
               name="enrollment_limit" 
               defaultValue={30}
               min={1}
               max={200}
               className="w-full max-w-[200px] bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-sm"
             />
          </div>

          <div className="mt-4 pt-6 border-t border-slate-200 flex items-center justify-end gap-4">
             <Link 
               href="/educator/classrooms" 
               className="px-6 py-2.5 rounded-full font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
             >
               <Translate fil="Kanselahin" en="Cancel" />
             </Link>
             <button 
               type="submit" 
               disabled={isPending}
               className="px-8 py-3 bg-brand-primary hover:bg-slate-600 text-white font-extrabold rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center gap-2"
             >
               {isPending ? (
                 <>
                   <Loader2 className="w-5 h-5 animate-spin" />
                   <Translate fil="Bumubuo..." en="Creating..." />
                 </>
               ) : (
                 <Translate fil="Bumuo ng Silid-aralan" en="Create Classroom" />
               )}
             </button>
          </div>

        </form>
      </div>
    </div>
  )
}
