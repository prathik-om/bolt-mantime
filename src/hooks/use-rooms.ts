'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { Room } from '@/types/database'

export function useRooms(schoolId?: string) {
  return useQuery({
    queryKey: ['rooms', schoolId],
    queryFn: async (): Promise<Room[]> => {
      let query = supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('name')

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