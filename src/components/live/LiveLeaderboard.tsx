'use client'

import { useState, useEffect, useRef } from 'react'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { Trophy, Medal, Crown, Users, User, Lock, ArrowUp, ArrowDown } from 'lucide-react'
import { Translate } from '@/components/Translate'
import { LeaderboardEntry } from '@/types/live-session'

interface LiveLeaderboardProps {
  sessionId: string
  mode?: 'individual' | 'group'
  revealMode?: string
  resultsRevealedAt?: string | null
  isHost?: boolean
  currentUserId?: string
  limit?: number
  compact?: boolean
  leaderboardData?: LeaderboardEntry[]
}

export function LiveLeaderboard({
  sessionId,
  mode = 'individual',
  revealMode = 'auto_per_question',
  resultsRevealedAt = null,
  isHost = false,
  currentUserId,
  limit,
  compact = false,
  leaderboardData
}: LiveLeaderboardProps) {
  const hookResult = useLeaderboard(
    leaderboardData ? '' : sessionId,
    mode,
    revealMode,
    resultsRevealedAt,
    isHost
  )

  const leaderboard = leaderboardData || hookResult.leaderboard
  const isLeaderboardVisible = leaderboardData ? true : hookResult.isLeaderboardVisible
  const loading = leaderboardData ? false : hookResult.loading

  // Real-time rank change & score gain tracking
  const prevRanksRef = useRef<Map<string, number>>(new Map())
  const prevScoresRef = useRef<Map<string, number>>(new Map())
  const [rankDeltas, setRankDeltas] = useState<Map<string, number>>(new Map())
  const [scoreGains, setScoreGains] = useState<Map<string, number>>(new Map())
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!leaderboard || leaderboard.length === 0) return

    const newDeltas = new Map<string, number>()
    const newGains = new Map<string, number>()
    const updated = new Set<string>()

    leaderboard.forEach((entry, idx) => {
      const currentRank = idx + 1
      const prevRank = prevRanksRef.current.get(entry.id)
      const prevScore = prevScoresRef.current.get(entry.id)

      if (prevRank !== undefined) {
        const rankDiff = prevRank - currentRank // positive = climbed up, negative = dropped
        if (rankDiff !== 0) {
          newDeltas.set(entry.id, rankDiff)
          updated.add(entry.id)
        }
      }

      if (prevScore !== undefined && entry.score > prevScore) {
        newGains.set(entry.id, entry.score - prevScore)
        updated.add(entry.id)
      }

      prevRanksRef.current.set(entry.id, currentRank)
      prevScoresRef.current.set(entry.id, entry.score)
    })

    if (updated.size > 0) {
      setRankDeltas(newDeltas)
      setScoreGains(newGains)
      setRecentlyUpdatedIds(updated)

      const timer = setTimeout(() => {
        setRecentlyUpdatedIds(new Set())
        setRankDeltas(new Map())
        setScoreGains(new Map())
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [leaderboard])

  if (!isLeaderboardVisible) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="font-heading font-black text-slate-800 text-lg mb-1">
          <Translate fil="Nakatago ang Talaan ng Marka" en="Leaderboard Hidden" />
        </h3>
        <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
          <Translate
            fil="Ipapakita ang buong resulta at talaan ng marka sa pagtatapos ng sesyon."
            en="The complete results and leaderboard will be revealed at the end of the session."
          />
        </p>
      </div>
    )
  }

  const displayedList = limit ? leaderboard.slice(0, limit) : leaderboard

  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-md">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-slate-900 text-lg leading-tight">
              <Translate fil="Talaan ng Marka" en="Leaderboard" />
            </h3>
            <p className="text-[11px] font-bold text-slate-500">
              {mode === 'group' ? (
                <Translate fil="Marka ng mga Pangkat" en="Group Standings" />
              ) : (
                <Translate fil="Marka ng mga Mag-aaral" en="Individual Standings" />
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Translate fil="Realtime" en="Realtime" />
          </span>
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-black">
            {leaderboard.length} {mode === 'group' ? 'pangkat' : 'kalahok'}
          </span>
        </div>
      </div>

      {loading && leaderboard.length === 0 ? (
        <div className="py-8 text-center text-slate-400 font-bold text-sm animate-pulse">
          <Translate fil="Kinukuha ang mga marka..." en="Loading leaderboard..." />
        </div>
      ) : displayedList.length === 0 ? (
        <div className="py-8 text-center text-slate-400 font-medium text-sm">
          <Translate fil="Wala pang nakuhang puntos." en="No scores recorded yet." />
        </div>
      ) : (
        <div className="space-y-2">
          {displayedList.map((entry, index) => {
            const isMe = currentUserId && entry.id === currentUserId
            const rank = index + 1
            const delta = rankDeltas.get(entry.id)
            const scoreGain = scoreGains.get(entry.id)
            const isRecentlyUpdated = recentlyUpdatedIds.has(entry.id)

            let rankBadge = null
            if (rank === 1) {
              rankBadge = (
                <div className="w-7 h-7 rounded-xl bg-yellow-400 text-amber-950 flex items-center justify-center font-black text-xs shadow-xs">
                  <Crown className="w-4 h-4" />
                </div>
              )
            } else if (rank === 2) {
              rankBadge = (
                <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-black text-xs shadow-xs">
                  2
                </div>
              )
            } else if (rank === 3) {
              rankBadge = (
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  3
                </div>
              )
            } else {
              rankBadge = (
                <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                  {rank}
                </div>
              )
            }

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-300 ${
                  isRecentlyUpdated && delta && delta > 0
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/80 shadow-md scale-[1.01]'
                    : isRecentlyUpdated && delta && delta < 0
                    ? 'ring-1 ring-rose-400 bg-rose-50/50'
                    : isMe
                    ? 'bg-brand-primary/10 border-2 border-brand-primary shadow-xs'
                    : rank === 1
                    ? 'bg-yellow-50/70 border border-yellow-200'
                    : 'bg-slate-50/70 border border-slate-200/70 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    {rankBadge}
                    {delta !== undefined && delta > 0 && (
                      <span className="inline-flex items-center text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full animate-bounce shadow-2xs">
                        <ArrowUp className="w-2.5 h-2.5 stroke-[3]" />
                        +{delta}
                      </span>
                    )}
                    {delta !== undefined && delta < 0 && (
                      <span className="inline-flex items-center text-[10px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full shadow-2xs">
                        <ArrowDown className="w-2.5 h-2.5 stroke-[3]" />
                        {Math.abs(delta)}
                      </span>
                    )}
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-brand-light flex items-center justify-center overflow-hidden shrink-0 border border-brand-primary/20 text-brand-primary font-bold text-xs">
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : mode === 'group' ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      (entry.name || 'M').charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className={`text-sm font-extrabold truncate ${isMe ? 'text-brand-primary' : 'text-slate-900'}`}>
                      {entry.name || 'Kalahok'} {isMe && '(Ikaw)'}
                    </p>
                    {mode === 'group' && entry.member_count !== undefined && (
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {entry.member_count} kasapi
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {scoreGain !== undefined && scoreGain > 0 && (
                    <div className="text-[11px] font-black text-emerald-600 animate-pulse leading-none mb-0.5">
                      +{scoreGain} pts
                    </div>
                  )}
                  <span className="font-heading font-black text-base md:text-lg text-slate-900">
                    {(entry.score ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-extrabold ml-1">pts</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
