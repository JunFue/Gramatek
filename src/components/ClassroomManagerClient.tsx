'use client'

import { useState, useTransition } from 'react'
import { 
  Users, FileQuestion, ArrowLeft, Plus, Settings, RefreshCw, 
  Star, AlertTriangle, UserMinus, CheckCircle2, X, Edit3, 
  Loader2, Zap, Trash2
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
      profiles?: {
        full_name: string | null
        avatar_url: string | null
      } | null
    }>
  }
  quizzes: Array<{
    id: string
    title: string
    is_published: boolean
    time_limit_seconds: number
    created_at: string
  }>
}

export function ClassroomManagerClient({ classroom, quizzes }: ClassroomManagerClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Feedback toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false)
  
  // Student Action Modals
  const [activeStudent, setActiveStudent] = useState<{
    id: string
    name: string
  } | null>(null)
  const [studentActionType, setStudentActionType] = useState<'star' | 'warning' | 'kick' | null>(null)
  const [actionReason, setActionReason] = useState('')

  // Edit Form state
  const [editName, setEditName] = useState(classroom.name)
  const [editDescription, setEditDescription] = useState(classroom.description || '')
  const [editLimit, setEditLimit] = useState(classroom.enrollment_limit)
  const [editIsActive, setEditIsActive] = useState(classroom.is_active)

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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

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

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[150] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm text-white animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Back navigation */}
      <Link 
        href="/educator/classrooms" 
        className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-6 relative z-10 font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        <Translate fil="Bumalik sa Mga Silid-aralan" en="Back to Classrooms" />
      </Link>

      {/* Header Banner & Classroom Details */}
      <div className="bg-white rounded-3xl p-6 md:p-8 mb-8 border border-slate-200 shadow-md relative overflow-hidden">
        <div className="absolute top-1/2 right-10 w-48 h-48 bg-brand-primary/10 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-heading font-black text-slate-900">{classroom.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-black shadow-xs ${
                classroom.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {classroom.is_active ? 'Aktibo' : 'Naka-archive'}
              </span>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-brand-light text-slate-700 hover:text-brand-primary rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 border border-slate-200 shadow-xs active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <Translate fil="I-edit ang Detalye" en="Edit Details" />
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 border border-rose-200 shadow-xs active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <Translate fil="Burahin" en="Delete" />
              </button>
            </div>
            <p className="text-slate-600 max-w-2xl text-base md:text-lg font-medium leading-relaxed mt-2">
              {classroom.description || 'Walang ibinigay na paglalarawan.'}
            </p>
          </div>

          {/* Enrollment Code Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shrink-0 flex flex-col items-center justify-center min-w-[240px] shadow-sm">
             <p className="text-slate-500 text-xs uppercase tracking-widest font-black mb-1.5">
               <Translate fil="Kodigo sa Pagpapatala" en="Enrollment Code" />
             </p>
             <div className="flex items-center gap-3">
               <span className="text-3xl font-mono font-black text-brand-primary tracking-widest bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-inner">
                 {classroom.enrollment_code}
               </span>
               <CopyButton text={classroom.enrollment_code} />
             </div>
             
             <div className="w-full flex items-center justify-between mt-4 pt-3 border-t border-slate-200/80 text-xs font-bold text-slate-500">
               <span>
                 {classroom.members?.length || 0} / {classroom.enrollment_limit} <Translate fil="nakatala" en="enrolled" />
               </span>
               <button
                 onClick={() => setIsRegenerateModalOpen(true)}
                 className="text-brand-primary hover:text-slate-700 font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                 title="Magbuo ng bagong kodigo"
               >
                 <RefreshCw className="w-3.5 h-3.5" />
                 <Translate fil="Bagong Kodigo" en="Regenerate" />
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Quizzes (2 cols) & Students (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Main Content Area: Quizzes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-black text-slate-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-brand-primary" />
              <Translate fil="Mga Pagsusulit sa Silid" en="Classroom Quizzes" />
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                {quizzes.length}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <Link 
                href={`/educator/classrooms/${classroom.id}/live/setup`} 
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm font-black rounded-full transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-amber-200" />
                <Translate fil="Mag-Live Session" en="Live Session" />
              </Link>
              <Link 
                href={`/educator/quizzes/new?classroom=${classroom.id}`} 
                className="px-4 py-2 bg-brand-primary hover:bg-slate-600 text-white text-xs md:text-sm font-black rounded-full transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <Translate fil="Gumawa ng Pagsusulit" en="Create Quiz" />
              </Link>
            </div>
          </div>

          {quizzes && quizzes.length > 0 ? (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <Link 
                  href={`/educator/quizzes/${quiz.id}`} 
                  key={quiz.id} 
                  className="block bg-white hover:border-brand-primary/50 shadow-sm hover:shadow-md rounded-2xl p-5 border border-slate-200 group transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-slate-900 font-heading font-bold text-lg group-hover:text-brand-primary transition-colors">
                        {quiz.title}
                      </h3>
                      <div className="flex items-center gap-3 text-slate-500 font-medium text-xs md:text-sm mt-1">
                        <span>{Math.floor(quiz.time_limit_seconds / 60)} min limit</span>
                        <span>•</span>
                        <span>Nilikha {new Date(quiz.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black shadow-xs ${
                        quiz.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {quiz.is_published ? 'Nailathala' : 'Draft / Na-withdraw'}
                      </span>
                      <span className="p-2 rounded-xl bg-slate-100 group-hover:bg-brand-primary group-hover:text-white text-slate-500 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
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

        {/* Sidebar Area: Student Management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-primary" />
              <Translate fil="Mga Mag-aaral" en="Students" />
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                {classroom.members?.length || 0}
              </span>
            </h2>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {classroom.members && classroom.members.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {classroom.members.map((member, i) => {
                  const studentName = member.profiles?.full_name || 'Mag-aaral'
                  return (
                    <li key={i} className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
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

                      {/* Student Action Bar */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
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
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="p-8 text-center bg-slate-50">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
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

      </div>

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
