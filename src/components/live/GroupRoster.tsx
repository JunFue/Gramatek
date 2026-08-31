'use client'

import { LiveSessionGroup, LiveSessionParticipant } from '@/types/live-session'
import { Crown, Users, UserCheck } from 'lucide-react'
import { Translate } from '@/components/Translate'

interface GroupRosterProps {
  group: LiveSessionGroup
  members: LiveSessionParticipant[]
  currentUserId?: string
  showVoteStatus?: boolean
}

export function GroupRoster({
  group,
  members,
  currentUserId,
  showVoteStatus = false
}: GroupRosterProps) {
  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-md">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-slate-900 text-lg leading-tight">
              {group.label}
            </h3>
            <p className="text-[11px] font-bold text-slate-500">
              {members.length} {members.length === 1 ? 'kasapi' : 'mga kasapi'}
            </p>
          </div>
        </div>

        {group.leader_id && (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
            <Translate fil="May Lider Na" en="Leader Assigned" />
          </span>
        )}
      </div>

      <div className="space-y-2">
        {members.map((member) => {
          const isLeader = group.leader_id === member.student_id
          const isMe = currentUserId === member.student_id
          const name = member.profiles?.full_name || 'Mag-aaral'

          return (
            <div
              key={member.student_id}
              className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                isMe
                  ? 'bg-brand-primary/10 border border-brand-primary/30'
                  : 'bg-slate-50 border border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center overflow-hidden shrink-0 font-black text-xs">
                  {member.profiles?.avatar_url ? (
                    <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 truncate">
                    {name} {isMe && '(Ikaw)'}
                  </p>
                  {isLeader && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600">
                      <Crown className="w-3 h-3 fill-amber-400" />
                      <Translate fil="Lider ng Pangkat" en="Group Leader" />
                    </span>
                  )}
                </div>
              </div>

              {isLeader && (
                <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black shadow-xs">
                  Lider
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
