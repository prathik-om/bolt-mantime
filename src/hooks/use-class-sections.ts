'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { ClassSection, ClassSectionInsert } from '@/types/database'

export function useClassSections(schoolId?: string) {
  return useQuery({
    queryKey: ['class-sections', schoolId],
    queryFn: async (): Promise<ClassSection[]> => {
      let query = supabase
        .from('class_sections')
        .select('*')
        .eq('is_active', true)
        .order('grade_level')
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

export function useCreateClassSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (classSectionData: ClassSectionInsert) => {
      const { data, error } = await supabase
        .from('class_sections')
        .insert([classSectionData])
        .select()
        .single()

      if (error) {
        handleSupabaseError(error)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-sections'] })
      queryClient.invalidateQueries({ queryKey: ['school-stats'] })
    },
  })
}

export function useUpdateClassSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<ClassSectionInsert>) => {
      const { data, error } = await supabase
        .from('class_sections')
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
      queryClient.invalidateQueries({ queryKey: ['class-sections'] })
    },
  })
}

export function useDeleteClassSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('class_sections')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        handleSupabaseError(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-sections'] })
      queryClient.invalidateQueries({ queryKey: ['school-stats'] })
    },
  })
}