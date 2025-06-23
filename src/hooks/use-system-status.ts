'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useSchoolContext } from '@/hooks/use-school-context'

interface SystemStatus {
  databaseConnected: boolean
  hasGeneratedTimetables: boolean
  lastUpdated: Date
}

export function useSystemStatus() {
  const { schoolId } = useSchoolContext()
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading')
  const supabase = createClient()

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.from('schools').select('count', { count: 'exact', head: true })
        if (error) throw error
        setStatus('online')
      } catch (error) {
        console.error('System status check failed:', error)
        setStatus('offline')
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [supabase])

  return status
}