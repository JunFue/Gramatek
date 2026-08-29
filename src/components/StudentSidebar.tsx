'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, GraduationCap, LogOut, Gamepad2, FileBadge, ChevronLeft, ChevronRight } from 'lucide-react'
import { signOut } from '@/app/auth/actions'
import { LanguageToggle } from '@/components/LanguageToggle'
import { NotificationBell } from '@/components/NotificationBell'
import { Translate } from '@/components/Translate'

interface StudentSidebarProps {
  profile: any
}

export function StudentSidebar({ profile }: StudentSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside 
      onMouseLeave={() => setIsCollapsed(true)}
      className={`bg-white border-r border-slate-200 flex flex-col z-50 shrink-0 shadow-xl transition-all duration-300 md:relative absolute h-full ${
        isCollapsed ? 'w-20' : 'w-full md:w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-20 flex items-center px-4 border-b border-slate-200 shrink-0 transition-all ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-brand-primary via-brand-secondary to-brand-accent flex items-center justify-center shadow-lg animate-float shrink-0">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden whitespace-nowrap">
              <span className="text-2xl font-heading font-black text-brand-primary tracking-tight">Gramatek</span>
              <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">★ Bayani ng Wika</span>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-24 bg-white text-slate-400 border border-slate-200 rounded-full p-1 hover:bg-brand-primary hover:border-brand-primary hover:text-white shadow-md transition-colors z-50 hidden md:flex"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 overflow-x-hidden pt-10">
        <NavLink href="/student" icon={LayoutDashboard} isCollapsed={isCollapsed}>
          <Translate fil="Dashboard" en="Dashboard" />
        </NavLink>
        <NavLink href="/student/practice" icon={Gamepad2} isCollapsed={isCollapsed} highlight>
          <Translate fil="Mag-ensayo" en="Practice" />
        </NavLink>
        <NavLink href="/student/performance" icon={FileBadge} isCollapsed={isCollapsed}>
          <Translate fil="Aking Pag-unlad" en="My Growth" />
        </NavLink>
      </div>

      {/* User & Sign Out */}
      <div className="p-4 border-t border-slate-200 shrink-0">
        <form action={signOut}>
          <button type="submit" className={`flex items-center gap-3 py-3 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors group font-bold w-full ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
            <LogOut className="w-5 h-5 group-hover:text-red-500 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap"><Translate fil="Mag-sign Out" en="Sign Out" /></span>}
          </button>
        </form>
        <div className={`mt-4 flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
           <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center font-black text-brand-primary shadow-inner border-2 border-slate-200">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               (profile?.full_name?.[0] || 'L').toUpperCase()
             )}
           </div>
           {!isCollapsed && (
             <div className="flex-1 min-w-0 overflow-hidden whitespace-nowrap">
               <p className="text-sm font-black text-slate-800 truncate">{profile?.full_name || 'Magaaral (Learner)'}</p>
               <p className="text-xs font-bold text-brand-secondary">Level 1 Learner ⚡</p>
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
      className={`flex items-center gap-3 py-3 rounded-2xl transition-all group font-extrabold mx-4 ${
        highlight 
          ? 'bg-amber-400 hover:bg-amber-500 text-white shadow-md hover:-translate-y-0.5' 
          : 'hover:bg-slate-100 text-slate-500 hover:text-brand-primary'
      } ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}
      title={isCollapsed ? (typeof children === 'string' ? children : 'Link') : undefined}
    >
      <Icon className={`w-6 h-6 shrink-0 ${highlight ? 'group-hover:scale-110' : 'group-hover:rotate-6'} transition-transform`} />
      {!isCollapsed && <span className="whitespace-nowrap">{children}</span>}
    </Link>
  )
}
