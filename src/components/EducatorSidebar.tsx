'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Users, BarChart3, FileQuestion, LogOut, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react'
import { signOut } from '@/app/auth/actions'
import { Translate } from '@/components/Translate'

interface EducatorSidebarProps {
  profile: any
}

export function EducatorSidebar({ profile }: EducatorSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside 
      className={`bg-brand-primary border-r border-[#285840] flex flex-col z-50 shrink-0 shadow-xl transition-all duration-300 md:relative absolute h-full ${
        isCollapsed ? 'w-20' : 'w-full md:w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-20 flex items-center px-4 border-b border-white/10 shrink-0 transition-all ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center">
          <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shadow-md shrink-0">
            <GraduationCap className="text-brand-primary w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="ml-3 overflow-hidden whitespace-nowrap">
              <span className="text-xl font-heading font-black text-white tracking-tight block leading-none">Gramatek</span>
              <span className="text-[10px] text-brand-accent font-bold tracking-widest uppercase mt-1 block">
                <Translate fil="Guro Portal" en="Educator Portal" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-24 bg-white text-brand-primary border border-[#d4ddd0] rounded-full p-1 hover:bg-brand-light shadow-md transition-colors z-50 hidden md:flex"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 overflow-x-hidden pt-10">
        <NavLink href="/educator" icon={LayoutDashboard} isCollapsed={isCollapsed}>
          <Translate fil="Dashboard" en="Dashboard" />
        </NavLink>
        <NavLink href="/educator/classrooms" icon={Users} isCollapsed={isCollapsed}>
          <Translate fil="Mga Silid-aralan" en="Classrooms" />
        </NavLink>
        <NavLink href="/educator/analytics" icon={BarChart3} isCollapsed={isCollapsed}>
          <Translate fil="Analitika" en="Analytics" />
        </NavLink>
        <NavLink href="/educator/quizzes/new" icon={FileQuestion} isCollapsed={isCollapsed} highlight>
          <Translate fil="Gawa ng Pagsusulit" en="Create Quiz" />
        </NavLink>
      </div>

      {/* User & Sign Out */}
      <div className="p-4 border-t border-white/10 shrink-0">
        <form action={signOut}>
          <button type="submit" className={`flex items-center gap-3 py-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors group font-medium w-full ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap"><Translate fil="Mag-sign Out" en="Sign Out" /></span>}
          </button>
        </form>
        
        <div className={`mt-4 flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
           <div className="w-8 h-8 rounded-full bg-brand-light overflow-hidden shrink-0 flex items-center justify-center font-bold text-brand-primary">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               (profile?.full_name?.[0] || 'G').toUpperCase()
             )}
           </div>
           {!isCollapsed && (
             <div className="flex-1 min-w-0 overflow-hidden whitespace-nowrap">
               <p className="text-sm font-bold text-white truncate">{profile?.full_name || 'Guro (Educator)'}</p>
             </div>
           )}
        </div>
      </div>
    </aside>
  )
}

function NavLink({ href, icon: Icon, children, isCollapsed, highlight = false }: any) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 py-3 rounded-xl transition-colors group font-medium mx-4 ${
        highlight 
          ? 'bg-brand-accent text-brand-primary font-bold' 
          : 'hover:bg-white/10 text-white/70 hover:text-white'
      } ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}
      title={isCollapsed ? (typeof children === 'string' ? children : 'Link') : undefined}
    >
      <Icon className={`w-5 h-5 shrink-0 transition-colors`} />
      {!isCollapsed && <span className="whitespace-nowrap">{children}</span>}
    </Link>
  )
}
