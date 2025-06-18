'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface SystemStatus {
  databaseConnected: boolean
  hasGeneratedTimetables: boolean
  lastUpdated: Date
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: async (): Promise<SystemStatus> => {
      try {
        // Test database connection
        const { error } = await supabase.from('schools').select('id').limit(1)
        const databaseConnected = !error

        // Check if any timetables exist
        const { count } = await supabase
          .from('timetable_generations')
          .select('id', { count: 'exact', head: true })
        
        return {
          databaseConnected,
          hasGeneratedTimetables: (count || 0) > 0,
          lastUpdated: new Date(),
        }
      } catch (error) {
        return {
          databaseConnected: false,
          hasGeneratedTimetables: false,
          lastUpdated: new Date(),
        }
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })
}