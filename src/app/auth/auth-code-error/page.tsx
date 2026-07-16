import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-6 text-center animate-fade-in">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-2xl relative z-10 glass-strong p-8 md:p-12 rounded-3xl border border-white/10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 text-red-400">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-heading font-bold text-white mb-4">Authentication Error</h1>
        
        <p className="text-slate-350 text-lg mb-8 leading-relaxed max-w-md">
          Supabase was unable to exchange the authorization code from Google. This is typically a configuration mismatch.
        </p>

        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 text-left w-full space-y-4 mb-10 text-sm text-slate-300">
          <h3 className="font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">How to Fix This:</h3>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Check Client Secret:</strong> Go to your <strong>Supabase Dashboard &gt; Auth &gt; Providers &gt; Google</strong>. Verify that the Client Secret and Client ID exactly match what is in your Google Cloud Console.
            </li>
            <li>
              <strong>Check redirect URIs:</strong> In <strong>Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</strong>, adjust "Authorized redirect URIs" to match your Supabase API callback URL exactly:
              <div className="mt-2 bg-slate-950 p-3 rounded-xl font-mono text-xs text-brand-primary break-all border border-white/5 select-all">
                https://bdoawleyoyfxberjhtfz.supabase.co/auth/v1/callback
              </div>
            </li>
            <li>
              <strong>Consent Screen:</strong> Make sure the Google OAuth Consent screen is configured as "External" and published in production, or that your email is added as a Test User.
            </li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Link href="/" className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/10">
            <Home className="w-5 h-5" /> Back to Home
          </Link>
          <Link href="/" className="flex-1 py-4 bg-brand-primary hover:bg-blue-500 text-white font-medium rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5" /> Retry Login
          </Link>
        </div>
      </div>
    </div>
  )
}
