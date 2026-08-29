import { createClient } from '@/lib/supabase/server'
import { NotificationBell } from '@/components/NotificationBell'
import { LanguageToggle } from '@/components/LanguageToggle'
import { StudentSidebar } from '@/components/StudentSidebar'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user?.id).single()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <StudentSidebar profile={profile} />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-screen overflow-y-auto w-full custom-scrollbar">
        {/* Dynamic header for mobile or top right controls */}
        <div className="w-full h-20 px-8 flex items-center justify-end absolute top-0 pointer-events-none z-40">
           <div className="flex items-center gap-3 pointer-events-auto bg-white/70 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-sm mt-4 mr-4">
             <LanguageToggle />
             <div className="w-px h-6 bg-slate-200 mx-1"></div>
             <NotificationBell />
           </div>
        </div>

        {children}
      </main>

    </div>
  )
}

