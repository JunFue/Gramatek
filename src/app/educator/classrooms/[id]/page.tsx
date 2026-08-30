import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClassroomManagerClient } from '@/components/ClassroomManagerClient'

export default async function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    .eq('educator_id', user?.id)
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

  return (
    <ClassroomManagerClient 
      classroom={classroom} 
      quizzes={quizzes || []} 
    />
  )
}

