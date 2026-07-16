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
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-secondary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 animate-slide-up">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">Welcome to Gramatek</h1>
          <p className="text-lg text-slate-400">How will you be using the platform?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 w-full">
          
          {/* Educator Card */}
          <button
            onClick={() => setSelectedRole('educator')}
            disabled={isSubmitting}
            className={`text-left p-8 rounded-3xl transition-all duration-300 border-2 w-full flex flex-col group relative overflow-hidden
              ${selectedRole === 'educator' 
                ? 'bg-blue-900/40 border-brand-primary shadow-[0_0_30px_rgba(59,130,246,0.3)]' 
                : 'glass-strong border-transparent hover:border-brand-primary/50'}
            `}
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-8 shrink-0 relative z-10">
              <BookOpen className={`w-8 h-8 ${selectedRole === 'educator' ? 'text-brand-primary' : 'text-blue-400'}`} />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-heading font-bold text-white mb-3 flex items-center justify-between">
                I'm an Educator
              </h2>
              <p className="text-slate-400 leading-relaxed min-h-[80px]">
                Create interactive classrooms, generate AI quizzes, manage your students, and track their performance.
              </p>
            </div>
          </button>

          {/* Learner Card */}
          <button
            onClick={() => setSelectedRole('learner')}
            disabled={isSubmitting}
            className={`text-left p-8 rounded-3xl transition-all duration-300 border-2 w-full flex flex-col group relative overflow-hidden
              ${selectedRole === 'learner' 
                ? 'bg-emerald-900/40 border-brand-accent shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
                : 'glass-strong border-transparent hover:border-brand-accent/50'}
            `}
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-8 shrink-0 relative z-10">
              <GraduationCap className={`w-8 h-8 ${selectedRole === 'learner' ? 'text-brand-accent' : 'text-emerald-400'}`} />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-heading font-bold text-white mb-3 flex items-center justify-between">
                I'm a Learner
              </h2>
              <p className="text-slate-400 leading-relaxed min-h-[80px]">
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
              className={`animate-slide-up px-8 py-4 rounded-full text-white font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100
                ${selectedRole === 'educator' ? 'bg-brand-primary shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-brand-accent shadow-[0_0_20px_rgba(16,185,129,0.5)]'}
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
