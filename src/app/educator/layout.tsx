import { BookOpen, LayoutDashboard, Settings, LogOut, Users, FileQuestion, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { signOut } from '../auth/actions'
import { createClient } from '@/lib/supabase/server'
import { NotificationBell } from '@/components/NotificationBell'

export default async function EducatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user?.id).single()

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass border-r border-white/5 flex flex-col z-20 shrink-0">
        
        {/* Brand */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 shrink-0 w-full">
           <div className="flex items-center">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center mr-3">
               <BookOpen className="text-white w-4 h-4" />
             </div>
             <span className="text-xl font-heading font-bold text-white tracking-tight">Gramatek</span>
           </div>
           <NotificationBell />
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          <Link href="/educator" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors group">
            <LayoutDashboard className="w-5 h-5 group-hover:text-brand-primary transition-colors" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/educator/classrooms" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors group">
            <Users className="w-5 h-5 group-hover:text-brand-primary transition-colors" />
            <span className="font-medium">Classrooms</span>
          </Link>
          <Link href="/educator/analytics" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors group">
            <BarChart3 className="w-5 h-5 group-hover:text-brand-primary transition-colors" />
            <span className="font-medium">Analytics</span>
          </Link>
          <Link href="/educator/quizzes/new" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors group">
            <FileQuestion className="w-5 h-5 group-hover:text-brand-primary transition-colors" />
            <span className="font-medium">Create Quiz</span>
          </Link>
        </div>

        {/* User & Sign Out */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors group">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </form>
          <div className="mt-4 px-4 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-500/20 overflow-hidden shrink-0">
               {profile?.avatar_url && <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'Educator'}</p>
             </div>
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-screen overflow-y-auto">
        {/* Subtle background glow specific to educator */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        {children}
      </main>

    </div>
  )
}
