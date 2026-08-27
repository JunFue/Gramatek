import { signInWithGoogle } from './auth/actions'
import { Sparkles, Gamepad2, BrainCircuit, Star, LogIn, HeartPulse } from 'lucide-react'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Navigation */}
      <nav className="w-full h-20 glass-subtle flex items-center justify-between px-8 absolute top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center animate-bounce">
            <Image 
              src="/logo.png" 
              alt="Gramatek Logo" 
              width={48} 
              height={48} 
              className="object-contain"
            />
          </div>
          <span className="text-3xl font-heading font-extrabold text-brand-primary tracking-tight">Gramatek</span>
        </div>
        
        <form action={signInWithGoogle}>
          <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-primary text-white font-bold transition-all shadow-md hover:bg-brand-secondary hover:scale-105">
            <LogIn className="w-5 h-5" />
            Mag-sign In
          </button>
        </form>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center justify-center text-center relative z-10">
        
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-strong mb-8 text-sm font-bold text-brand-secondary border-2 border-brand-secondary/20 shadow-sm">
            <Sparkles className="w-4 h-4 text-brand-accent animate-pulse" />
            Narito na ang Makabagong Paraan ng Pag-aaral
          </div>
          
          <h1 className="text-6xl md:text-7xl font-heading font-extrabold text-brand-primary leading-tight tracking-tighter mb-6 drop-shadow-sm">
            Pag-aaral,<br/>
            <span className="text-brand-accent">Gawin Nating Masaya!</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-12 font-sans font-medium leading-relaxed">
            Matutong mag-Filipino gamit ang mga nakakatuwang laro! Espesyal na ginawa para sa mga mag-aaral dahil ang pag-aaral ay dapat masaya.
          </p>

          <form action={signInWithGoogle}>
            <button type="submit" className="group relative px-8 py-5 bg-brand-accent hover:bg-yellow-400 rounded-full text-white font-extrabold text-xl transition-all shadow-[0_8px_30px_rgba(245,176,65,0.4)] hover:shadow-[0_12px_40px_rgba(245,176,65,0.6)] hover:-translate-y-2 overflow-hidden border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1">
              <span className="relative z-10 flex items-center gap-3">
                Magsimula nang Libre!
                <Gamepad2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              </span>
            </button>
          </form>
        </div>

        {/* Bento Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-24 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="glass card-hover rounded-[2rem] p-8 flex flex-col items-center text-center md:col-span-2 border-b-8 border-brand-secondary/20">
            <div className="w-16 h-16 rounded-3xl bg-brand-secondary/10 flex items-center justify-center mb-6">
              <Gamepad2 className="w-8 h-8 text-brand-secondary" />
            </div>
            <h3 className="text-3xl font-heading font-bold text-brand-primary mb-3">Masasayang Pagsusulit</h3>
            <p className="text-slate-600 font-medium text-lg">Pabonggahin ang husay mo sa napakasayang laro ng questions and answers. Mas madali at mas mabilis matuto!</p>
          </div>

          <div className="glass card-hover rounded-[2rem] p-8 flex flex-col items-center text-center border-b-8 border-brand-primary/20">
            <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 flex items-center justify-center mb-6">
              <Star className="w-8 h-8 text-brand-primary" />
            </div>
            <h3 className="text-3xl font-heading font-bold text-brand-primary mb-3">Silid-Aralan</h3>
            <p className="text-slate-600 font-medium text-lg">Lahat ng laro at aralin mo, nandito lang sa iisang makulay na kwarto.</p>
          </div>

          <div className="glass card-hover rounded-[2rem] p-8 flex flex-col items-center text-center border-b-8 border-brand-accent/20">
            <div className="w-16 h-16 rounded-3xl bg-brand-accent/10 flex items-center justify-center mb-6">
              <BrainCircuit className="w-8 h-8 text-brand-accent" />
            </div>
            <h3 className="text-3xl font-heading font-bold text-brand-primary mb-3">Suportado ng AI</h3>
            <p className="text-slate-600 font-medium text-lg">Mabilisang makagawa ng mga bagong nakakatuwang laro sa isang iglap.</p>
          </div>

          <div className="glass card-hover rounded-[2rem] p-8 flex flex-col items-center text-center md:col-span-2 relative overflow-hidden border-b-8 border-pink-400/20">
             <div className="absolute -right-4 -bottom-4 opacity-10">
               <HeartPulse className="w-64 h-64 text-pink-500" />
             </div>
             <div className="relative z-10 w-full h-full flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-pink-100 flex items-center justify-center mb-6">
                <Star className="w-8 h-8 text-pink-500" />
              </div>
              <h3 className="text-3xl font-heading font-bold text-brand-primary mb-3">Pagsusuri ng Galing</h3>
              <p className="text-slate-600 font-medium text-lg max-w-md">Makita kung gaano ka na kagaling! Masusurpresa ka kung gaano kadami ang iyong natutunan.</p>
             </div>
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-slate-500 font-medium mt-auto z-50 relative">
        <p>© 2025 Gramatek. Masayang Pag-aaral Para Sa Lahat.</p>
      </footer>
    </div>
  )
}
