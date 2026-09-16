import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ClassroomManagerClient } from '@/components/ClassroomManagerClient'

export default async function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 1. Fetch Classroom details with members and profiles
  const { data: classroom } = await supabase
    .from('classrooms')
    .select(`
      *,
      members:classroom_members (
        student_id,
        joined_at,
        profiles ( full_name, avatar_url )
      )
    `)
    .eq('id', id)
    .eq('educator_id', user.id)
    .single()

  if (!classroom) {
    notFound()
  }

  // 2. Fetch quizzes for this classroom
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, is_published, time_limit_seconds, created_at')
    .eq('classroom_id', id)
    .order('created_at', { ascending: false })

  const quizList = quizzes || []
  const quizIds = quizList.map(q => q.id)

  // 3. Fetch all attempts for quizzes in this classroom
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
        )
      `)
      .in('quiz_id', quizIds)
      .order('completed_at', { ascending: false })

    attempts = rawAttempts || []
  }

  // 4. Fetch past live sessions in this classroom
  const { data: liveSessions, error: lsErr } = await supabase
    .from('live_sessions')
    .select(`
      id,
      code,
      mode,
      status,
      created_at,
      live_session_participants (
        student_id,
        total_score,
        removed_at
      )
    `)
    .eq('classroom_id', id)
    .order('created_at', { ascending: false })

  if (lsErr) {
    console.error('Error fetching live sessions:', lsErr)
  }

  return (
    <ClassroomManagerClient 
      classroom={classroom} 
      quizzes={quizList}
      attempts={attempts}
      liveSessions={liveSessions || []}
    />
  )
}
