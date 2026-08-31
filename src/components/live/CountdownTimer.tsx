'use client'

import { useCountdown } from '@/lib/hooks/useCountdown'
import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  startedAt: string | null | undefined
  durationSeconds: number | null | undefined
  serverOffset?: number
  onExpire?: () => void
  variant?: 'ring' | 'bar' | 'compact'
  showIcon?: boolean
}

export function CountdownTimer({
  startedAt,
  durationSeconds,
  serverOffset = 0,
  onExpire,
  variant = 'bar',
  showIcon = true
}: CountdownTimerProps) {
  const { timeLeftSeconds, percentage, isExpired } = useCountdown(
    startedAt,
    durationSeconds,
    serverOffset,
    onExpire
  )

  if (!startedAt || !durationSeconds) {
    return null
  }

  const isUrgent = timeLeftSeconds <= 5 && !isExpired

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-colors ${
          isExpired
            ? 'bg-rose-100 text-rose-700'
            : isUrgent
            ? 'bg-rose-500 text-white animate-pulse'
            : 'bg-emerald-100 text-emerald-800'
        }`}
      >
        {showIcon && <Clock className="w-3.5 h-3.5" />}
        <span>{isExpired ? 'Tapos na' : `${timeLeftSeconds}s`}</span>
      </div>
    )
  }

  if (variant === 'ring') {
    const radius = 28
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className="relative flex items-center justify-center">
        <svg className="w-20 h-20 -rotate-90 transform">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-100"
            fill="transparent"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-200 ${
              isExpired
                ? 'text-rose-500'
                : isUrgent
                ? 'text-rose-500'
                : percentage < 40
                ? 'text-amber-500'
                : 'text-brand-primary'
            }`}
            fill="transparent"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span
            className={`text-base font-black font-mono leading-none ${
              isExpired
                ? 'text-rose-600'
                : isUrgent
                ? 'text-rose-600 animate-pulse'
                : 'text-slate-800'
            }`}
          >
            {isExpired ? '0' : timeLeftSeconds}
          </span>
          <span className="text-[10px] font-bold text-slate-400">seg</span>
        </div>
      </div>
    )
  }

  // Variant === 'bar'
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
        <div className="flex items-center gap-1.5">
          {showIcon && <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-500 animate-spin' : 'text-slate-400'}`} />}
          <span className={isUrgent ? 'text-rose-600 font-extrabold' : ''}>
            {isExpired ? 'Oras na tapos na' : 'Natitirang Oras'}
          </span>
        </div>
        <span
          className={`font-mono font-black ${
            isExpired ? 'text-rose-600' : isUrgent ? 'text-rose-600 text-sm animate-pulse' : 'text-slate-800'
          }`}
        >
          {isExpired ? '0s' : `${timeLeftSeconds}s`}
        </span>
      </div>

      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-200 ease-linear ${
            isExpired
              ? 'bg-rose-500'
              : isUrgent
              ? 'bg-rose-500'
              : percentage < 40
              ? 'bg-amber-400'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
