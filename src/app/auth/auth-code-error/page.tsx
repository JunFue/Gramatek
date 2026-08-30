import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Translate } from '@/components/Translate'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex items-center justify-center p-6 text-center animate-fade-in">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-2xl relative z-10 bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-light/40 flex items-center justify-center mb-6 text-brand-primary border border-brand-accent/20">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-heading font-bold text-slate-900 mb-4"><Translate fil="Error sa Pagpapatunay" en="Authentication Error" /></h1>
        
        <p className="text-slate-600 font-medium text-lg mb-8 leading-relaxed max-w-md">
          <Translate fil="Hindi matagumpay na maipagpalit ng Supabase ang code ng awtorisasyon mula sa Google. Karaniwan itong isyu sa pagsasaayos." en="Supabase was unable to exchange the authorization code from Google. This is typically a configuration mismatch." />
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left w-full space-y-4 mb-10 text-sm text-slate-600 font-medium shadow-sm">
          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2"><Translate fil="Paano Ito Ayusin:" en="How to Fix This:" /></h3>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Check Client Secret:</strong> <Translate fil="Pumunta sa" en="Go to your" /> <strong>Supabase Dashboard &gt; Auth &gt; Providers &gt; Google</strong>. <Translate fil="Tiyakin na ang Client Secret at Client ID ay tugmang-tugma sa iyong Google Cloud Console." en="Verify that the Client Secret and Client ID exactly match what is in your Google Cloud Console." />
            </li>
            <li>
              <strong>Check redirect URIs:</strong> <Translate fil="Sa" en="In" /> <strong>Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</strong>, <Translate fil="i-adjust ang 'Authorized redirect URIs' upang tumugma nang eksakto sa iyong Supabase API callback URL:" en="adjust 'Authorized redirect URIs' to match your Supabase API callback URL exactly:" />
              <div className="mt-2 bg-slate-100 p-3 rounded-xl font-mono text-xs text-brand-primary break-all border border-slate-200 select-all font-bold">
                https://bdoawleyoyfxberjhtfz.supabase.co/auth/v1/callback
              </div>
            </li>
            <li>
              <strong>Consent Screen:</strong> <Translate fil="Tiyakin na ang Google OAuth Consent screen ay naka-configure bilang 'External' at naka-publish sa production, o kaya naman ay naidagdag ang iyong email bilang Test User." en="Make sure the Google OAuth Consent screen is configured as 'External' and published in production, or that your email is added as a Test User." />
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
