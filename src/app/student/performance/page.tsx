import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudentPerformanceClient } from '@/components/StudentPerformanceClient'

export default async function StudentPerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 1. Fetch all attempts for this student with quiz & classroom details
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      quizzes (
        id,
        title,
        classroom_id,
        classrooms (
          id,
          name
        )
      )
    `)
    .eq('student_id', user.id)
    .order('completed_at', { ascending: true })

  // 2. Fetch all enrolled classrooms with teacher info and published quizzes
  const { data: enrollments } = await supabase
    .from('classroom_members')
    .select(`
      joined_at,
      classrooms (
        id,
        name,
        description,
        profiles!classrooms_educator_id_fkey (
          full_name
        ),
        quizzes (
          id,
          title,
          is_published,
          time_limit_seconds
        )
      )
    `)
    .eq('student_id', user.id)
    .order('joined_at', { ascending: false })

  const validClassrooms = enrollments
    ?.map(e => e.classrooms)
    .filter(Boolean) as any[] || []

  return (
    <StudentPerformanceClient 
      initialAttempts={attempts || []} 
      enrolledClassrooms={validClassrooms}
    />
  )
}
