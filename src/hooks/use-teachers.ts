'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { TeacherWithQualifications, TeacherInsert } from '@/types/database'
import { useSchoolContext } from './use-school-context'

export function useTeachers() {
  const { schoolId, schoolsLoading } = useSchoolContext()

  return useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async (): Promise<TeacherWithQualifications[]> => {
      if (!schoolId) return []

      const { data, error } = await supabase
        .from('teachers')
        .select(`
          *,
          qualifications:teacher_qualifications (
            *,
            subject:subjects (*)
          )
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('last_name')

      if (error) {
        handleSupabaseError(error)
      }

      return data || []
    },
    enabled: !!schoolId,
  })
}

export function useCreateTeacher() {
  const queryClient = useQueryClient()
  const { schoolId, schoolsLoading } = useSchoolContext()

  return useMutation({
    mutationFn: async (teacherData: Omit<TeacherInsert, 'school_id'> & { qualifications?: string[] }) => {
      if (!schoolId) throw new Error('No school selected')

      const { qualifications, ...teacherInfo } = teacherData

      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .insert([{ ...teacherInfo, school_id: schoolId }])
        .select()
        .single()

      if (teacherError) {
        handleSupabaseError(teacherError)
      }

      // Add qualifications if provided
      if (qualifications && qualifications.length > 0) {
        if (!teacher) {
          throw new Error('Teacher creation failed, teacher is null')
        }
        const qualificationInserts = qualifications.map(subjectId => ({
          teacher_id: teacher.id,
          subject_id: subjectId,
        }))

        const { error: qualError } = await supabase
          .from('teacher_qualifications')
          .insert(qualificationInserts)

        if (qualError) {
          handleSupabaseError(qualError)
        }
      }

      return teacher
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      queryClient.invalidateQueries({ queryKey: ['school-stats'] })
    },
  })
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, qualifications, ...updateData }: { id: string; qualifications?: string[] } & Partial<TeacherInsert>) => {
      const { data, error } = await supabase
        .from('teachers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        handleSupabaseError(error)
      }

      // Update qualifications if provided
      if (qualifications !== undefined) {
        // Remove existing qualifications
        await supabase
          .from('teacher_qualifications')
          .delete()
          .eq('teacher_id', id)

        // Add new qualifications
        if (qualifications.length > 0) {
          const qualificationInserts = qualifications.map(subjectId => ({
            teacher_id: id,
            subject_id: subjectId,
          }))

          const { error: qualError } = await supabase
            .from('teacher_qualifications')
            .insert(qualificationInserts)

          if (qualError) {
            handleSupabaseError(qualError)
          }
        }
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
    },
  })
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teachers')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        handleSupabaseError(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      queryClient.invalidateQueries({ queryKey: ['school-stats'] })
    },
  })
}