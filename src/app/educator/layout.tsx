import { BookOpen, LayoutDashboard, Settings, LogOut, Users, FileQuestion, BarChart3, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { signOut } from '../auth/actions'
import { createClient } from '@/lib/supabase/server'
import { NotificationBell } from '@/components/NotificationBell'
import { LanguageToggle } from '@/components/LanguageToggle'
import { EducatorSidebar } from '@/components/EducatorSidebar'

export default async function EducatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user?.id).single()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Navigation */}
      <EducatorSidebar profile={profile} />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-screen overflow-y-auto bg-slate-50 text-slate-900">
        {/* Subtle background glow specific to educator */}
        <div className="fixed top-0 right-0 w-125 h-125 bg-brand-primary/20 rounded-full blur-[140px] pointer-events-none -z-10" />
        {children}
      </main>

    </div>
  )
}
