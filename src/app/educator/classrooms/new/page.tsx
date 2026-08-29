import { createClassroom } from '../actions'
import { ArrowLeft, Library } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

export default function NewClassroomPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in relative z-10">
      <Link href="/educator/classrooms" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary font-bold transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        <Translate fil="Bumalik sa Mga Silid-aralan" en="Back to Classrooms" />
      </Link>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <Library className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900"><Translate fil="Bumuo ng Bagong Silid-aralan" en="Create New Classroom" /></h1>
            <p className="text-slate-500 text-sm font-medium"><Translate fil="I-set up ang espasyo para sa iyong mag-aaral." en="Set up a space for your students to join and learn." /></p>
          </div>
        </div>

        <form action={createClassroom} className="flex flex-col gap-6 relative z-10">
          
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-bold text-slate-700"><Translate fil="Pangalan ng Silid-aralan" en="Classroom Name" /> *</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required
              placeholder="e.g. Intro to Computer Science 101"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-sm font-bold text-slate-700"><Translate fil="Paglalarawan (Opsiyonal)" en="Description (Optional)" /></label>
            <textarea 
              id="description" 
              name="description" 
              rows={3}
              placeholder="Ano ang matututunan ng mag-aaral dito?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none shadow-sm"
            ></textarea>
          </div>

          <div className="flex flex-col gap-2">
             <label htmlFor="enrollment_limit" className="text-sm font-bold text-slate-700 flex justify-between">
               <span><Translate fil="Limitasyon ng Pagpapatala" en="Enrollment Limit" /></span>
               <span className="text-slate-500 text-xs font-medium"><Translate fil="Kino-kontrol kung ilan ang pwedeng sumali" en="Controls how many students can join" /></span>
             </label>
             <input 
               type="number" 
               id="enrollment_limit" 
               name="enrollment_limit" 
               defaultValue={30}
               min={1}
               max={200}
               className="w-full max-w-[200px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
             />
          </div>

          <div className="mt-4 pt-6 border-t border-slate-200 flex justify-end gap-4">
             <Link href="/educator/classrooms" className="px-6 py-2.5 rounded-full font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
               <Translate fil="Kanselahin" en="Cancel" />
             </Link>
             <button type="submit" className="px-6 py-2.5 bg-brand-primary hover:bg-blue-600 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0">
               <Translate fil="Bumuo ng Silid-aralan" en="Create Classroom" />
             </button>
          </div>

        </form>
      </div>
    </div>
  )
}
