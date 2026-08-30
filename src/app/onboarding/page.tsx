'use client'

import { useState } from 'react'
import { BookOpen, GraduationCap, ArrowRight, Loader2 } from 'lucide-react'
import { setUserRole } from '../auth/actions'

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<'educator' | 'learner' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (role: 'educator' | 'learner') => {
    setIsSubmitting(true)
    await setUserRole(role)
    // We don't reset isSubmitting because the server action will redirect the user
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-light/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 animate-slide-up">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-brand-primary mb-4 drop-shadow-sm">Welcome to Gramatek</h1>
          <p className="text-xl text-slate-600 font-medium">How will you be using the platform?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 w-full">
          
          {/* Educator Card */}
          <button
            onClick={() => setSelectedRole('educator')}
            disabled={isSubmitting}
            className={`text-left p-8 rounded-3xl transition-all duration-300 border-2 w-full flex flex-col group relative overflow-hidden shadow-lg
              ${selectedRole === 'educator' 
                ? 'bg-white border-brand-primary ring-4 ring-brand-primary/20 shadow-[0_10px_30px_rgba(49,105,78,0.15)]' 
                : 'glass-strong border-[#d4ddd0] hover:border-brand-primary/50 hover:shadow-xl'}
            `}
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="w-16 h-16 rounded-2xl bg-brand-light/40 flex items-center justify-center mb-8 shrink-0 relative z-10">
              <BookOpen className="w-8 h-8 text-brand-primary" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-heading font-bold text-slate-800 mb-3 flex items-center justify-between">
                I'm an Educator
              </h2>
              <p className="text-slate-600 leading-relaxed font-medium min-h-[80px]">
                Create interactive classrooms, generate AI quizzes, manage your students, and track their performance.
              </p>
            </div>
          </button>

          {/* Learner Card */}
          <button
            onClick={() => setSelectedRole('learner')}
            disabled={isSubmitting}
            className={`text-left p-8 rounded-3xl transition-all duration-300 border-2 w-full flex flex-col group relative overflow-hidden shadow-lg
              ${selectedRole === 'learner' 
                ? 'bg-white border-brand-secondary ring-4 ring-brand-secondary/20 shadow-[0_10px_30px_rgba(101,140,88,0.15)]' 
                : 'glass-strong border-[#d4ddd0] hover:border-brand-secondary/50 hover:shadow-xl'}
            `}
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="w-16 h-16 rounded-2xl bg-brand-accent/20 flex items-center justify-center mb-8 shrink-0 relative z-10">
              <GraduationCap className="w-8 h-8 text-brand-secondary" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-heading font-bold text-slate-800 mb-3 flex items-center justify-between">
                I'm a Learner
              </h2>
              <p className="text-slate-600 leading-relaxed font-medium min-h-[80px]">
                Join your teacher's classroom, play fast-paced gamified quizzes, and master new subjects.
              </p>
            </div>
          </button>

        </div>

        {/* Submit Action */}
        <div className="mt-12 flex justify-center h-16">
          {selectedRole && (
            <button
              onClick={() => handleSubmit(selectedRole)}
              disabled={isSubmitting}
              className={`animate-slide-up px-8 py-4 rounded-full text-white font-extrabold text-lg flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 shadow-xl
                ${selectedRole === 'educator' ? 'bg-brand-primary hover:bg-brand-secondary shadow-[0_8px_25px_rgba(49,105,78,0.35)]' : 'bg-brand-secondary hover:bg-brand-primary shadow-[0_8px_25px_rgba(101,140,88,0.35)]'}
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                <>
                  Continue as {selectedRole === 'educator' ? 'Educator' : 'Learner'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

