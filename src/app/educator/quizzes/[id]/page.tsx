import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, FileQuestion, Users, CheckCircle2 } from 'lucide-react'
import { Translate } from '@/components/Translate'

export default async function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch Quiz + Classroom Info
  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`
      *,
      classrooms ( id, name, enrollment_code )
    `)
    .eq('id', id)
    .eq('educator_id', user?.id)
    .single()

  if (!quiz) notFound()

  // 2. Fetch Cards
  const { data: cards } = await supabase
    .from('quiz_cards')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('order_index', { ascending: true })

  // 3. Fetch Attempts
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      profiles ( full_name, avatar_url )
    `)
    .eq('quiz_id', quiz.id)
    .order('score', { ascending: false })

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in relative">
      
      <Link href={quiz.classroom_id ? `/educator/classrooms/${quiz.classroom_id}` : "/educator"} className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-6 relative z-10 font-bold">
        <ArrowLeft className="w-4 h-4" />
        <Translate fil="Bumalik sa Silid-aralan" en="Back to Classroom" />
      </Link>

      <div className="bg-white rounded-3xl p-8 mb-8 border border-slate-200 shadow-md relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
         
         <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-heading font-bold text-slate-900">{quiz.title}</h1>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${quiz.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {quiz.is_published ? 'Nailathala' : 'Draft'}
                </span>
              </div>
              <p className="text-slate-600 max-w-2xl text-lg mb-4 font-medium">{quiz.description || 'Walang ibinigay na paglalarawan.'}</p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 font-bold">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {quiz.time_limit_seconds}s <Translate fil="bawat tanong" en="per question" />
                </div>
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-slate-400" />
                  {cards?.length || 0} <Translate fil="Kard" en="Cards" />
                </div>
                {quiz.classrooms && (
                  <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    <Translate fil="Silid" en="Room" />: <Link href={`/educator/classrooms/${quiz.classroom_id}`} className="text-brand-primary hover:underline">{quiz.classrooms.name}</Link>
                  </div>
                )}
              </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Col: Leaderboard / Attempts */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-primary" />
            <Translate fil="Nangungunang Iskor" en="Top Scores" />
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {attempts && attempts.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {attempts.map((attempt: any, i: number) => (
                  <li key={attempt.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 font-bold text-lg text-slate-600 flex items-center justify-center">
                        #{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-800 text-sm font-bold truncate">{attempt.profiles?.full_name}</p>
                        <p className="text-slate-500 text-xs font-medium">{new Date(attempt.completed_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-brand-primary font-black">{attempt.score} / {attempt.total_questions}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center bg-slate-50">
                <p className="text-slate-600 text-sm font-medium"><Translate fil="Wala pang nagtatangka." en="No attempts yet." /></p>
                {!quiz.is_published && <p className="text-amber-600 text-xs mt-2 font-bold"><Translate fil="I-publish ang pagsusulit para malaro ng mga mag-aaral." en="Publish the quiz so students can play." /></p>}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Cards Preview */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-brand-secondary" />
            <Translate fil="Preview ng Deck" en="Deck Preview" />
          </h2>

          {cards && cards.length > 0 ? (
            <div className="space-y-4">
              {cards.map((card, i) => (
                <div key={card.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-brand-secondary text-sm font-mono font-bold tracking-wider mb-2">
                    Kard {i + 1} • {card.question_type.replace('_', ' ')}
                  </div>
                  <h3 className="text-slate-900 text-lg font-bold mb-4">{card.question_text}</h3>
                  
                  {card.question_type === 'multiple_choice' && card.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {card.options.map((opt: string, idx: number) => (
                        <div key={idx} className={`px-4 py-3 rounded-lg text-sm flex items-center justify-between border font-bold ${card.correct_answer === idx ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                          <span>{opt}</span>
                          {card.correct_answer === idx && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        </div>
                      ))}
                    </div>
                  )}

                  {card.question_type === 'fill_blank' && (
                    <div className="mt-4">
                      <div className="px-4 py-2 bg-emerald-50 border border-emerald-500 text-emerald-700 rounded-lg text-sm inline-flex items-center gap-2 font-bold shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        {card.correct_answer}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 font-medium"><Translate fil="Wala pang nilikhang mga kard sa pagsusulit na ito." en="No cards in this quiz." /></p>
          )}

        </div>

      </div>
    </div>
  )
}
