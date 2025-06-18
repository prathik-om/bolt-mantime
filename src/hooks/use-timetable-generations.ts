'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { TimetableGeneration, TimetableGenerationInsert, ScheduledLessonWithDetails } from '@/types/database'

export function useTimetableGenerations(termId?: string) {
  return useQuery({
    queryKey: ['timetable-generations', termId],
    queryFn: async (): Promise<TimetableGeneration[]> => {
      let query = supabase
        .from('timetable_generations')
        .select('*')
        .order('generated_at', { ascending: false })

      if (termId) {
        query = query.eq('term_id', termId)
      }

      const { data, error } = await query

      if (error) {
        handleSupabaseError(error)
      }

      return data || []
    },
    enabled: !!termId,
  })
}

export function useScheduledLessons(generationId?: string) {
  return useQuery({
    queryKey: ['scheduled-lessons', generationId],
    queryFn: async (): Promise<ScheduledLessonWithDetails[]> => {
      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select(`
          *,
          teaching_assignment:teaching_assignments (
            *,
            class_offering:class_offerings (
              *,
              class_section:class_sections (*),
              subject:subjects (*),
              term:terms (*)
            ),
            teacher:teachers (*)
          ),
          room:rooms (*),
          time_slot:time_slots (*)
        `)
        .eq('generation_id', generationId!)
        .order('date')
        .order('timeslot_id')

      if (error) {
        handleSupabaseError(error)
      }

      return (data ?? []) as ScheduledLessonWithDetails[]
    },
    enabled: !!generationId,
  })
}

export function useCreateTimetableGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (generationData: TimetableGenerationInsert) => {
      const { data, error } = await supabase
        .from('timetable_generations')
        .insert([generationData])
        .select()
        .single()

      if (error) {
        handleSupabaseError(error)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-generations'] })
      queryClient.invalidateQueries({ queryKey: ['school-stats'] })
    },
  })
}