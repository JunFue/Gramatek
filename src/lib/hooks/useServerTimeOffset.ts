'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

let cachedOffset: number | null = null

export function useServerTimeOffset() {
  const [serverOffset, setServerOffset] = useState<number>(() => cachedOffset ?? 0)
  const [isCalibrated, setIsCalibrated] = useState<boolean>(() => cachedOffset !== null)

  useEffect(() => {
    if (cachedOffset !== null) return

    let isMounted = true

    async function fetchServerTime() {
      try {
        const supabase = createClient()
        const t0 = Date.now()
        const { data, error } = await supabase.rpc('get_server_time')
        const t1 = Date.now()

        if (!error && data && isMounted) {
          const roundTrip = t1 - t0
          const serverTime = new Date(data).getTime() + Math.round(roundTrip / 2)
          const offset = serverTime - t1
          cachedOffset = offset
          setServerOffset(offset)
          setIsCalibrated(true)
        } else if (isMounted) {
          setIsCalibrated(true)
        }
      } catch {
        if (isMounted) {
          setIsCalibrated(true)
        }
      }
    }

    fetchServerTime()

    return () => {
      isMounted = false
    }
  }, [])

  const getNow = useCallback(() => {
    return Date.now() + serverOffset
  }, [serverOffset])

  return { serverOffset, isCalibrated, getNow }
}
