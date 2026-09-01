import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EducatorAnalyticsClient } from '@/components/EducatorAnalyticsClient'

export default async function EducatorAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 1. Fetch all classrooms for this educator with members (and profiles) & quizzes
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select(`
      id,
      name,
      enrollment_code,
      created_at,
      classroom_members (
        student_id,
        joined_at,
        profiles (
          full_name,
          avatar_url
        )
      ),
      quizzes (
        id,
        title,
        is_published,
        created_at
      )
    `)
    .eq('educator_id', user.id)
    .order('created_at', { ascending: false })

  // 2. Fetch all quizzes owned by this educator to get their IDs
  const { data: educatorQuizzes } = await supabase
    .from('quizzes')
    .select('id')
    .eq('educator_id', user.id)

  const quizIds = educatorQuizzes?.map(q => q.id) || []

  // 3. Fetch all attempts for quizzes owned by this educator
  let attempts: any[] = []
  if (quizIds.length > 0) {
    const { data: rawAttempts } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        quiz_id,
        student_id,
        score,
        total_questions,
        time_taken_seconds,
        completed_at,
        streak_max,
        profiles (
          full_name,
          avatar_url
        ),
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
      .in('quiz_id', quizIds)
      .order('completed_at', { ascending: false })

    attempts = rawAttempts || []
  }

  return (
    <EducatorAnalyticsClient
      classrooms={classrooms || []}
      attempts={attempts}
    />
  )
}
