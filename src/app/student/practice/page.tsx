'use client'

import { useState, useEffect } from 'react'
import { ALAM_MO_BA_FACTS, PREBUILT_QUIZZES } from '@/lib/data/filipino-trivia'
import Link from 'next/link'
import { Play, Trophy, Zap, Lock, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Translate } from '@/components/Translate'

export default function PracticeHub() {
 const router = useRouter()
 const [completed, setCompleted] = useState<Record<string, boolean>>({})
 const [selectedMode, setSelectedMode] = useState<'mastery' | 'survival'>('mastery')

 useEffect(() => {
 // Load completion states from localStorage
 const state: Record<string, boolean> = {};
 PREBUILT_QUIZZES.forEach(q => {
 if (localStorage.getItem(`completed_${q.id}`) === 'true') {
 state[q.id] = true;
 }
 })
 setCompleted(state)
 }, [])

 return (
 <div className="p-8 max-w-6xl mx-auto space-y-12 pb-24 text-slate-900 transition-colors duration-300">
 
 <div className="text-center relative z-10 space-y-4">
 <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 font-extrabold text-xs tracking-wider uppercase border border-amber-200 shadow-sm animate-bounce">
 🎯 <Translate fil="Pagsasanay at Laro" en="Practice and Play" />
 </span>
 <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-slate-900">
 <Translate fil="Mga Palarong" en="Ready" /> <span className="text-brand-primary"><Translate fil="Handa 🎮" en="Games 🎮" /></span>
 </h1>
 <p className="text-xl text-slate-600 max-w-2xl mx-auto font-semibold">
 <Translate fil="Himaymin ang yaman ng wikang Filipino. Tapusin ang Antas 1 upang makapunta sa susunod na antas!" en="Explore the richness of the Filipino language. Complete Level 1 to unlock the next level!" />
 </p>
 </div>

 {/* Alam Mo Ba - Random Fact */}
 <div className="bg-white rounded-3xl p-8 border-2 border-brand-primary/20 relative overflow-hidden shadow-xl">
 <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
 <h3 className="text-brand-primary font-black tracking-widest text-xs uppercase mb-4 flex items-center gap-2">
 <span>💡</span> <Translate fil="KAUNTING KAALAMAN: ALAM MO BA?" en="TRIVIA: DID YOU KNOW?" />
 </h3>
 <p className="text-xl font-heading font-bold text-slate-800 leading-relaxed md:w-4/5">
 {ALAM_MO_BA_FACTS[Math.floor(Math.random() * ALAM_MO_BA_FACTS.length)].split(' – ').map((part, i) => (
 <span key={i}>{i===0 ? <strong>{part}</strong> : ` – ${part}`}</span>
 ))}
 </p>
 </div>

 {/* Game Mode Selector */}
 <div className="flex flex-col items-center">
 <div className="bg-white p-2 rounded-2xl flex items-center shadow-md border border-slate-200 gap-2">
 <button 
 onClick={() => setSelectedMode('mastery')}
 className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${selectedMode === 'mastery' ? 'bg-amber-500 text-white shadow-md scale-105' : 'text-slate-500 hover:bg-slate-50 '}`}
 >
 <Trophy className="w-5 h-5" /> <Translate fil="Mode ng Masteriya" en="Mastery Mode" />
 </button>
 <button 
 onClick={() => setSelectedMode('survival')}
 className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${selectedMode === 'survival' ? 'bg-rose-500 text-white shadow-md scale-105' : 'text-slate-500 hover:bg-slate-50 '}`}
 >
 <Zap className="w-5 h-5" /> <Translate fil="Mode ng Kaligtasan" en="Survival Mode" />
 </button>
 </div>
 </div>

 {/* Levels */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {PREBUILT_QUIZZES.map((quiz, index) => {
 const isUnlocked = index === 0 || completed[PREBUILT_QUIZZES[index - 1].id];
 const isCompleted = completed[quiz.id];

 return (
 <div key={quiz.id} className={`rounded-3xl p-8 border-2 flex flex-col relative overflow-hidden transition-all duration-300 ${isUnlocked ? 'bg-white shadow-lg hover:-translate-y-2 hover:scale-[1.02] hover:shadow-xl border-slate-200 ' : 'bg-slate-50 border-slate-200 grayscale opacity-70'}`}>
 
 {isCompleted && (
 <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1 rounded-full shadow-md z-20 animate-pulse">
 <CheckCircle2 className="w-6 h-6" />
 </div>
 )}

 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${isUnlocked ? 'bg-linear-to-tr from-brand-primary to-brand-secondary text-white' : 'bg-slate-200 text-slate-500'}`}>
 <span className="text-2xl font-black">{index + 1}</span>
 </div>
 
 <h3 className="text-2xl font-heading font-extrabold text-slate-900 mb-2">{quiz.title}</h3>
 <p className="text-slate-600 font-semibold mb-8 flex-1">{quiz.description}</p>
 
 {isUnlocked ? (
 <Link href={`/student/practice/${quiz.id}?mode=${selectedMode}`} className="w-full py-4 rounded-2xl bg-brand-primary hover:bg-blue-600 text-white font-extrabold text-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 group">
 <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" /> <Translate fil="Maglaro Na" en="Play Now" /> ➔
 </Link>
 ) : (
 <button disabled className="w-full py-4 rounded-2xl bg-slate-100 text-slate-400 font-extrabold text-lg flex items-center justify-center gap-2 cursor-not-allowed">
 <Lock className="w-5 h-5" /> <Translate fil="Nakakandado" en="Locked" />
 </button>
 )}
 </div>
 )
 })}
 </div>

 </div>
 )
}
