import { createClient } from '@/lib/supabase/server'
import { Library } from 'lucide-react'
import Link from 'next/link'
import { JoinClassroomForm } from '@/components/JoinClassroomForm'
import { Translate } from '@/components/Translate'

export default async function StudentDashboard() {
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()

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
 }

 return (
 <div className="p-8 max-w-6xl mx-auto animate-fade-in relative z-10">
 
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
 {/* Join Classroom Card */}
 <div className="lg:col-span-1 card p-8 relative overflow-hidden">
 <div className="flex items-center gap-2 mb-2">
 <span className="text-xl">🔑</span>
 <h2 className="text-xl font-heading font-extrabold text-brand-primary">
 <Translate fil="Pumaloob sa Silid" en="Join Classroom" />
 </h2>
 </div>
 <p className="text-[#5a6b5a] text-sm font-semibold mb-6"><Translate fil="Mayroon ka bang kodigo mula sa iyong guro?" en="Do you have a code from your educator?" /></p>
 <JoinClassroomForm />
 </div>

 {/* Welcome / Stats Banner */}
 <div className="lg:col-span-2 rounded-2xl p-8 bg-brand-primary text-white flex flex-col justify-center shadow-md relative overflow-hidden">

 <div className="flex items-center gap-2 mb-2">
 <span className="badge-active bg-brand-light/20 border-brand-light/40 text-brand-light">
 <Translate fil="Maligayang Pagdating!" en="Welcome!" />
 </span>
 </div>

 <h2 className="text-3xl md:text-4xl font-heading font-black mb-2 text-white"><Translate fil="Handa ka na bang matuto?" en="Ready to learn?" /></h2>
 <p className="text-white/70 font-semibold"><Translate fil="Pumili ng silid-aralan sa ibaba upang makita ang iyong mga gawain at maglaro!" en="Select a classroom below to view your tasks and play!" /></p>
 
 <div className="flex gap-6 mt-6">
 <div className="bg-white/10 rounded-2xl px-5 py-3 border border-white/20">
 <p className="text-white/60 text-xs font-extrabold uppercase tracking-wider mb-1">
 <Translate fil="Nilahukang Silid" en="Enrolled Rooms" />
 </p>
 <p className="text-3xl font-extrabold text-white">{enrollments?.length || 0}</p>
 </div>
 </div>
 </div>
 </div>

 <div className="mb-6">
 <h2 className="text-2xl font-heading font-black text-brand-primary">
 <Translate fil="Aking mga Silid-aralan" en="My Classrooms" />
 </h2>
 </div>

 {enrollments && enrollments.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {enrollments.map((enrollment: any) => {
 const classroom = enrollment.classrooms
 if (!classroom) return null;
 
 return (
 <Link key={classroom.id} href={`/student/classrooms/${classroom.id}`} className="card-hover p-6 flex flex-col group">
 <div className="flex justify-between items-start mb-4">
 <h3 className="text-xl font-heading font-extrabold text-brand-primary truncate pr-4">{classroom.name}</h3>
 <span className={classroom.is_active ? 'badge-active' : 'badge-inactive'}>
 {classroom.is_active ? <Translate fil="Aktibo" en="Active" /> : <Translate fil="Naka-archive" en="Archived" />}
 </span>
 </div>
 <p className="text-[#5a6b5a] text-sm font-semibold mb-6 line-clamp-2 flex-1">{classroom.description || <Translate fil="Walang paglalarawan." en="No description." />}</p>
 
 <div className="pt-4 border-t border-[#d4ddd0] flex items-center justify-between text-sm">
 <div className="flex items-center gap-2 text-[#5a6b5a] font-bold">
 <Library className="w-4 h-4 text-brand-secondary" />
 <span className="truncate max-w-[140px]">{classroom.profiles?.full_name || <Translate fil="Guro" en="Educator" />}</span>
 </div>
 <span className="text-brand-primary font-black group-hover:translate-x-1 transition-transform flex items-center gap-1"><Translate fil="Pumasok" en="Enter" /> →</span>
 </div>
 </Link>
 )
 })}
 </div>
 ) : (
 <div className="card p-12 text-center flex flex-col items-center justify-center">
 <div className="w-16 h-16 rounded-full bg-brand-light/30 flex items-center justify-center mb-4">
 <Library className="w-8 h-8 text-brand-primary" />
 </div>
 <h3 className="text-xl font-heading font-extrabold text-brand-primary mb-2">
 <Translate fil="Wala pang silid-aralan" en="No classrooms yet" />
 </h3>
 <p className="text-[#5a6b5a] max-w-md mx-auto font-semibold"><Translate fil="Gamitin ang pormularyo sa itaas upang pumasok sa iyong unang silid-aralan gamit ang kodigo mula sa iyong guro." en="Use the form above to join your first classroom using the code from your educator." /></p>
 </div>
 )}

 </div>
 )
}
