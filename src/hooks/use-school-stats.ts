'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useSchoolContext } from './use-school-context'

interface SchoolStats {
  teachers: number
  subjects: number
  classSections: number
  timetables: number
  rooms: number
  timeSlots: number
}

export function useSchoolStats() {
  const { schoolId, schoolsLoading } = useSchoolContext()
  const [stats, setStats] = useState<SchoolStats>({
    teachers: 0,
    subjects: 0,
    classSections: 0,
    timetables: 0,
    rooms: 0,
    timeSlots: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      if (!schoolId) {
        setLoading(false)
        return
      }

      try {
        const [
          { count: teachers },
          { count: subjects },
          { count: classSections },
          { count: timetables },
          { count: rooms },
          { count: timeSlots }
        ] = await Promise.all([
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('departments').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('class_sections').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('timetables' as any).select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('time_slots').select('*', { count: 'exact', head: true }).eq('school_id', schoolId)
        ])

        setStats({
          teachers: teachers || 0,
          subjects: subjects || 0,
          classSections: classSections || 0,
          timetables: timetables || 0,
          rooms: rooms || 0,
          timeSlots: timeSlots || 0,
        })
      } catch (err) {
        console.error('Error fetching school stats:', err)
        setError('Failed to load school statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [schoolId, supabase])

  return { stats, loading, error }
}