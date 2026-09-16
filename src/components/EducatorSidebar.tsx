'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, Users, BarChart3, FileQuestion, 
  GraduationCap, ChevronLeft, ChevronRight, Menu, X, PlusCircle, Zap 
} from 'lucide-react'
import { SignOutButton } from '@/components/SignOutButton'
import { Translate } from '@/components/Translate'
import { SidebarNotification } from '@/components/SidebarNotification'
import { SidebarLanguageToggle } from '@/components/SidebarLanguageToggle'
import { LanguageToggle } from '@/components/LanguageToggle'

import { createClient } from '@/lib/supabase/client'

interface EducatorSidebarProps {
  profile: any
  activeSession?: {
    id: string
    code?: string
    status: string
    classroom_id: string
    classrooms?: { name: string }
  } | null
}

export function EducatorSidebar({ profile, activeSession }: EducatorSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [currentSession, setCurrentSession] = useState(activeSession || null)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    if (!activeSession || activeSession.status === 'ended') {
      setCurrentSession(null)
    } else {
      setCurrentSession(activeSession)
    }
  }, [activeSession])

  useEffect(() => {
    if (!currentSession?.id) return

    const channel = supabase
      .channel(`educator-sidebar-session-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${currentSession.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { status?: string }
            if (updated.status === 'ended') {
              setCurrentSession(null)
            }
          } else if (payload.eventType === 'DELETE') {
            setCurrentSession(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentSession?.id, supabase])

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false)
  }, [pathname])

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileDrawerOpen])

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          1. MOBILE TOP APP BAR (< md)
          ═══════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-brand-primary border-b border-[#285840] z-40 px-4 flex items-center justify-between shadow-md md:hidden">
        {/* Brand Logo & Name */}
        <Link href="/educator" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shadow-md shrink-0">
            <GraduationCap className="text-brand-primary w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-heading font-black text-white leading-none tracking-tight">Gramatek</span>
            <span className="text-[9px] font-bold text-brand-accent uppercase tracking-wider">
              <Translate fil="Guro Portal" en="Educator Portal" />
            </span>
          </div>
        </Link>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          
          {/* Mobile Menu / Profile Trigger */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Buksan ang Menu"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          2. MOBILE SLIDE-OVER DRAWER (< md)
          ═══════════════════════════════════════════════════════════ */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative w-[300px] max-w-[85vw] bg-brand-primary text-white h-full flex flex-col z-10 shadow-2xl animate-slide-up border-l border-[#285840]">
            {/* Drawer Header */}
            <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-light flex items-center justify-center shadow-md">
                  <GraduationCap className="text-brand-primary w-4 h-4" />
                </div>
                <span className="font-heading font-black text-lg text-white">Gramatek Guro</span>
              </div>

              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Isara ang menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Card */}
            <div className="p-4 border-b border-white/10 bg-black/10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-light overflow-hidden shrink-0 flex items-center justify-center font-black text-brand-primary text-lg shadow-inner">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile?.full_name?.[0] || 'G').toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{profile?.full_name || 'Guro (Educator)'}</p>
                <span className="inline-block px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-light text-[10px] font-extrabold uppercase mt-0.5">
                  Guro / Educator
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto py-4 space-y-1.5 custom-scrollbar">
              {currentSession && (
                <Link
                  href={`/educator/classrooms/${currentSession.classroom_id}/live/${currentSession.id}/host`}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl mx-3 bg-linear-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-md ring-2 ring-amber-300 animate-pulse"
                >
                  <Zap className="w-5 h-5 fill-white shrink-0" />
                  <span>Bumalik sa Live Session ➔</span>
                </Link>
              )}

              <MobileDrawerLink href="/educator" icon={LayoutDashboard} exact>
                <Translate fil="Dashboard" en="Dashboard" />
              </MobileDrawerLink>
              <MobileDrawerLink href="/educator/classrooms" icon={Users}>
                <Translate fil="Mga Silid-aralan" en="Classrooms" />
              </MobileDrawerLink>
              <MobileDrawerLink href="/educator/analytics" icon={BarChart3}>
                <Translate fil="Analitika" en="Analytics" />
              </MobileDrawerLink>
              <MobileDrawerLink href="/educator/quizzes/new" icon={FileQuestion}>
                <Translate fil="Gawa ng Pagsusulit" en="Create Quiz" />
              </MobileDrawerLink>

              {/* Utility Section inside Drawer */}
              <div className="my-4 border-t border-white/10 pt-4 space-y-2">
                <SidebarNotification isCollapsed={false} />
                <SidebarLanguageToggle isCollapsed={false} />
              </div>
            </div>

            {/* Drawer Sign Out Footer */}
            <div className="p-4 border-t border-white/10 shrink-0">
              <SignOutButton isCollapsed={false} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          3. MOBILE BOTTOM NAVIGATION TAB BAR (< md)
          ═══════════════════════════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#d4ddd0] z-40 px-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden">
        <BottomTabLink href="/educator" icon={LayoutDashboard} labelFil="Bahay" labelEn="Home" exact />
        <BottomTabLink href="/educator/classrooms" icon={Users} labelFil="Silid" labelEn="Rooms" />
        <BottomTabLink href="/educator/analytics" icon={BarChart3} labelFil="Analitika" labelEn="Analytics" />
        <BottomTabLink href="/educator/quizzes/new" icon={PlusCircle} labelFil="Lumikha" labelEn="New Quiz" highlight />
      </nav>

      {/* ═══════════════════════════════════════════════════════════
          4. DESKTOP SIDEBAR (>= md)
          ═══════════════════════════════════════════════════════════ */}
      <aside 
        className={`hidden md:flex bg-brand-primary border-r border-[#285840] flex-col z-30 shrink-0 shadow-xl transition-all duration-300 relative h-full ${
          isCollapsed ? 'w-20' : 'w-64'
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
          className="absolute -right-3 top-24 bg-white text-brand-primary border border-[#d4ddd0] rounded-full p-1 hover:bg-brand-light shadow-md transition-colors z-50 flex items-center justify-center cursor-pointer"
          aria-label={isCollapsed ? "I-expand ang sidebar" : "I-collapse ang sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Navigation & Sidebar Actions */}
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 overflow-x-hidden pt-6 custom-scrollbar">
          {currentSession && (
            <Link
              href={`/educator/classrooms/${currentSession.classroom_id}/live/${currentSession.id}/host`}
              className={`relative flex items-center gap-2.5 py-3 rounded-2xl bg-linear-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-lg ring-2 ring-amber-300 animate-pulse hover:scale-105 active:scale-95 transition-all mx-3 ${
                isCollapsed ? 'px-0 justify-center mx-2' : 'px-4'
              }`}
              title="Bumalik sa Live Session"
            >
              <Zap className="w-5 h-5 fill-white shrink-0" />
              {!isCollapsed && <span className="truncate">Bumalik sa Live ➔</span>}
            </Link>
          )}

          <DesktopNavLink href="/educator" icon={LayoutDashboard} isCollapsed={isCollapsed} exact>
            <Translate fil="Dashboard" en="Dashboard" />
          </DesktopNavLink>
          <DesktopNavLink href="/educator/classrooms" icon={Users} isCollapsed={isCollapsed}>
            <Translate fil="Mga Silid-aralan" en="Classrooms" />
          </DesktopNavLink>
          <DesktopNavLink href="/educator/analytics" icon={BarChart3} isCollapsed={isCollapsed}>
            <Translate fil="Analitika" en="Analytics" />
          </DesktopNavLink>
          <DesktopNavLink href="/educator/quizzes/new" icon={FileQuestion} isCollapsed={isCollapsed}>
            <Translate fil="Gawa ng Pagsusulit" en="Create Quiz" />
          </DesktopNavLink>

          {/* Utilities Section */}
          <div className="my-3 border-t border-white/10 pt-3 flex flex-col gap-2">
            <SidebarNotification isCollapsed={isCollapsed} />
            <SidebarLanguageToggle isCollapsed={isCollapsed} />
          </div>
        </div>

        {/* User & Sign Out */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <SignOutButton isCollapsed={isCollapsed} />
          
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
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Helper Navigation Components
   ───────────────────────────────────────────────────────────── */

function DesktopNavLink({ 
  href, 
  icon: Icon, 
  children, 
  isCollapsed, 
  exact = false 
}: { 
  href: string
  icon: any
  children: React.ReactNode
  isCollapsed: boolean
  exact?: boolean 
}) {
  const pathname = usePathname()
  
  const isActive = exact 
    ? pathname === href 
    : (href === '/educator/quizzes/new' ? pathname.startsWith('/educator/quizzes') : pathname.startsWith(href))

  return (
    <Link 
      href={href} 
      className={`relative flex items-center gap-3 py-3 rounded-2xl transition-all duration-200 group font-extrabold mx-3 ${
        isActive 
          ? 'bg-white text-brand-primary shadow-lg shadow-black/10 ring-2 ring-white/30 translate-x-1' 
          : 'hover:bg-white/10 text-white/70 hover:text-white'
      } ${isCollapsed ? 'px-0 justify-center mx-2' : 'px-4'}`}
      title={isCollapsed ? (typeof children === 'string' ? children : undefined) : undefined}
    >
      {/* Active Left Indicator Pill */}
      {isActive && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-brand-secondary rounded-full" />
      )}
      <Icon className={`w-5 h-5 shrink-0 transition-all duration-200 ${isActive ? 'text-brand-primary scale-110' : 'group-hover:scale-105'}`} />
      {!isCollapsed && <span className="whitespace-nowrap font-black text-sm">{children}</span>}
    </Link>
  )
}

function MobileDrawerLink({
  href,
  icon: Icon,
  children,
  exact = false
}: {
  href: string
  icon: any
  children: React.ReactNode
  exact?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact 
    ? pathname === href 
    : (href === '/educator/quizzes/new' ? pathname.startsWith('/educator/quizzes') : pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl mx-3 font-extrabold text-sm transition-all ${
        isActive
          ? 'bg-white text-brand-primary shadow-md font-black'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand-primary' : 'text-white/80'}`} />
      <span>{children}</span>
    </Link>
  )
}

function BottomTabLink({
  href,
  icon: Icon,
  labelFil,
  labelEn,
  exact = false,
  highlight = false
}: {
  href: string
  icon: any
  labelFil: string
  labelEn: string
  exact?: boolean
  highlight?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact 
    ? pathname === href 
    : (href === '/educator/quizzes/new' ? pathname.startsWith('/educator/quizzes') : pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
        isActive 
          ? 'text-brand-primary scale-105' 
          : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {/* Top Active Bar */}
      {isActive && (
        <span className="absolute top-0 w-8 h-1 bg-brand-primary rounded-full" />
      )}
      <div className={`p-1 rounded-xl transition-all ${
        highlight && !isActive ? 'bg-amber-100/70 text-amber-700' : ''
      } ${isActive ? 'bg-brand-primary/10' : ''}`}>
        <Icon className={`w-5 h-5 ${isActive ? 'text-brand-primary stroke-[2.5]' : ''}`} />
      </div>
      <span className={`text-[10px] mt-0.5 tracking-tight font-heading ${isActive ? 'font-black text-brand-primary' : 'font-bold'}`}>
        <Translate fil={labelFil} en={labelEn} />
      </span>
    </Link>
  )
}

