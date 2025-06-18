'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { Subject, SubjectInsert } from '@/types/database'

export function useSubjects(schoolId?: string) {
  return useQuery({
    queryKey: ['subjects', schoolId],
    queryFn: async (): Promise<Subject[]> => {
      let query = supabase
        .from('subjects')
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

export function useCreateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (subjectData: SubjectInsert) => {
      const { data, error } = await supabase
        .from('subjects')
        .insert([subjectData])
        .select()
        .single()

      if (error) {
        handleSupabaseError(error)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['school-stats'] })
    },
  })
}

export function useUpdateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<SubjectInsert>) => {
      const { data, error } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        handleSupabaseError(error)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}

export function useDeleteSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        handleSupabaseError(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['school-stats'] })
    },
  })
}