import { createClient } from '@/lib/supabase/server'
import { StudentPerformanceClient } from '@/components/StudentPerformanceClient'

export default async function StudentPerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all attempts for this student
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes(title)')
    .eq('student_id', user?.id)
    .order('completed_at', { ascending: true })

  const validAttempts = attempts || []

  return <StudentPerformanceClient initialAttempts={validAttempts} />
}
