'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { TimeSlot, TimeSlotInsert } from '@/types/database'

export function useTimeSlots(schoolId?: string) {
  return useQuery({
    queryKey: ['time-slots', schoolId],
    queryFn: async (): Promise<TimeSlot[]> => {
      let query = supabase
        .from('time_slots')
        .select('*')
        .eq('is_teaching_period', true)
        .order('day_of_week')
        .order('start_time')

      if (schoolId) {
        query = query.eq('school_id', schoolId)
      }

      const { data, error } = await query

      if (error) {
        handleSupabaseError(error)
      }

      return data || []
    },
    enabled: !!schoolId,
  })
}

export function useCreateTimeSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (timeSlotData: TimeSlotInsert) => {
      const { data, error } = await supabase
        .from('time_slots')
        .insert([timeSlotData])
        .select()
        .single()

      if (error) {
        handleSupabaseError(error)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-slots'] })
    },
  })
}