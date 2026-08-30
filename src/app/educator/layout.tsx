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
    <div className="h-screen w-full bg-transparent flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Navigation */}
      <EducatorSidebar profile={profile} />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-screen overflow-y-auto bg-transparent text-foreground">
        <div className="w-full h-20 px-8 flex items-center justify-end sticky top-0 z-40 pointer-events-none">
           <div className="flex items-center gap-3 pointer-events-auto glass px-4 py-2 rounded-full mt-4 mr-4">
             <LanguageToggle />
             <NotificationBell />
           </div>
        </div>
        {children}
      </main>

    </div>
  )
}
