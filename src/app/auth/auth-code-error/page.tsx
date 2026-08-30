import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

export default function AuthCodeErrorPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dtavttcuuovyzsfdjdip.supabase.co'
  const callbackUrl = `${supabaseUrl}/auth/v1/callback`

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex items-center justify-center p-6 text-center animate-fade-in">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-2xl relative z-10 bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-light/40 flex items-center justify-center mb-6 text-brand-primary border border-brand-accent/20">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-heading font-bold text-slate-900 mb-4">
          <Translate fil="Error sa Pagpapatunay" en="Authentication Error" />
        </h1>
        
        <p className="text-slate-600 font-medium text-lg mb-8 leading-relaxed max-w-md">
          <Translate 
            fil="Hindi matagumpay na maipagpalit ng Supabase ang code ng awtorisasyon mula sa Google. Karaniwan itong isyu sa pagsasaayos ng Supabase URL configuration." 
            en="Supabase was unable to exchange the authorization code from Google. This is typically a configuration mismatch in Supabase URL settings." 
          />
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left w-full space-y-4 mb-10 text-sm text-slate-600 font-medium shadow-sm">
          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">
            <Translate fil="Paano Ito Ayusin:" en="How to Fix This in Supabase & Google Cloud:" />
          </h3>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Supabase Redirect URLs:</strong> Pumunta sa <strong>Supabase Dashboard &gt; Authentication &gt; URL Configuration</strong>. Idagdag ang mga sumusunod sa <em>Redirect URLs</em>:
              <div className="mt-2 space-y-1 font-mono text-xs text-brand-primary bg-slate-100 p-3 rounded-xl border border-slate-200">
                <div>https://gramatek.vercel.app/auth/callback</div>
                <div>https://gramatek.vercel.app/**</div>
                <div>http://localhost:3000/**</div>
              </div>
            </li>
            <li>
              <strong>Google Cloud Authorized Redirect URI:</strong> Sa <strong>Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</strong>, tiyaking nakalagay ang:
              <div className="mt-2 bg-slate-100 p-3 rounded-xl font-mono text-xs text-brand-primary break-all border border-slate-200 select-all font-bold">
                {callbackUrl}
              </div>
            </li>
            <li>
              <strong>Client Secret &amp; Client ID:</strong> Sa <strong>Supabase &gt; Auth &gt; Providers &gt; Google</strong>, tiyaking tugma ang Client ID at Client Secret.
            </li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Link href="/" className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-200">
            <Home className="w-5 h-5" /> <Translate fil="Bumalik sa Pambungad" en="Back to Home" />
          </Link>
          <Link href="/" className="flex-1 py-4 btn-primary rounded-2xl flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5" /> <Translate fil="Subukang Muli" en="Retry Login" />
          </Link>
        </div>
      </div>
    </div>
  )
}
