import { signInWithGoogle } from './auth/actions'
import { BookOpen, Gamepad2, BrainCircuit, LineChart, LogIn } from 'lucide-react'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Navigation */}
      <nav className="w-full h-20 glass-subtle flex items-center justify-between px-8 absolute top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center animate-float">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-heading font-bold text-white tracking-tight">Gramatek</span>
        </div>
        
        <form action={signInWithGoogle}>
          <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-all backdrop-blur-md border border-white/20">
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        </form>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center justify-center text-center relative z-10">
        
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-secondary/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong mb-8 text-sm font-medium text-blue-200">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-primary"></span>
            </span>
            Next Generation Learning is Here
          </div>
          
          <h1 className="text-6xl md:text-8xl font-heading font-bold text-white leading-tight tracking-tighter mb-6">
            Learning, <br/>
            <span className="text-gradient">Reimagined.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 font-sans font-light leading-relaxed">
            Gamify education. Empower educators with AI tools. Engage students like never before under one seamless platform.
          </p>

          <form action={signInWithGoogle}>
            <button type="submit" className="group relative px-8 py-4 bg-brand-primary hover:bg-blue-500 rounded-full text-white font-semibold text-lg transition-all shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:shadow-[0_0_60px_rgba(59,130,246,0.6)] hover:-translate-y-1 overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                Get Started for Free
                <Gamepad2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
            </button>
          </form>
        </div>

        {/* Bento Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="glass card-hover rounded-3xl p-8 flex flex-col items-start text-left md:col-span-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
              <Gamepad2 className="w-6 h-6 text-brand-primary" />
            </div>
            <h3 className="text-2xl font-heading font-semibold text-white mb-3">Gamified Quizzes</h3>
            <p className="text-slate-400">Transform boring exams into highly engaging, timed card games. Multiply retention and keep students on the edge of their seats.</p>
          </div>

          <div className="glass card-hover rounded-3xl p-8 flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6 text-brand-secondary" />
            </div>
            <h3 className="text-2xl font-heading font-semibold text-white mb-3">Classroom Hub</h3>
            <p className="text-slate-400">Easily manage students, track progress, and organize all materials in one glassmorphic space.</p>
          </div>

          <div className="glass card-hover rounded-3xl p-8 flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6">
              <BrainCircuit className="w-6 h-6 text-brand-accent" />
            </div>
            <h3 className="text-2xl font-heading font-semibold text-white mb-3">AI Powered</h3>
            <p className="text-slate-400">Generate whole quizzes from PDFs in seconds using the Gramatek AI engine.</p>
          </div>

          <div className="glass card-hover rounded-3xl p-8 flex flex-col items-start text-left md:col-span-2 relative overflow-hidden">
             <div className="absolute right-0 bottom-0 opacity-10">
               <LineChart className="w-64 h-64" />
             </div>
             <div className="relative z-10 w-full h-full">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-6">
                <LineChart className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-2xl font-heading font-semibold text-white mb-3">Deep Analytics</h3>
              <p className="text-slate-400 max-w-md">Identify struggling students early. View comprehensive metrics and performance breakdowns for every quiz.</p>
             </div>
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full glass-subtle py-8 text-center text-slate-500 text-sm mt-auto z-50 relative">
        <p>© 2025 Gramatek. Next Generation Learning.</p>
      </footer>
    </div>
  )
}
