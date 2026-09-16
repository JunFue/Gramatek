'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, FileQuestion, ArrowLeft, Plus, Settings, RefreshCw, 
  Star, AlertTriangle, UserMinus, CheckCircle2, X, Edit3, 
  Loader2, Zap, Trash2, Table, Award, Download, 
  Search, Clock, ChevronRight, Sparkles, Trophy, Target
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Translate } from '@/components/Translate'
import { CopyButton } from '@/components/ui/CopyButton'
import { 
  updateClassroomDetails, 
  regenerateClassroomCode, 
  kickStudentFromClassroom, 
  giveStudentStar, 
  giveStudentWarning,
  deleteClassroom
} from '@/app/educator/classrooms/actions'
import { 
  getGradeTier, 
  calculateClassroomAnalyticsSummary, 
  generateGradebookCSV,
  StudentClassroomSummary
} from '@/lib/utils/grading'

interface ClassroomManagerClientProps {
  classroom: {
    id: string
    name: string
    description: string | null
    enrollment_code: string
    enrollment_limit: number
    is_active: boolean
    created_at: string
    members?: Array<{
      student_id: string
      joined_at: string
      profiles?: any
    }>
  }
  quizzes: Array<{
    id: string
    title: string
    is_published: boolean
    time_limit_seconds: number
    created_at: string
  }>
  attempts?: Array<{
    id: string
    quiz_id: string
    student_id: string
    score: number
    total_questions: number
    time_taken_seconds: number
    completed_at: string
    streak_max?: number
    profiles?: any
  }>
  liveSessions?: Array<{
    id: string
    code?: string
    mode: string
    status: string
    created_at: string
    live_session_participants?: Array<{
      student_id: string
      total_score: number
      profiles?: any
    }>
  }>
}

type TabType = 'quizzes' | 'gradebook' | 'students' | 'live'

