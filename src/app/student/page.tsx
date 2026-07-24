import { createClient } from '@/lib/supabase/server'
import { Library, Users } from 'lucide-react'
import Link from 'next/link'
import { JoinClassroomForm } from '@/components/JoinClassroomForm'

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch enrolled classrooms
  const { data: enrollments, error } = await supabase
    .from('classroom_members')
    .select(`
      joined_at,
      classrooms (
        id,
        name,
        description,
        is_active,
        profiles!classrooms_educator_id_fkey ( full_name )
      )
    `)
    .eq('student_id', user?.id)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching enrollments:', error)
  } else {
    console.log('Enrollments data:', JSON.stringify(enrollments, null, 2))
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in relative z-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Join Classroom Card */}
        <div className="lg:col-span-1 glass-strong rounded-3xl p-8 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/20 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
          
          <h2 className="text-xl font-heading font-bold text-white mb-2 relative z-10">Join a Classroom</h2>
          <p className="text-slate-400 text-sm mb-6 relative z-10">Got an enrollment code from your teacher?</p>
          
          <div className="relative z-10">
            <JoinClassroomForm />
          </div>
        </div>

        {/* Welcome / Stats Banner */}
        <div className="lg:col-span-2 glass rounded-3xl p-8 border border-white/5 bg-gradient-to-br from-slate-800/80 to-slate-900/80 flex flex-col justify-center">
           <h2 className="text-3xl font-heading font-bold text-white mb-2">Ready to learn?</h2>
           <p className="text-slate-400">Select a classroom below to see your tasks and play quizzes.</p>
           
           <div className="flex gap-6 mt-6">
             <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Enrolled Rooms</p>
                <p className="text-2xl font-bold text-white">{enrollments?.length || 0}</p>
             </div>
           </div>
        </div>
      </div>

      <h2 className="text-xl font-heading font-bold text-white mb-6">My Classrooms</h2>

      {enrollments && enrollments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment: any) => {
            const classroom = enrollment.classrooms
            if (!classroom) return null;
            
            return (
              <Link key={classroom.id} href={`/student/classrooms/${classroom.id}`} className="glass card-hover rounded-2xl p-6 flex flex-col relative overflow-hidden group border border-white/5">
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <h3 className="text-xl font-heading font-bold text-white truncate pr-4">{classroom.name}</h3>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 ${classroom.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {classroom.is_active ? 'Active' : 'Archived'}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-6 line-clamp-2 relative z-10 flex-1">{classroom.description || 'No description provided.'}</p>
                
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-sm relative z-10">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Library className="w-4 h-4" />
                    <span>{classroom.profiles?.full_name || 'Educator'}</span>
                  </div>
                  <span className="text-brand-accent group-hover:translate-x-1 transition-transform">Enter →</span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="glass-subtle rounded-3xl p-12 text-center flex flex-col items-center justify-center">
          <Library className="w-12 h-12 text-slate-500 mb-4" />
          <h3 className="text-xl font-heading font-semibold text-white mb-2">No classrooms yet</h3>
          <p className="text-slate-400 max-w-md mx-auto">Use the form above to join your first classroom using the code provided by your educator.</p>
        </div>
      )}

    </div>
  )
}
