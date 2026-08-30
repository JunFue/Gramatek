import { signInWithGoogle } from './auth/actions'
import { Translate } from '@/components/Translate'
import { LanguageToggle } from '@/components/LanguageToggle'
import { SignInButton } from '@/components/SignInButton'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>
}) {
  const { code } = await searchParams

  // If Supabase redirected to root with ?code=..., immediately forward to auth callback
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`)
  }

  // Check if user is already authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.role) {
      redirect('/onboarding')
    } else if (profile.role === 'educator') {
      redirect('/educator')
    } else {
      redirect('/student')
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Navigation */}
      <nav className="w-full h-20 bg-white border-b border-[#d4ddd0] flex items-center justify-between px-8 absolute top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <span className="text-3xl font-heading font-extrabold text-brand-primary tracking-tight">Gramatek</span>
          </div>
          <LanguageToggle />
        </div>
        
        <form action={signInWithGoogle}>
          <SignInButton 
            className="btn-outline text-sm px-5 py-2 rounded-xl font-bold" 
            textFil="Mag-sign In" 
            textEn="Sign In" 
          />
        </form>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center justify-center text-center relative z-10">
        
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-light/40 border border-brand-accent/30 rounded-full mb-8 text-sm font-bold text-brand-primary">
            <Translate fil="Narito na ang Makabagong Paraan ng Pag-aaral" en="The Modern Way to Learn is Here" />
          </div>
          
          <h1 className="text-6xl md:text-7xl font-heading font-extrabold text-brand-primary leading-tight tracking-tighter mb-6">
            <Translate fil="Pag-aaral," en="Learning," /><br/>
            <span className="text-brand-secondary"><Translate fil="Gawin Nating Masaya!" en="Let's Make it Fun!" /></span>
          </h1>
          
          <p className="text-xl md:text-2xl text-[#5a6b5a] max-w-2xl mx-auto mb-12 font-sans font-medium leading-relaxed">
            <Translate fil="Matutong mag-Filipino gamit ang mga nakakatuwang laro! Espesyal na ginawa para sa mga mag-aaral." en="Learn Filipino using fun games! Specially made for students." />
          </p>

          <form action={signInWithGoogle}>
            <SignInButton 
              className="btn-primary text-xl px-10 py-5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all font-extrabold" 
              textFil="Magsimula nang Libre!" 
              textEn="Start for Free!" 
            />
          </form>
        </div>

        {/* Bento Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="card p-8 flex flex-col items-center text-center md:col-span-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-light/40 flex items-center justify-center mb-5">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-2xl font-heading font-bold text-brand-primary mb-3"><Translate fil="Masasayang Pagsusulit" en="Fun Quizzes" /></h3>
            <p className="text-[#5a6b5a] font-medium text-lg leading-relaxed"><Translate fil="Pag-aralan ang wika nang mabilis at direkta." en="Study the language quickly and directly." /></p>
          </div>

          <div className="card p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-accent/20 flex items-center justify-center mb-5">
              <span className="text-2xl">🏫</span>
            </div>
            <h3 className="text-2xl font-heading font-bold text-brand-primary mb-3"><Translate fil="Silid-Aralan" en="Classrooms" /></h3>
            <p className="text-[#5a6b5a] font-medium text-lg leading-relaxed"><Translate fil="Sentralisadong pahina para sa mga aralin." en="Centralized page for lessons." /></p>
          </div>

          <div className="card p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-secondary/15 flex items-center justify-center mb-5">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-2xl font-heading font-bold text-brand-primary mb-3"><Translate fil="Suportado ng AI" en="AI-Powered" /></h3>
            <p className="text-[#5a6b5a] font-medium text-lg leading-relaxed"><Translate fil="Simpleng AI na nakakatulong sa pagkatuto." en="Simple AI that aids learning." /></p>
          </div>

          <div className="card p-8 flex flex-col items-center text-center md:col-span-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-5">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-2xl font-heading font-bold text-brand-primary mb-3"><Translate fil="Pagsusuri ng Galing" en="Skill Analysis" /></h3>
            <p className="text-[#5a6b5a] font-medium text-lg max-w-md leading-relaxed"><Translate fil="Suriin ang iyong mga marka nang malinaw." en="Analyze your scores clearly." /></p>
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-[#5a6b5a] font-medium mt-auto z-50 relative">
        <p><Translate fil="© 2025 Gramatek. Masayang Pag-aaral Para Sa Lahat." en="© 2025 Gramatek. Fun Learning For Everyone." /></p>
      </footer>
    </div>
  )
}
