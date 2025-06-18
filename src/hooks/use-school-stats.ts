'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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

  return useQuery({
    queryKey: ['school-stats', schoolId],
    queryFn: async (): Promise<SchoolStats> => {
      if (!schoolId) {
        return {
          teachers: 0,
          subjects: 0,
          classSections: 0,
          timetables: 0,
          rooms: 0,
          timeSlots: 0,
        }
      }

      const [
        teachersResult,
        subjectsResult,
        classSectionsResult,
        timetablesResult,
        roomsResult,
        timeSlotsResult,
      ] = await Promise.all([
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
        supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
        supabase.from('class_sections').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
        supabase.from('timetable_generations').select('id', { count: 'exact', head: true }),
        supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
        supabase.from('time_slots').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_teaching_period', true),
      ])

      return {
        teachers: teachersResult.count || 0,
        subjects: subjectsResult.count || 0,
        classSections: classSectionsResult.count || 0,
        timetables: timetablesResult.count || 0,
        rooms: roomsResult.count || 0,
        timeSlots: timeSlotsResult.count || 0,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!schoolId,
  })
}