import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { Translate } from '@/components/Translate'

export default async function ClassroomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*, classroom_members(count)')
    .eq('educator_id', user?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 mb-2"><Translate fil="Aking mga Silid-aralan" en="My Classrooms" /></h1>
          <p className="text-slate-600">Pamahalaan ang lahat ng iyong aktibo at naka-archive na silid-aralan.</p>
        </div>
        <Link href="/educator/classrooms/new" className="px-6 py-3 bg-brand-primary hover:bg-slate-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shrink-0 self-start md:self-auto">
          <Plus className="w-5 h-5" />
          <Translate fil="Gumawa ng Silid-aralan" en="Create Classroom" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms && classrooms.length > 0 ? (
          classrooms.map((classroom) => (
            <Link key={classroom.id} href={`/educator/classrooms/${classroom.id}`} className="bg-white border border-slate-200 hover:border-brand-primary/50 rounded-2xl p-6 flex flex-col relative overflow-hidden group shadow-md transition-all">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-2xl font-heading font-bold text-slate-900 truncate pr-4">{classroom.name}</h3>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${classroom.is_active ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                  {classroom.is_active ? 'Aktibo' : 'Naka-archive'}
                </span>
              </div>
              <p className="text-slate-600 text-sm mb-6 line-clamp-2 relative z-10 flex-1 font-medium">{classroom.description || 'Walang paglalarawan.'}</p>
              
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Users className="w-4 h-4 text-brand-primary" />
                    <span>{classroom.classroom_members?.[0]?.count || 0} / {classroom.enrollment_limit} <Translate fil="Mag-aaral" en="Students" /></span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 font-bold">Kodigo: {classroom.enrollment_code}</span>
                  <span className="text-brand-primary font-bold group-hover:translate-x-1 transition-transform"><Translate fil="Tingnan" en="View Hub" /> →</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-md">
             <p className="text-slate-600 mb-4 font-medium"><Translate fil="Wala ka pang nalilikhang mga silid-aralan." en="You haven't created any classrooms yet." /></p>
             <Link href="/educator/classrooms/new" className="text-brand-primary font-bold hover:underline"><Translate fil="Lumikha ng iyong una" en="Create your first one" /></Link>
          </div>
        )}
      </div>

    </div>
  )
}
