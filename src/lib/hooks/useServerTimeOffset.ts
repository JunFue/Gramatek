'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

let cachedOffset: number | null = null

export function useServerTimeOffset() {
  const [serverOffset, setServerOffset] = useState<number>(cachedOffset ?? 0)
  const [isCalibrated, setIsCalibrated] = useState<boolean>(cachedOffset !== null)

  useEffect(() => {
    if (cachedOffset !== null) {
      setServerOffset(cachedOffset)
      setIsCalibrated(true)
      return
    }

    const supabase = createClient()
    const t0 = Date.now()

    supabase.rpc('get_server_time').then(({ data, error }) => {
      const t1 = Date.now()
      if (!error && data) {
        const roundTrip = t1 - t0
        const serverTime = new Date(data).getTime() + Math.round(roundTrip / 2)
        const offset = serverTime - t1
        cachedOffset = offset
        setServerOffset(offset)
        setIsCalibrated(true)
      } else {
        // Fallback to local time if RPC unavailable
        setIsCalibrated(true)
      }
    }).catch(() => {
      setIsCalibrated(true)
    })
  }, [])

  const getNow = useCallback(() => {
    return Date.now() + serverOffset
  }, [serverOffset])

  return { serverOffset, isCalibrated, getNow }
}
