import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Common error handling
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  
  if (error?.message) {
    return error.message
  }
  
  if (error?.error_description) {
    return error.error_description
  }
  
  return 'An unexpected error occurred'
}

// Auth helpers
export const getCurrentUser = async (supabase: SupabaseClient<Database>) => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new Error(handleSupabaseError(error))
  }
  
  return user
}

export const getCurrentSession = async (supabase: SupabaseClient<Database>) => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new Error(handleSupabaseError(error))
  }
  
  return user
}

export const signOut = async (supabase: SupabaseClient<Database>) => {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(handleSupabaseError(error))
  }
}

// Profile helpers
export const getProfile = async (supabase: SupabaseClient<Database>, userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    throw new Error(handleSupabaseError(error))
  }
  
  return data
}

export const updateProfile = async (supabase: SupabaseClient<Database>, userId: string, updates: Partial<Tables<'profiles'>>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    throw new Error(handleSupabaseError(error))
  }
  
  return data
}

// School helpers
export const getSchool = async (supabase: SupabaseClient<Database>, schoolId: string) => {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single()
  
  if (error) {
    throw new Error(handleSupabaseError(error))
  }
  
  return data
}

export const getUserSchool = async (supabase: SupabaseClient<Database>, userId: string) => {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // Ignore 'single row not found'
    throw new Error(handleSupabaseError(error))
  }
  
  return data
}

// Department helpers (formerly Subject helpers)
export const getDepartments = async (supabase: SupabaseClient<Database>, schoolId: string) => {
  const { data, error } = await supabase
    .from('departments')
    .select(`
      *,
      subject_grade_mappings (
        grade_level,
        periods_per_week,
        is_required
      ),
      courses (
        id,
        name,
        code,
        grade_level
      )
    `)
    .eq('school_id', schoolId)
    .order('name')
  
  if (error) {
    throw new Error(handleSupabaseError(error))
  }
  
  return data || []
}

// Teacher helpers
export const getTeachers = async (supabase: SupabaseClient<Database>, schoolId: string) => {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      *,
      teacher_qualifications (
        department_id
      )
    `)
    .eq('school_id', schoolId)
    .order('first_name')
  
  if (error) {
    throw new Error(handleSupabaseError(error))
  }
  
  return data || []
}

// Academic year helpers
export const getAcademicYears = async (supabase: SupabaseClient<Database>, schoolId: string) => {
  const { data, error } = await supabase
    .from('academic_years')
    .select(`
      *,
      terms (
        id,
        name,
        start_date,
        end_date
      )
    `)
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false })
  
  if (error) {
    throw new Error(handleSupabaseError(error))
  }
  
  return data || []
}

// Utility functions
export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateTime = (date: string | Date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
} 