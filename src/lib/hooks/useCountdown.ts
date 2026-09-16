'use client'

import { useState, useEffect, useRef } from 'react'

interface CountdownResult {
  timeLeftMs: number
  timeLeftSeconds: number
  percentage: number
  isExpired: boolean
  formattedTime: string
}

export function useCountdown(
  startedAt: string | null | undefined,
  durationSeconds: number | null | undefined,
  serverOffset: number = 0,
  onExpire?: () => void,
  isPaused: boolean = false
): CountdownResult {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => {
    if (!startedAt || !durationSeconds) return 0
    const startMs = new Date(startedAt).getTime()
    const endMs = startMs + durationSeconds * 1000
    const nowMs = Date.now() + serverOffset
    return Math.max(0, endMs - nowMs)
  })

  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (isPaused) {
      return
    }

    expiredRef.current = false
    if (!startedAt || !durationSeconds || durationSeconds <= 0) {
      setTimeLeftMs(0)
      return
    }

    const startMs = new Date(startedAt).getTime()
    const totalMs = durationSeconds * 1000
    const endMs = startMs + totalMs

    const update = () => {
      const nowMs = Date.now() + serverOffset
      const remaining = Math.max(0, endMs - nowMs)
      setTimeLeftMs(remaining)

      if (remaining <= 0) {
        if (!expiredRef.current) {
          expiredRef.current = true
          if (onExpireRef.current) {
            onExpireRef.current()
          }
        }
      }
    }

    update()
    const interval = setInterval(update, 100)
    return () => clearInterval(interval)
  }, [startedAt, durationSeconds, serverOffset, isPaused])

  const totalMs = (durationSeconds || 1) * 1000
  const percentage = durationSeconds ? Math.min(100, Math.max(0, (timeLeftMs / totalMs) * 100)) : 0
  const timeLeftSeconds = Math.ceil(timeLeftMs / 1000)
  const isExpired = !!(startedAt && durationSeconds && timeLeftMs <= 0)

  const minutes = Math.floor(timeLeftSeconds / 60)
  const seconds = timeLeftSeconds % 60
  const formattedTime = `${minutes > 0 ? `${minutes}:` : ''}${seconds < 10 && minutes > 0 ? '0' : ''}${seconds}s`

  return {
    timeLeftMs,
    timeLeftSeconds,
    percentage,
    isExpired,
    formattedTime
  }
}
