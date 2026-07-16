import { createClassroom } from '../actions'
import { ArrowLeft, Library } from 'lucide-react'
import Link from 'next/link'

export default function NewClassroomPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <Link href="/educator/classrooms" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to Classrooms
      </Link>

      <div className="glass-strong rounded-3xl p-8 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Library className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Create New Classroom</h1>
            <p className="text-slate-400 text-sm">Set up a space for your students to join and learn.</p>
          </div>
        </div>

        <form action={createClassroom} className="flex flex-col gap-6 relative z-10">
          
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Classroom Name *</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required
              placeholder="e.g. Intro to Computer Science 101"
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-sm font-medium text-slate-300">Description (Optional)</label>
            <textarea 
              id="description" 
              name="description" 
              rows={3}
              placeholder="What will students learn in this class?"
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none"
            ></textarea>
          </div>

          <div className="flex flex-col gap-2">
             <label htmlFor="enrollment_limit" className="text-sm font-medium text-slate-300 flex justify-between">
               <span>Enrollment Limit</span>
               <span className="text-slate-500 text-xs font-normal">Controls how many students can join</span>
             </label>
             <input 
               type="number" 
               id="enrollment_limit" 
               name="enrollment_limit" 
               defaultValue={30}
               min={1}
               max={200}
               className="w-full max-w-[200px] bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
             />
          </div>

          <div className="mt-4 pt-6 border-t border-white/10 flex justify-end gap-4">
             <Link href="/educator/classrooms" className="px-6 py-2.5 rounded-full font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
               Cancel
             </Link>
             <button type="submit" className="px-6 py-2.5 bg-brand-primary hover:bg-blue-500 text-white font-medium rounded-full shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
               Create Classroom
             </button>
          </div>

        </form>
      </div>
    </div>
  )
}
