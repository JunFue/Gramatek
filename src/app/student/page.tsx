import { createClient } from '@/lib/supabase/server'
import { Library, Users } from 'lucide-react'
import Link from 'next/link'
import { JoinClassroomForm } from '@/components/JoinClassroomForm'
import { Translate } from '@/components/Translate'

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
 <div className="lg:col-span-1 glass-strong rounded-3xl p-8 border border-white/80 relative overflow-hidden shadow-xl transition-all hover:scale-[1.01]">
 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/20 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
 
 <div className="flex items-center gap-2 mb-2">
 <span className="text-xl">🔑</span>
 <h2 className="text-xl font-heading font-extrabold text-brand-primary ">
 <Translate fil="Pumaloob sa Silid" en="Join Classroom" />
 </h2>
 </div>
 <p className="text-slate-600 text-sm font-semibold mb-6 relative z-10">Mayroon ka bang kodigo mula sa iyong guro?</p>
 
 <div className="relative z-10">
 <JoinClassroomForm />
 </div>
 </div>

 {/* Welcome / Stats Banner */}
 <div className="lg:col-span-2 rounded-3xl p-8 bg-gradient-to-br from-slate-900 via-brand-primary to-slate-900 text-white flex flex-col justify-center shadow-2xl relative overflow-hidden border border-brand-primary/40">
 <div className="absolute -top-10 -right-10 w-64 h-64 bg-brand-secondary/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
 
 <div className="flex items-center gap-2 mb-2">
 <span className="px-3 py-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 font-extrabold text-xs rounded-full uppercase tracking-wider">
 ★ Maligayang Pagdating!
 </span>
 </div>

 <h2 className="text-3xl md:text-4xl font-heading font-black mb-2 text-white relative z-10">Handa ka na bang matuto? 🚀</h2>
 <p className="text-blue-100 font-semibold relative z-10">Pumili ng silid-aralan sa ibaba upang makita ang iyong mga gawain at maglaro!</p>
 
 <div className="flex gap-6 mt-6 relative z-10">
 <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20">
 <p className="text-blue-200 text-xs font-extrabold uppercase tracking-wider mb-1">
 <Translate fil="Nilahukang Silid" en="Enrolled Rooms" />
 </p>
 <p className="text-3xl font-extrabold text-white">{enrollments?.length || 0}</p>
 </div>
 </div>
 </div>
 </div>

 <h2 className="text-2xl font-heading font-extrabold text-brand-primary mb-6 flex items-center gap-2">
 <span>📚</span> <Translate fil="Aking mga Silid-aralan" en="My Classrooms" />
 </h2>

 {enrollments && enrollments.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {enrollments.map((enrollment: any) => {
 const classroom = enrollment.classrooms
 if (!classroom) return null;
 
 return (
 <Link key={classroom.id} href={`/student/classrooms/${classroom.id}`} className="glass-strong card-hover rounded-3xl p-6 flex flex-col relative overflow-hidden group border border-white/80 shadow-lg">
 <div className="flex justify-between items-start mb-4 relative z-10">
 <h3 className="text-xl font-heading font-extrabold text-slate-800 truncate pr-4">{classroom.name}</h3>
 <span className={`px-3 py-1 rounded-full text-xs font-extrabold shrink-0 shadow-sm ${classroom.is_active ? 'bg-emerald-100 text-emerald-700 border border-emerald-300/40' : 'bg-slate-100 text-slate-600 '}`}>
 {classroom.is_active ? '● Aktibo' : 'Naka-archive'}
 </span>
 </div>
 <p className="text-slate-600 text-sm font-semibold mb-6 line-clamp-2 relative z-10 flex-1">{classroom.description || 'Walang paglalarawan.'}</p>
 
 <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between text-sm relative z-10">
 <div className="flex items-center gap-2 text-slate-700 font-bold">
 <Library className="w-4 h-4 text-brand-primary " />
 <span className="truncate max-w-[140px]">{classroom.profiles?.full_name || 'Guro'}</span>
 </div>
 <span className="text-brand-secondary font-black group-hover:translate-x-1 transition-transform flex items-center gap-1">Pumasok ➔</span>
 </div>
 </Link>
 )
 })}
 </div>
 ) : (
 <div className="glass-strong rounded-3xl p-12 text-center flex flex-col items-center justify-center border border-white/80 shadow-lg">
 <div className="w-16 h-16 rounded-full bg-brand-secondary/10 flex items-center justify-center mb-4">
 <Library className="w-8 h-8 text-brand-secondary" />
 </div>
 <h3 className="text-xl font-heading font-extrabold text-slate-800 mb-2">
 <Translate fil="Wala pang silid-aralan" en="No classrooms yet" />
 </h3>
 <p className="text-slate-600 max-w-md mx-auto font-semibold">Gamitin ang pormularyo sa itaas upang pumasok sa iyong unang silid-aralan gamit ang kodigo mula sa iyong guro.</p>
 </div>
 )}

 </div>
 )
}

