import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, BookOpen, Target, CheckCircle2, Award, ChevronRight, Megaphone, CalendarClock } from 'lucide-react'
import { Translate } from '@/components/Translate'
import { getGradeTier, calculateStudentClassroomSummary } from '@/lib/utils/grading'
import { StudentLiveBanner } from '@/components/live/StudentLiveBanner'
import { mergeAnnouncements } from '@/lib/utils/announcements'

export default async function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) notFound()

  // 1. Fetch Classroom Info & Verify Enrollment
  const { data: classroom } = await supabase
    .from('classrooms')
    .select(`
      *,
      profiles!classrooms_educator_id_fkey ( full_name ),
      classroom_members!inner(student_id, joined_at)
    `)
    .eq('id', id)
    .eq('classroom_members.student_id', user.id)
    .single()

  if (!classroom) notFound()

  // 2. Fetch Quizzes
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, description, time_limit_seconds, game_mode, scheduled_start, scheduled_end')
    .eq('classroom_id', id)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  const validQuizzes = quizzes || []

  // 3. Fetch past attempts for this student in this classroom's quizzes
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes!inner(classroom_id)')
    .eq('student_id', user.id)
    .eq('quizzes.classroom_id', id)

  const validAttempts = attempts || []

  // 4. Calculate student progress summary
  const summary = calculateStudentClassroomSummary(
    {
      student_id: user.id,
      joined_at: classroom.classroom_members?.[0]?.joined_at || new Date().toISOString(),
    },
    validQuizzes,
    validAttempts
  )

  // 5. Check for active Live Session within last 12 hours
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data: activeLiveSession } = await supabase
    .from('live_sessions')
    .select('id, status, mode')
    .eq('classroom_id', id)
    .in('status', ['lobby', 'question', 'reveal'])
    .gte('created_at', twelveHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let isParticipant = false
  if (activeLiveSession) {
    const { data: pCheck } = await supabase
      .from('live_session_participants')
      .select('student_id')
      .eq('session_id', activeLiveSession.id)
      .eq('student_id', user.id)
      .is('removed_at', null)
      .maybeSingle()
    isParticipant = !!pCheck
  }

  // 6. Fetch Classroom Announcements for this classroom
  let tableAnnouncements: any[] = []
  try {
    const { data: annData } = await supabase
      .from('classroom_announcements')
      .select('id, classroom_id, title, content, priority, created_at')
      .eq('classroom_id', id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (annData) tableAnnouncements = annData
  } catch {
    // Fallback if table not created yet
  }

  const { data: studentNotifs } = await supabase
    .from('notifications')
    .select('id, title, body, link, created_at')
    .eq('user_id', user.id)
    .ilike('link', `%${id}%`)
    .order('created_at', { ascending: false })
    .limit(40)

  const classroomNameMap = new Map<string, string>([[classroom.id, classroom.name]])
  const educatorNameMap = new Map<string, string>([
    [classroom.id, classroom.profiles?.full_name || 'Guro']
  ])
  const announcements = mergeAnnouncements(
    tableAnnouncements,
    studentNotifs || [],
    classroomNameMap,
    educatorNameMap
  )

  const tier = summary.overallGradeTier
  const nowMs = Date.now()

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative z-10 transition-colors duration-300 space-y-6 sm:space-y-8">
  
      {/* Realtime Active Live Session Banner */}
      <StudentLiveBanner
        classroomId={id}
        enrollmentCode={classroom.enrollment_code}
        initialSession={activeLiveSession}
        isParticipant={isParticipant}
      />

      <div>
        <Link href="/student" className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-primary font-extrabold transition-all hover:-translate-x-1 mb-2 text-xs sm:text-sm">
          <ArrowLeft className="w-4 h-4" />
          <Translate fil="Bumalik sa Dashboard" en="Back to Dashboard" />
        </Link>
      </div>

      {/* Classroom Header Banner */}
      <div className="glass-strong rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 relative overflow-hidden shadow-xl">
        <div className="absolute top-1/2 right-10 w-48 h-48 bg-brand-accent/20 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/20 flex items-center justify-center shadow-md shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary " />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-800 ">{classroom.name}</h1>
              <p className="text-brand-primary font-extrabold text-xs sm:text-sm"><Translate fil="Guro" en="Educator" />: {classroom.profiles?.full_name}</p>
            </div>
          </div>
          <p className="text-slate-600 font-semibold max-w-2xl text-sm sm:text-base md:text-lg mt-3">{classroom.description || <Translate fil="Walang ibinigay na paglalarawan." en="No description provided." />}</p>
        </div>
      </div>

      {/* Student Classroom Standing & Grade Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-brand-primary/20 shadow-md relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-brand-primary" />
              <h2 className="text-xs font-black text-brand-primary uppercase tracking-wider">
                <Translate fil="Aking Katayuan sa Silid na Ito" en="My Standing in this Classroom" />
              </h2>
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-900">
              {summary.quizzesCompleted > 0 && tier ? (
                <span>{summary.averagePercentage}% • {tier.letter} ({tier.labelFil})</span>
              ) : (
                <span><Translate fil="Wala Pang Nakatalang Grado" en="No Grades Yet" /></span>
              )}
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">
              {summary.quizzesCompleted} sa {summary.totalQuizzes} na pagsusulit ang natapos ({summary.completionRate}%)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/student/performance?classroom=${id}`}
              className="px-5 py-2.5 bg-brand-primary hover:bg-slate-700 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-md transition-all flex items-center gap-1.5"
            >
              <Translate fil="Detalyadong Ulat ng Grado" en="Detailed Grade Report" />
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-brand-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${summary.completionRate}%` }}
          />
        </div>
      </div>

      {/* Classroom Announcements Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" />
            <Translate fil="Mga Anunsyo ng Guro" en="Classroom Announcements" />
            <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-xs font-black">
              {announcements.length}
            </span>
          </h2>
          <Link
            href="/student/notifications"
            className="text-xs font-extrabold text-brand-primary hover:underline flex items-center gap-1"
          >
            <Translate fil="Lahat ng Abiso" en="All Notifications" />
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {announcements.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {announcements.map((ann) => {
              const priorityStyles =
                ann.priority === 'urgent'
                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : ann.priority === 'important'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-violet-100 text-violet-800 border-violet-200'

              const priorityLabel =
                ann.priority === 'urgent'
                  ? '🚨 Apurahan / Urgent'
                  : ann.priority === 'important'
                  ? '⚡ Mahalaga / Important'
                  : '📢 Anunsyo ng Klase'

              return (
                <div
                  key={ann.id}
                  className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-violet-200/80 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-violet-50 border border-violet-200 text-violet-600 flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${priorityStyles}`}>
                          {priorityLabel}
                        </span>
                        {ann.educatorName && (
                          <span className="text-[11px] font-bold text-slate-600">
                            • Mula kay {ann.educatorName}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-slate-400">
                          • {new Date(ann.created_at).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-heading font-black text-slate-900">
                        {ann.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5 whitespace-pre-line leading-relaxed">
                        {ann.content}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center text-slate-500 font-semibold border border-slate-200/80 shadow-xs text-xs sm:text-sm">
            <Translate
              fil="Wala pang nakapaskil na anunsyo mula sa iyong guro sa silid na ito."
              en="No announcements posted by your teacher in this classroom yet."
            />
          </div>
        )}
      </div>

      {/* Available Quizzes Grid */}
      <div>
        <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-brand-primary flex items-center gap-2 mb-4 sm:mb-6">
          <span>🎮</span> <Translate fil="Mga May-akdang Pagsusulit" en="Available Quizzes" />
        </h2>

        {validQuizzes && validQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {validQuizzes.map((quiz) => {
              const qProg = summary.quizzes[quiz.id]
              const hasAttempted = qProg?.hasAttempted
              const qTier = qProg?.gradeTier

              const deadlineDate = quiz.scheduled_end ? new Date(quiz.scheduled_end) : null
              const isPastDue = deadlineDate ? deadlineDate.getTime() <= nowMs : false
              const isDueSoon = deadlineDate
                ? deadlineDate.getTime() > nowMs && deadlineDate.getTime() - nowMs <= 72 * 60 * 60 * 1000
                : false

              return (
                <div key={quiz.id} className="glass-strong card-hover rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/80 flex flex-col relative overflow-hidden group shadow-lg">
                  
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <h3 className="text-lg sm:text-xl font-heading font-extrabold text-slate-800 pr-2">{quiz.title}</h3>
                    {hasAttempted && qTier ? (
                      <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-black border shadow-xs shrink-0 ${qTier.badgeBg} ${qTier.badgeText} ${qTier.badgeBorder}`}>
                        ⭐ {qProg.bestScore}/{qProg.maxScore} ({qProg.bestPercentage}% • {qTier.letter})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] sm:text-xs font-black shrink-0">
                        ⏳ Hindi Pa Nasagutan
                      </span>
                    )}
                  </div>
                  
                  <p className="text-slate-600 text-xs sm:text-sm font-semibold mb-4 flex-1 line-clamp-2 relative z-10">{quiz.description}</p>

                  {deadlineDate && (
                    <div className={`mb-4 self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border relative z-10 ${
                      isPastDue && !hasAttempted
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isDueSoon && !hasAttempted
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isPastDue ? '⏰ Lampas sa Deadline: ' : isDueSoon ? '⏳ Malapit na Deadline: ' : '📅 Deadline: '}
                        {deadlineDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between relative z-10">
                    <div className="text-slate-500 font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                      <span>⏱️</span> {Math.floor(quiz.time_limit_seconds / 60)} min kada kard
                    </div>
                    
                    <Link href={`/student/quiz/${quiz.id}/play`} className="px-5 sm:px-6 py-2 sm:py-2.5 bg-brand-accent hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20">
                      <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                      {hasAttempted ? <Translate fil="Muling Maglaro" en="Play Again" /> : <Translate fil="Maglaro Na ➔" en="Play Now ➔" />}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="glass-strong rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center text-slate-600 font-semibold border border-white/80 shadow-lg text-xs sm:text-sm">
            <Translate fil="Wala pang nailalathalang pagsusulit sa silid-aralan na ito. Balikan sa ibang pagkakataon! 🎈" en="No published quizzes yet in this classroom. Check back later! 🎈" />
          </div>
        )}
      </div>

    </div>
  )
}
