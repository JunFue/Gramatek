import { createClient } from '@/lib/supabase/server'
import { Library } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { JoinClassroomForm } from '@/components/JoinClassroomForm'
import { TriviaSlideshow } from '@/components/TriviaSlideshow'
import { Translate } from '@/components/Translate'
import { StudentActiveSessionList } from '@/components/live/StudentActiveSessionList'

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  let enrollments: any[] = []
  if (user?.id) {
    const { data, error } = await supabase
      .from('classroom_members')
      .select(`
        classroom_id,
        joined_at,
        classrooms (
          id,
          name,
          description,
          is_active,
          enrollment_code,
          profiles!classrooms_educator_id_fkey ( full_name )
        )
      `)
      .eq('student_id', user.id)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching enrollments:', error.message || error)
    } else {
      enrollments = data
    }
  }

  // Fetch active live sessions for all enrolled classrooms
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  let activeLiveSessions: any[] = []
  if (enrollments && enrollments.length > 0 && user?.id) {
    const classroomIds = enrollments.map((e: any) => e.classrooms?.id).filter(Boolean)
    if (classroomIds.length > 0) {
      const { data: liveData } = await supabase
        .from('live_sessions')
        .select(`
          id,
          status,
          mode,
          classroom_id,
          classrooms ( id, name, enrollment_code ),
          live_session_participants ( student_id, removed_at )
        `)
        .in('classroom_id', classroomIds)
        .in('status', ['lobby', 'question', 'reveal'])
        .gte('created_at', twelveHoursAgo)
        .order('created_at', { ascending: false })

      activeLiveSessions = liveData || []
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in relative z-10 space-y-6 sm:space-y-8 md:space-y-10">
      
      {/* Active Live Session Alert Banner for Students */}
      <StudentActiveSessionList
        initialSessions={activeLiveSessions}
        currentUserId={user.id}
      />

      {/* Top Row: Join Classroom & Welcome Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Join Classroom Card */}
        <div className="lg:col-span-1 card p-5 sm:p-8 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔑</span>
              <h2 className="text-xl font-heading font-extrabold text-brand-primary">
                <Translate fil="Pumaloob sa Silid" en="Join Classroom" />
              </h2>
            </div>
            <p className="text-[#5a6b5a] text-sm font-semibold mb-6">
              <Translate fil="Mayroon ka bang kodigo mula sa iyong guro?" en="Do you have a code from your educator?" />
            </p>
          </div>
          <JoinClassroomForm />
        </div>

        {/* Welcome / Stats Banner */}
        <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl p-5 sm:p-8 bg-brand-primary text-white flex flex-col justify-center shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-active bg-brand-light/20 border-brand-light/40 text-brand-light">
              <Translate fil="Maligayang Pagdating!" en="Welcome!" />
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black mb-2 text-white">
            <Translate fil="Handa ka na bang maglaro at matuto?" en="Ready to play and learn?" />
          </h2>
          <p className="text-white/80 font-medium max-w-xl text-xs sm:text-sm md:text-base leading-relaxed">
            <Translate 
              fil="Subukan ang built-in 3-antas na laro kahit hindi pa nakatala sa silid-aralan! Ang iyong mga iskor ay awtomatikong maibibilang sa iyong pag-unlad." 
              en="Try the built-in 3-level game even before joining a classroom! Your scores will be automatically tracked in your performance." 
            />
          </p>
          
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-6">
            <Link 
              href="/student/practice" 
              className="px-5 sm:px-6 py-3 bg-brand-light text-brand-primary hover:bg-white rounded-xl font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <span>🎮 <Translate fil="Maglaro ng Palarong Handa (3 Antas)" en="Play Built-in Games (3 Levels)" /></span> ➔
            </Link>

            <div className="bg-white/10 rounded-xl px-3.5 py-2 border border-white/20 flex items-center gap-2.5">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider">
                <Translate fil="Nilahukang Silid" en="Enrolled Rooms" />:
              </p>
              <p className="text-lg sm:text-xl font-black text-white">{enrollments?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Trivia & Facts Slideshow (ALAM MO BA?) */}
      <TriviaSlideshow />

      {/* Built-in Practice Game Feature Showcase */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-amber-50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 border-brand-primary/20 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h3 className="text-lg sm:text-xl font-heading font-black text-brand-primary">
                <Translate fil="Palarong Handa ng Gramatek" en="Gramatek Built-in Games" />
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black uppercase">
                3 Antas
              </span>
            </div>
            <p className="text-[#5a6b5a] text-xs sm:text-sm font-semibold max-w-2xl leading-relaxed">
              <Translate 
                fil="Matuto ng Talasalitaan, Punan ang Patlang, at Ayusin ang mga Pangungusap. Tapusin ang bawat antas upang mabuksan ang susunod!" 
                en="Master Vocabulary, Fill-in-the-blanks, and Sentence Unscrambling. Complete each level to unlock the next!" 
              />
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-xs">
                Antas 1: Talasalitaan (15 aytem • 15 pts)
              </span>
              <span className="px-2.5 py-1 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-xs">
                Antas 2: Pagpupuno (10 aytem • 20 pts)
              </span>
              <span className="px-2.5 py-1 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-xs">
                Antas 3: Pagbuo (5 aytem • 15 pts)
              </span>
            </div>
          </div>
          
          <Link 
            href="/student/practice" 
            className="px-6 py-3 bg-brand-primary hover:bg-slate-600 text-white rounded-xl font-extrabold text-sm transition-all shadow-md active:scale-95 text-center shrink-0 flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Translate fil="Pumunta sa Pagsasanay" en="Go to Practice" /> ➔
          </Link>
        </div>
      </div>

      {/* Classrooms Section */}
      <div>
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-heading font-black text-brand-primary">
            <Translate fil="Aking mga Silid-aralan" en="My Classrooms" />
          </h2>
        </div>

        {enrollments && enrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {enrollments.map((enrollment: any) => {
              const classroom = enrollment.classrooms
              if (!classroom) return null;
              
              return (
                <Link key={classroom.id} href={`/student/classrooms/${classroom.id}`} className="card-hover p-5 sm:p-6 flex flex-col group">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg sm:text-xl font-heading font-extrabold text-brand-primary truncate pr-3">{classroom.name}</h3>
                    <span className={classroom.is_active ? 'badge-active' : 'badge-inactive'}>
                      {classroom.is_active ? <Translate fil="Aktibo" en="Active" /> : <Translate fil="Naka-archive" en="Archived" />}
                    </span>
                  </div>
                  <p className="text-[#5a6b5a] text-sm font-semibold mb-6 line-clamp-2 flex-1">{classroom.description || <Translate fil="Walang paglalarawan." en="No description." />}</p>
                  
                  <div className="pt-4 border-t border-[#d4ddd0] flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[#5a6b5a] font-bold">
                      <Library className="w-4 h-4 text-brand-secondary shrink-0" />
                      <span className="truncate max-w-[140px]">{classroom.profiles?.full_name || <Translate fil="Guro" en="Educator" />}</span>
                    </div>
                    <span className="text-brand-primary font-black group-hover:translate-x-1 transition-transform flex items-center gap-1"><Translate fil="Pumasok" en="Enter" /> →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="card p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-light/30 flex items-center justify-center mb-4">
              <Library className="w-7 h-7 sm:w-8 sm:h-8 text-brand-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-heading font-extrabold text-brand-primary mb-2">
              <Translate fil="Wala pang silid-aralan" en="No classrooms yet" />
            </h3>
            <p className="text-[#5a6b5a] max-w-md mx-auto font-semibold text-xs sm:text-sm">
              <Translate 
                fil="Gamitin ang pormularyo sa itaas upang pumasok sa iyong unang silid-aralan gamit ang kodigo mula sa iyong guro." 
                en="Use the form above to join your first classroom using the code from your educator." 
              />
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
