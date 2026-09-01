import { createClient } from '@/lib/supabase/server'
import { StudentSidebar } from '@/components/StudentSidebar'
import { redirect } from 'next/navigation'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="h-[100dvh] w-full bg-transparent text-slate-900 flex flex-col md:flex-row overflow-hidden transition-colors duration-300">
      {/* Sidebar & Mobile Navigation Shell */}
      <StudentSidebar profile={profile} />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-full overflow-y-auto w-full custom-scrollbar pt-16 pb-20 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  )
}

