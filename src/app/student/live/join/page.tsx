import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudentJoinFormClient } from './StudentJoinFormClient'

export default async function StudentLiveJoinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Fetch enrolled classrooms to offer quick joining
  const { data: classrooms } = await supabase
    .from('classroom_members')
    .select(`
      classroom_id,
      classrooms (
        id,
        name,
        enrollment_code
      )
    `)
    .eq('student_id', user.id)

  const list = classrooms?.map((c: any) => c.classrooms).filter(Boolean) || []

  return (
    <div className="p-6 md:p-12 max-w-xl mx-auto animate-fade-in">
      <StudentJoinFormClient classrooms={list} />
    </div>
  )
}
