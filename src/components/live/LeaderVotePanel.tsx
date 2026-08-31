'use client'

import { useState } from 'react'
import { LiveSessionGroup, LiveSessionParticipant } from '@/types/live-session'
import { useLeaderVote } from '@/lib/hooks/useLeaderVote'
import { Vote, Check, Crown, Loader2, Users } from 'lucide-react'
import { Translate } from '@/components/Translate'

interface LeaderVotePanelProps {
  sessionId: string
  group: LiveSessionGroup
  members: LiveSessionParticipant[]
  currentUserId: string
  isHost?: boolean
  onLeaderFinalized?: (leaderId: string) => void
}

export function LeaderVotePanel({
  sessionId,
  group,
  members,
  currentUserId,
  isHost = false,
  onLeaderFinalized
}: LeaderVotePanelProps) {
  const { votes, myVote, voteTallies, totalVotes, loading, castVote, finalizeLeader } =
    useLeaderVote(sessionId, group.id, currentUserId)
  
  const [submitting, setSubmitting] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  const handleVote = async (candidateId: string) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await castVote(candidateId)
    } catch (err) {
      console.error('Failed to cast vote:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinalize = async () => {
    if (finalizing) return
    setFinalizing(true)
    try {
      const winnerId = await finalizeLeader()
      if (onLeaderFinalized && winnerId) {
        onLeaderFinalized(winnerId)
      }
    } catch (err) {
      console.error('Failed to finalize leader:', err)
    } finally {
      setFinalizing(false)
    }
  }

  const isElected = !!group.leader_id

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-slate-900 text-lg leading-tight">
              <Translate fil="Pagboto ng Lider" en="Leader Election" />
            </h3>
            <p className="text-[11px] font-bold text-slate-500">
              {group.label} • {totalVotes} / {members.length} <Translate fil="bumoto na" en="voted" />
            </p>
          </div>
        </div>

        {isElected ? (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
            <Translate fil="Tapos Na" en="Finalized" />
          </span>
        ) : (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black">
            Bukas ang Botohan
          </span>
        )}
      </div>

      {isElected ? (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Crown className="w-6 h-6 fill-amber-300" />
          </div>
          <div>
            <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">
              <Translate fil="Itinalagang Lider ng Pangkat" en="Elected Group Leader" />
            </p>
            <p className="text-base font-black text-emerald-950">
              {group.leader?.full_name || 'Lider'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-600">
            <Translate
              fil="Pumili ng isa sa inyong mga kasapi upang maging opisyal na tagapagsumite ng sagot:"
              en="Select a member to be the official answer submitter:"
            />
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {members.map((member) => {
              const isSelected = myVote === member.student_id
              const tally = voteTallies[member.student_id] || 0
              const name = member.profiles?.full_name || 'Mag-aaral'
              const isMe = currentUserId === member.student_id

              return (
                <button
                  key={member.student_id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleVote(member.student_id)}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 border-2 border-amber-500 shadow-md'
                      : 'bg-slate-50 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                      {member.profiles?.avatar_url ? (
                        <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">
                        {name} {isMe && '(Ikaw)'}
                      </p>
                      {isHost && (
                        <p className="text-[10px] text-slate-500 font-bold">
                          {tally} {tally === 1 ? 'boto' : 'mga boto'}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {isHost && !isElected && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={finalizing}
                onClick={handleFinalize}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {finalizing && <Loader2 className="w-4 h-4 animate-spin" />}
                <Crown className="w-3.5 h-3.5 fill-amber-200" />
                <Translate fil="I-finalize ang Lider" en="Finalize Leader" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