export function ClassroomManagerClient({ 
  classroom, 
  quizzes,
  attempts = [],
  liveSessions = []
}: ClassroomManagerClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabType>('quizzes')
  const [liveSessionsList, setLiveSessionsList] = useState(liveSessions)
  const supabase = createClient()
  
  // Feedback toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Sync with prop
  useEffect(() => {
    setLiveSessionsList(liveSessions)
  }, [liveSessions])

  // Realtime subscription for live sessions in this classroom
  useEffect(() => {
    if (!classroom.id) return

    const channel = supabase
      .channel(`classroom-manager-live-sessions-${classroom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `classroom_id=eq.${classroom.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { id: string; status: string; mode: string }
            setLiveSessionsList((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            )
          } else if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as any
            setLiveSessionsList((prev) => [newRecord, ...prev])
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as { id: string }
            setLiveSessionsList((prev) => prev.filter((s) => s.id !== oldRecord.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classroom.id, supabase])

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  
  // Student Action Modals (Star / Warn / Kick)
  const [activeStudent, setActiveStudent] = useState<{
    id: string
    name: string
  } | null>(null)
  const [studentActionType, setStudentActionType] = useState<'star' | 'warning' | 'kick' | null>(null)
  const [actionReason, setActionReason] = useState('')

  // Student Drill-down Modal (Viewing attempt history)
  const [inspectedStudent, setInspectedStudent] = useState<StudentClassroomSummary | null>(null)

  // Search in gradebook & student roster
  const [searchStudent, setSearchStudent] = useState('')

  // Edit Form state
  const [editName, setEditName] = useState(classroom.name)
  const [editDescription, setEditDescription] = useState(classroom.description || '')
  const [editLimit, setEditLimit] = useState(classroom.enrollment_limit)
  const [editIsActive, setEditIsActive] = useState(classroom.is_active)

  // Calculate classroom analytics & student summaries
  const analytics = useMemo(() => {
    const publishedQuizzes = quizzes.filter(q => q.is_published)
    return calculateClassroomAnalyticsSummary(
      { id: classroom.id, name: classroom.name },
      classroom.members || [],
      publishedQuizzes,
      attempts
    )
  }, [classroom, quizzes, attempts])

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return analytics.students
    const q = searchStudent.toLowerCase()
    return analytics.students.filter(s => s.studentName.toLowerCase().includes(q))
  }, [analytics.students, searchStudent])

  // Handlers
  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateClassroomDetails(classroom.id, {
        name: editName,
        description: editDescription,
        enrollment_limit: editLimit,
        is_active: editIsActive
      })

      if (res.error) {
        showToast('error', res.error)
      } else {
        showToast('success', 'Matagumpay na na-update ang mga detalye ng silid-aralan!')
        setIsEditModalOpen(false)
        router.refresh()
      }
    })
  }

  const handleRegenerateCode = async () => {
    startTransition(async () => {
      const res = await regenerateClassroomCode(classroom.id)
      if (res.error) {
        showToast('error', res.error)
      } else {
        showToast('success', `Bagong kodigo nabuo: ${res.newCode}`)
        setIsRegenerateModalOpen(false)
        router.refresh()
      }
    })
  }

  const handleExecuteStudentAction = async () => {
    if (!activeStudent || !studentActionType) return

    startTransition(async () => {
      if (studentActionType === 'kick') {
        const res = await kickStudentFromClassroom(classroom.id, activeStudent.id)
        if (res.error) {
          showToast('error', res.error)
        } else {
          showToast('success', `Inalis si ${activeStudent.name} mula sa silid-aralan.`)
          closeStudentModal()
          router.refresh()
        }
      } else if (studentActionType === 'star') {
        const res = await giveStudentStar(classroom.id, activeStudent.id, actionReason)
        if (res.error) {
          showToast('error', res.error)
        } else {
          showToast('success', `Matagumpay na iginawad ang bituin kay ${activeStudent.name}! ⭐`)
          closeStudentModal()
          router.refresh()
        }
      } else if (studentActionType === 'warning') {
        const res = await giveStudentWarning(classroom.id, activeStudent.id, actionReason)
        if (res.error) {
          showToast('error', res.error)
        } else {
          showToast('success', `Naipadala ang babala kay ${activeStudent.name}. ⚠️`)
          closeStudentModal()
          router.refresh()
        }
      }
    })
  }

  const openStudentModal = (studentId: string, studentName: string, type: 'star' | 'warning' | 'kick') => {
    setActiveStudent({ id: studentId, name: studentName })
    setStudentActionType(type)
    setActionReason(
      type === 'star' 
        ? 'Napakahusay na partisipasyon at aktibong pag-aaral!' 
        : type === 'warning' 
        ? 'Kailangang kumpletuhin ang mga itinalagang pagsusulit.' 
        : ''
    )
  }

  const closeStudentModal = () => {
    setActiveStudent(null)
    setStudentActionType(null)
    setActionReason('')
  }

  const handleDeleteClassroom = async () => {
    startTransition(async () => {
      const res = await deleteClassroom(classroom.id)
      if (res.error) {
        showToast('error', res.error)
        setIsDeleteModalOpen(false)
      } else {
        router.push('/educator/classrooms')
      }
    })
  }

  const handleExportCSV = () => {
    const publishedQuizzes = quizzes.filter(q => q.is_published)
    const csvContent = generateGradebookCSV(classroom.name, publishedQuizzes, analytics.students)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Gradebook_${classroom.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const publishedQuizzes = quizzes.filter(q => q.is_published)
  const activeLiveSession = liveSessionsList.find(s => ['lobby', 'question', 'reveal'].includes(s.status))

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative space-y-4 sm:space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-[150] px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-xs sm:text-sm text-white animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Live Session Alert Banner */}
      {activeLiveSession && (
        <div className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in border-2 border-white/30 relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/40 shadow-inner">
              <span className="w-4 h-4 rounded-full bg-white animate-ping" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-orange-600 shadow-xs">
                  {activeLiveSession.status === 'lobby' || activeLiveSession.status === 'setup' ? '⏳ LOBBY BUKAS' : '🔴 LIVE LARO / SESYON'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/20 text-white border border-white/20">
                  {activeLiveSession.mode === 'group' ? 'Pangkatang Laban' : 'Indibidwal'}
                </span>
                {(activeLiveSession.code || classroom.enrollment_code) && (
                  <span className="text-xs font-mono font-black bg-white/20 px-2 py-0.5 rounded-md">
                    PIN: {activeLiveSession.code || classroom.enrollment_code}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-black">
                May Kasalukuyang Aktibong Live Session sa Silid na Ito!
              </h2>
              <p className="text-white/90 text-xs font-semibold mt-0.5">
                {(activeLiveSession.live_session_participants || []).length} mga mag-aaral ang kasalukuyang nakatala sa sesyong ito.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 relative z-10 self-start md:self-auto shrink-0">
            <a
              href={`/educator/classrooms/${classroom.id}/live/${activeLiveSession.id}/display`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-white/30 cursor-pointer"
            >
              <span>Display Screen ↗</span>
            </a>
            <Link
              href={`/educator/classrooms/${classroom.id}/live/${activeLiveSession.id}/host`}
              className="px-5 py-2.5 bg-white hover:bg-amber-50 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Bumalik sa Host Panel ➔</span>
            </Link>
          </div>
        </div>
      )}

      {/* Back navigation */}
      <Link 
        href="/educator/classrooms" 
        className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-2 relative z-10 font-bold text-xs sm:text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <Translate fil="Bumalik sa Mga Silid-aralan" en="Back to Classrooms" />
      </Link>

      {/* Header Banner & Classroom Details */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md relative overflow-hidden">
        <div className="absolute top-1/2 right-10 w-48 h-48 bg-brand-primary/10 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 sm:gap-6 relative z-10">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-black text-slate-900">{classroom.name}</h1>
              <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-black shadow-xs ${
                classroom.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {classroom.is_active ? 'Aktibo' : 'Naka-archive'}
              </span>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-brand-light text-slate-700 hover:text-brand-primary rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 border border-slate-200 shadow-xs active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <Translate fil="I-edit ang Detalye" en="Edit Details" />
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 border border-rose-200 shadow-xs active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <Translate fil="Burahin" en="Delete" />
              </button>
            </div>
            <p className="text-slate-600 max-w-2xl text-xs sm:text-base md:text-lg font-medium leading-relaxed mt-2">
              {classroom.description || 'Walang ibinigay na paglalarawan.'}
            </p>
          </div>

          {/* Enrollment Code Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shrink-0 flex flex-col items-center justify-center min-w-[200px] sm:min-w-[240px] shadow-sm">
             <p className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest font-black mb-1.5">
               <Translate fil="Kodigo sa Pagpapatala" en="Enrollment Code" />
             </p>
             <div className="flex items-center gap-2.5 sm:gap-3">
               <span className="text-2xl sm:text-3xl font-mono font-black text-brand-primary tracking-widest bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-inner">
                 {classroom.enrollment_code}
               </span>
               <CopyButton text={classroom.enrollment_code} />
             </div>
             
             <div className="w-full flex items-center justify-between mt-3 sm:mt-4 pt-3 border-t border-slate-200/80 text-xs font-bold text-slate-500">
               <span>
                 {classroom.members?.length || 0} / {classroom.enrollment_limit} <Translate fil="nakatala" en="enrolled" />
               </span>
               <button
                 onClick={() => setIsRegenerateModalOpen(true)}
                 className="text-brand-primary hover:text-slate-700 font-extrabold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                 title="Magbuo ng bagong kodigo"
               >
                 <RefreshCw className="w-3.5 h-3.5" />
                 <Translate fil="Bagong Kodigo" en="Regenerate" />
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'quizzes'
              ? 'bg-white text-brand-primary border-b-2 border-brand-primary font-black shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          <Translate fil="Mga Pagsusulit" en="Quizzes" />
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">
            {quizzes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('gradebook')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'gradebook'
              ? 'bg-white text-brand-primary border-b-2 border-brand-primary font-black shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Table className="w-4 h-4" />
          <Translate fil="Talaan ng Grado at Progreso" en="Gradebook & Progress" />
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
            {analytics.averageScorePercentage}% Avg
          </span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'students'
              ? 'bg-white text-brand-primary border-b-2 border-brand-primary font-black shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <Translate fil="Pamamahala ng Mag-aaral" en="Student Roster" />
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">
            {classroom.members?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'live'
              ? 'bg-white text-brand-primary border-b-2 border-brand-primary font-black shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <Translate fil="Live Arena Kasaysayan" en="Live Arena History" />
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">
            {liveSessionsList.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: QUIZZES ================= */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h2 className="text-lg sm:text-xl font-heading font-black text-slate-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-brand-primary" />
              <Translate fil="Mga Pagsusulit sa Silid" en="Classroom Quizzes" />
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {activeLiveSession ? (
                <Link 
                  href={`/educator/classrooms/${classroom.id}/live/${activeLiveSession.id}/host`} 
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs md:text-sm font-black rounded-full transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 cursor-pointer ring-2 ring-emerald-300"
                >
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-emerald-200" />
                  <Translate fil="Bumalik sa Live Session ➔" en="Resume Live Session ➔" />
                </Link>
              ) : (
                <Link 
                  href={`/educator/classrooms/${classroom.id}/live/setup`} 
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm font-black rounded-full transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-200" />
                  <Translate fil="Mag-Live Session" en="Live Session" />
                </Link>
              )}
              <Link 
                href={`/educator/quizzes/new?classroom=${classroom.id}`} 
                className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-brand-primary hover:bg-slate-600 text-white text-xs md:text-sm font-black rounded-full transition-all flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <Translate fil="Gumawa ng Pagsusulit" en="Create Quiz" />
              </Link>
            </div>
          </div>

          {quizzes && quizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {quizzes.map((quiz) => {
                const qAttempts = attempts.filter(a => a.quiz_id === quiz.id)
                const completedStudentsCount = new Set(qAttempts.map(a => a.student_id)).size
                const avgPct = qAttempts.length > 0
                  ? Math.round(qAttempts.reduce((acc, a) => acc + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0), 0) / qAttempts.length)
                  : 0

                return (
                  <Link 
                    href={`/educator/quizzes/${quiz.id}`} 
                    key={quiz.id} 
                    className="block bg-white hover:border-brand-primary/50 shadow-sm hover:shadow-md rounded-2xl p-5 border border-slate-200 group transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-slate-900 font-heading font-bold text-base sm:text-lg group-hover:text-brand-primary transition-colors">
                        {quiz.title}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shrink-0 ${
                        quiz.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {quiz.is_published ? 'Nailathala' : 'Draft / Na-withdraw'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 font-medium text-xs mt-1">
                      <span>{Math.floor(quiz.time_limit_seconds / 60)} min limit</span>
                      <span>•</span>
                      <span>Nilikha {new Date(quiz.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Quiz Metrics */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">
                        {completedStudentsCount} / {classroom.members?.length || 0} mag-aaral nakasagot
                      </span>
                      {qAttempts.length > 0 && (
                        <span className="font-black text-brand-primary bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          {avgPct}% Karaniwan
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center flex flex-col items-center shadow-sm">
               <FileQuestion className="w-12 h-12 text-slate-300 mb-3" />
               <p className="text-slate-700 font-bold mb-1">
                 <Translate fil="Wala pang nilikhang mga pagsusulit." en="No quizzes have been created yet." />
               </p>
               <p className="text-slate-400 text-xs mb-5 font-medium">
                 <Translate fil="Gumawa ng pagsusulit para sa mga mag-aaral sa silid na ito." en="Create quizzes for the enrolled students in this classroom." />
               </p>
               <Link 
                 href={`/educator/quizzes/new?classroom=${classroom.id}`} 
                 className="btn-primary text-sm px-6 py-2.5 rounded-full"
               >
                 <Translate fil="Gumawa ng unang pagsusulit" en="Create first quiz" />
               </Link>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: GRADEBOOK & PROGRESS MATRIX ================= */}
      {activeTab === 'gradebook' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* Gradebook Header KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase"><Translate fil="Karaniwang Grado" en="Class Average" /></p>
                <p className="text-2xl font-black font-heading text-slate-900">
                  {analytics.averageScorePercentage}% 
                  <span className="text-xs font-bold text-slate-500 ml-1">
                    ({getGradeTier(analytics.averageScorePercentage).labelFil})
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase"><Translate fil="Antas ng Pagtatapos" en="Completion Rate" /></p>
                <p className="text-2xl font-black font-heading text-slate-900">
                  {analytics.overallCompletionRate}%
                </p>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase"><Translate fil="Kabuuang Pagtatangka" en="Total Attempts" /></p>
                <p className="text-2xl font-black font-heading text-slate-900">
                  {analytics.totalAttempts}
                </p>
              </div>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Hanapin ang mag-aaral..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-primary"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <Translate fil="I-download ang Gradebook (CSV)" en="Export Gradebook (CSV)" />
            </button>
          </div>

          {/* Interactive Gradebook Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 sticky left-0 bg-slate-50 z-10 min-w-[180px]">
                        <Translate fil="Mag-aaral" en="Student" />
                      </th>
                      <th className="py-3.5 px-3 text-center min-w-[100px]">
                        <Translate fil="Progreso" en="Progress" />
                      </th>
                      <th className="py-3.5 px-3 text-center min-w-[130px]">
                        <Translate fil="Kabuuang Grado" en="Overall Grade" />
                      </th>
                      {publishedQuizzes.map(q => (
                        <th key={q.id} className="py-3.5 px-3 text-center min-w-[140px] truncate max-w-[200px]" title={q.title}>
                          {q.title}
                        </th>
                      ))}
                      <th className="py-3.5 px-3 text-right">
                        <Translate fil="Aksyon" en="Action" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s) => {
                      const tier = s.overallGradeTier

                      return (
                        <tr 
                          key={s.studentId} 
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => setInspectedStudent(s)}
                        >
                          {/* Student Info (Sticky on mobile horizontal scroll) */}
                          <td className="py-3.5 px-4 sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 border-r border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-brand-light text-brand-primary font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-brand-primary/20">
                                {s.avatarUrl ? (
                                  <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  s.studentName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="font-extrabold text-slate-900 truncate">{s.studentName}</span>
                            </div>
                          </td>

                          {/* Progress Rate */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-bold text-slate-700">
                              {s.quizzesCompleted}/{s.totalQuizzes}
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-brand-primary rounded-full" 
                                style={{ width: `${s.completionRate}%` }} 
                              />
                            </div>
                          </td>

                          {/* Overall Grade Tier */}
                          <td className="py-3.5 px-3 text-center">
                            {s.quizzesCompleted > 0 && tier ? (
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${tier.badgeBg} ${tier.badgeText} border ${tier.badgeBorder}`}>
                                {s.averagePercentage}% • {tier.letter}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium italic">
                                Wala Pang Iskor
                              </span>
                            )}
                          </td>

                          {/* Quiz Column Scores */}
                          {publishedQuizzes.map(q => {
                            const qProg = s.quizzes[q.id]
                            if (!qProg || !qProg.hasAttempted) {
                              return (
                                <td key={q.id} className="py-3.5 px-3 text-center text-slate-400 text-xs">
                                  —
                                </td>
                              )
                            }

                            const qTier = qProg.gradeTier
                            return (
                              <td key={q.id} className="py-3.5 px-3 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-extrabold text-slate-900 text-xs">
                                    {qProg.bestScore}/{qProg.maxScore}
                                  </span>
                                  {qTier && (
                                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md mt-0.5 ${qTier.badgeBg} ${qTier.badgeText}`}>
                                      {qProg.bestPercentage}%
                                    </span>
                                  )}
                                </div>
                              </td>
                            )
                          })}

                          {/* Action Button */}
                          <td className="py-3.5 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setInspectedStudent(s)
                              }}
                              className="text-brand-primary hover:text-slate-900 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Translate fil="Suriin" en="View" /> <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium text-xs sm:text-sm">
                  <Translate fil="Walang nahanap na mag-aaral." en="No students found." />
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: STUDENT ROSTER & ACTIONS ================= */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-primary" />
              <Translate fil="Mga Nakatalang Mag-aaral" en="Enrolled Students" />
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                {classroom.members?.length || 0}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {classroom.members && classroom.members.length > 0 ? (
              classroom.members.map((member, i) => {
                const studentName = member.profiles?.full_name || 'Mag-aaral'
                const summary = analytics.students.find(s => s.studentId === member.student_id)
                const tier = summary?.overallGradeTier

                return (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-light flex items-center justify-center overflow-hidden shrink-0 border border-brand-primary/20 text-brand-primary font-bold shadow-xs">
                          {member.profiles?.avatar_url ? (
                            <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            studentName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-900 text-sm font-extrabold truncate">{studentName}</p>
                          <p className="text-slate-400 text-[11px] font-semibold">
                            Sumali: {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Performance Mini Pill */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs mb-4">
                        <span className="text-slate-500 font-bold">Progreso:</span>
                        <span className="font-extrabold text-slate-800">
                          {summary?.quizzesCompleted || 0}/{quizzes.filter(q => q.is_published).length} natapos
                        </span>
                        {tier ? (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${tier.badgeBg} ${tier.badgeText}`}>
                            {summary?.averagePercentage}% ({tier.letter})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Wala pang grado</span>
                        )}
                      </div>
                    </div>

                    {/* Student Action Bar */}
                    <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => openStudentModal(member.student_id, studentName, 'star')}
                        className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 shadow-xs border border-amber-200/50 active:scale-95 cursor-pointer"
                        title="Magbigay ng bituin ng pagkilala"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span><Translate fil="Bituin" en="Star" /></span>
                      </button>

                      <button
                        onClick={() => openStudentModal(member.student_id, studentName, 'warning')}
                        className="flex-1 py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 shadow-xs border border-orange-200/50 active:scale-95 cursor-pointer"
                        title="Magpadala ng paalala o babala"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                        <span><Translate fil="Babala" en="Warn" /></span>
                      </button>

                      <button
                        onClick={() => openStudentModal(member.student_id, studentName, 'kick')}
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-colors shadow-xs border border-slate-200/60 active:scale-95 cursor-pointer"
                        title="Alisin ang mag-aaral sa silid-aralan"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-700 text-sm font-bold">
                  <Translate fil="Wala pang sumaling mag-aaral." en="No students have joined yet." />
                </p>
                <p className="text-slate-500 text-xs mt-1 font-medium">
                  <Translate fil="Ibahagi ang kodigong" en="Share the code" /> <strong className="text-brand-primary font-mono font-bold">{classroom.enrollment_code}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: LIVE ARENA HISTORY ================= */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <Translate fil="Kasaysayan ng mga Live Session" en="Live Arena History" />
            </h2>
            <Link 
              href={`/educator/classrooms/${classroom.id}/live/setup`} 
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <Translate fil="Bagong Live Session" en="New Live Session" />
            </Link>
          </div>

          {liveSessionsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {liveSessionsList.map((session) => (
                <div key={session.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-brand-primary bg-brand-light/30 px-2 py-0.5 rounded-md border border-brand-primary/20">
                          PIN: {session.code || classroom.enrollment_code}
                        </span>
                        <h4 className="font-heading font-bold text-slate-900 mt-1">
                          Mode: {session.mode === 'group' ? 'Pangkatang Laban (Group)' : 'Indibidwal (Solo)'}
                        </h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                        session.status === 'ended' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800 animate-pulse'
                      }`}>
                        {session.status === 'ended' ? 'Tapos Na' : 'Aktibo'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-medium mb-3">
                      Petsa: {new Date(session.created_at).toLocaleString()}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium">
                      <span>Nilahukan ng <strong>{session.live_session_participants?.length || 0}</strong> mag-aaral</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex flex-wrap items-center justify-between gap-2">
                    {session.status !== 'ended' ? (
                      <>
                        <a
                          href={`/educator/classrooms/${classroom.id}/live/${session.id}/display`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          Display Screen ↗
                        </a>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/educator/classrooms/${classroom.id}/live/${session.id}/results`}
                            className="text-xs font-bold text-slate-600 hover:underline"
                          >
                            Resulta
                          </Link>
                          <Link
                            href={`/educator/classrooms/${classroom.id}/live/${session.id}/host`}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Bumalik sa Host ➔</span>
                          </Link>
                        </div>
                      </>
                    ) : (
                      <Link
                        href={`/educator/classrooms/${classroom.id}/live/${session.id}/results`}
                        className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1 ml-auto"
                      >
                        <Translate fil="Tingnan ang Resulta at Ranggo" en="View Standings & Results" /> →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <Zap className="w-10 h-10 text-amber-300 mx-auto mb-2" />
              <p className="text-slate-700 text-sm font-bold">
                <Translate fil="Wala pang live session na naisagawa sa silid na ito." en="No live sessions conducted yet in this room." />
              </p>
              <Link 
                href={`/educator/classrooms/${classroom.id}/live/setup`}
                className="mt-3 inline-block text-xs font-bold text-amber-600 hover:underline"
              >
                <Translate fil="Magsimula ng Live Session Ngayon" en="Start a Live Session Now" /> ➔
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: STUDENT ATTEMPT DRILL-DOWN ================= */}
      {inspectedStudent && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col relative animate-slide-up">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-light text-brand-primary font-bold text-lg flex items-center justify-center overflow-hidden border border-brand-primary/20">
                  {inspectedStudent.avatarUrl ? (
                    <img src={inspectedStudent.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    inspectedStudent.studentName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-heading font-black text-slate-900">{inspectedStudent.studentName}</h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    Sumali noong: {new Date(inspectedStudent.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectedStudent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 my-4 shrink-0">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Karaniwang Iskor</p>
                <p className="text-xl font-black text-slate-900">
                  {inspectedStudent.averagePercentage}%
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Mga Natapos</p>
                <p className="text-xl font-black text-slate-900">
                  {inspectedStudent.quizzesCompleted} / {inspectedStudent.totalQuizzes}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Antas ng Grado</p>
                <p className="text-xl font-black text-slate-900">
                  {inspectedStudent.overallGradeTier ? inspectedStudent.overallGradeTier.letter : '—'}
                </p>
              </div>
            </div>

            {/* Quizzes Breakdown List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Detalye ng mga Pagsusulit sa Silid
              </h4>

              {publishedQuizzes.map(q => {
                const prog = inspectedStudent.quizzes[q.id]
                const qAttempts = attempts.filter(a => a.quiz_id === q.id && a.student_id === inspectedStudent.studentId)

                return (
                  <div key={q.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-900 text-sm">{q.title}</h5>
                      {prog && prog.hasAttempted ? (
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-black ${prog.gradeTier?.badgeBg} ${prog.gradeTier?.badgeText}`}>
                          Pinakamataas: {prog.bestScore}/{prog.maxScore} ({prog.bestPercentage}%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-200 text-slate-600">
                          Hindi Pa Nasagutan
                        </span>
                      )}
                    </div>

                    {/* Attempt records for this quiz */}
                    {qAttempts.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                        {qAttempts.map((qa, idx) => (
                          <div key={qa.id} className="flex items-center justify-between text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                            <span>Pagtatangka #{idx + 1} ({new Date(qa.completed_at).toLocaleString()})</span>
                            <span className="font-black text-slate-900">
                              {qa.score} / {qa.total_questions} ({qa.total_questions > 0 ? Math.round((qa.score / qa.total_questions) * 100) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const s = inspectedStudent
                    setInspectedStudent(null)
                    openStudentModal(s.studentId, s.studentName, 'star')
                  }}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <Translate fil="Bigyan ng Bituin" en="Award Star" />
                </button>

                <button
                  onClick={() => {
                    const s = inspectedStudent
                    setInspectedStudent(null)
                    openStudentModal(s.studentId, s.studentName, 'warning')
                  }}
                  className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold text-xs rounded-xl border border-orange-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  <Translate fil="Magpadala ng Babala" en="Send Warning" />
                </button>
              </div>

              <button
                onClick={() => setInspectedStudent(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                <Translate fil="Isara" en="Close" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Edit Classroom Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 relative animate-slide-up">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center text-brand-primary">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-heading font-black text-slate-900">
                  <Translate fil="I-edit ang Silid-aralan" en="Edit Classroom Details" />
                </h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassroom} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  <Translate fil="Pangalan ng Silid-aralan" en="Classroom Name" /> *
                </label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  <Translate fil="Paglalarawan" en="Description" />
                </label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-semibold focus:outline-none focus:border-brand-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">
                    <Translate fil="Limitasyon ng Mag-aaral" en="Enrollment Limit" />
                  </label>
                  <input 
                    type="number" 
                    value={editLimit}
                    onChange={(e) => setEditLimit(parseInt(e.target.value) || 1)}
                    min={1}
                    max={500}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">
                    <Translate fil="Katayuan ng Silid" en="Classroom Status" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(!editIsActive)}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-sm border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      editIsActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {editIsActive ? '🟢 Aktibo' : '📁 Naka-archive'}
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-full font-bold text-slate-500 hover:bg-slate-100 text-sm cursor-pointer"
                >
                  <Translate fil="Kanselahin" en="Cancel" />
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 bg-brand-primary hover:bg-slate-600 text-white font-extrabold rounded-full shadow-md text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Translate fil="I-save ang Pagbabago" en="Save Changes" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Regenerate Code Confirmation Modal */}
      {isRegenerateModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 text-center animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-7 h-7" />
            </div>
            
            <h3 className="text-xl font-heading font-black text-slate-900 mb-2">
              <Translate fil="Magbuo ng Bagong Kodigo?" en="Regenerate Enrollment Code?" />
            </h3>
            
            <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
              <Translate 
                fil="Ang lumang kodigo ay hindi na magagamit para makasali ang mga bagong mag-aaral. Ang mga nakatala nang mag-aaral ay mananatili sa silid." 
                en="The existing code will no longer work for new students to join. Currently enrolled students will remain in the classroom." 
              />
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setIsRegenerateModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-sm cursor-pointer"
              >
                <Translate fil="Kanselahin" en="Cancel" />
              </button>
              <button
                type="button"
                onClick={handleRegenerateCode}
                disabled={isPending}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-full text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Translate fil="Oo, Baguhin" en="Yes, Regenerate" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Student Action Modal (Star / Warning / Kick) */}
      {activeStudent && studentActionType && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 relative animate-slide-up">
            
            {studentActionType === 'star' && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 fill-amber-400" />
                </div>
                <h3 className="text-xl font-heading font-black text-slate-900 text-center mb-1">
                  <Translate fil={`Bigyan ng Bituin si ${activeStudent.name}`} en={`Award Star to ${activeStudent.name}`} />
                </h3>
                <p className="text-slate-500 text-xs font-medium text-center mb-5">
                  <Translate fil="Makakatanggap ang mag-aaral ng abiso at pagkilala sa kanyang dashboard." en="The student will receive a notification and recognition in their dashboard." />
                </p>

                <div className="space-y-3 mb-6">
                  <label className="text-xs font-bold text-slate-700 block">
                    <Translate fil="Mensahe / Dahilan ng Pagkilala" en="Recognition Message" />
                  </label>
                  <textarea 
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-900 font-semibold text-sm focus:outline-none focus:border-brand-primary resize-none"
                    placeholder="Ilagay ang mensahe para sa mag-aaral..."
                  />
                  
                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Napakahusay na partisipasyon! ⭐',
                      'Perpektong marka sa pagsusulit! 🏆',
                      'Matiyagang pagsasanay sa Filipino! 💡'
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActionReason(preset)}
                        className="text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {studentActionType === 'warning' && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-heading font-black text-slate-900 text-center mb-1">
                  <Translate fil={`Magpadala ng Babala kay ${activeStudent.name}`} en={`Send Warning to ${activeStudent.name}`} />
                </h3>
                <p className="text-slate-500 text-xs font-medium text-center mb-5">
                  <Translate fil="Makakatanggap ang mag-aaral ng pormal na paalala sa kanyang mga abiso." en="The student will receive an official reminder in their notifications." />
                </p>

                <div className="space-y-3 mb-6">
                  <label className="text-xs font-bold text-slate-700 block">
                    <Translate fil="Dahilan ng Babala / Paalala" en="Warning / Reminder Reason" /> *
                  </label>
                  <textarea 
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-900 font-semibold text-sm focus:outline-none focus:border-brand-primary resize-none"
                    placeholder="Ilagay ang dahilan..."
                  />

                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Kailangang kumpletuhin ang pagsusulit sa takdang oras.',
                      'Mangyaring mag-ingat sa pananalita sa klase.',
                      'Hindi pa nakakapagsumite ng takdang-aralin.'
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActionReason(preset)}
                        className="text-[10px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full border border-orange-200 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {studentActionType === 'kick' && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <UserMinus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-heading font-black text-slate-900 text-center mb-2">
                  <Translate fil={`Alisin si ${activeStudent.name}?`} en={`Remove ${activeStudent.name}?`} />
                </h3>
                <p className="text-slate-600 text-sm font-medium text-center leading-relaxed mb-6">
                  <Translate 
                    fil={`Sigurado ka bang nais mong tanggalin si ${activeStudent.name} sa silid-aralang ito? Mawawalan siya ng access sa mga pagsusulit sa silid.`} 
                    en={`Are you sure you want to remove ${activeStudent.name} from this classroom? They will lose access to classroom quizzes.`} 
                  />
                </p>
              </>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={closeStudentModal}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-sm cursor-pointer"
              >
                <Translate fil="Kanselahin" en="Cancel" />
              </button>
              
              <button
                type="button"
                onClick={handleExecuteStudentAction}
                disabled={isPending || (studentActionType === 'warning' && !actionReason.trim())}
                className={`px-6 py-2.5 font-extrabold rounded-full text-sm text-white shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer ${
                  studentActionType === 'kick' 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : studentActionType === 'star' 
                    ? 'bg-amber-500 hover:bg-amber-600' 
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {studentActionType === 'kick' ? (
                  <Translate fil="Oo, Alisin" en="Yes, Remove" />
                ) : studentActionType === 'star' ? (
                  <Translate fil="Ipadala ang Bituin ⭐" en="Send Star ⭐" />
                ) : (
                  <Translate fil="Ipadala ang Babala ⚠️" en="Send Warning ⚠️" />
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Classroom Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl relative animate-scale-up">
            
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-heading font-black text-slate-900 text-center mb-2">
              <Translate fil="Burahin ang Silid-aralan?" en="Delete Classroom?" />
            </h3>

            <p className="text-slate-600 text-sm font-medium text-center leading-relaxed mb-6">
              <Translate 
                fil={`Sigurado ka bang nais mong burahin ang "${classroom.name}"? Mabubura ang lahat ng nakatala ritong mag-aaral, pagsusulit, at live session.`} 
                en={`Are you sure you want to delete "${classroom.name}"? All enrolled students, quizzes, and live sessions in this room will be permanently removed.`} 
              />
            </p>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-sm cursor-pointer"
              >
                <Translate fil="Kanselahin" en="Cancel" />
              </button>
              
              <button
                type="button"
                onClick={handleDeleteClassroom}
                disabled={isPending}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 font-extrabold rounded-full text-sm text-white shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Translate fil="Oo, Burahin Na" en="Yes, Delete Now" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
