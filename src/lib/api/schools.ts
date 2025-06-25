// TODO: Refactor this file to use the new supabase client pattern.
// import { createClient } from '@/utils/supabase/server' for server-side
// import { createBrowserClient } from '@/utils/supabase' for client-side
// import { supabase } from '@/lib/supabase-server';
import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/lib/database.types'

type School = Database['public']['Tables']['schools']['Row']
type SchoolInsert = Database['public']['Tables']['schools']['Insert']
type SchoolUpdate = Database['public']['Tables']['schools']['Update']

// Re-export types from academic calendar API for backward compatibility
export type AcademicYear = Database['public']['Tables']['academic_years']['Row']

/**
 * Get all schools for a user
 */
export async function getSchools(): Promise<School[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching schools:', error)
    throw new Error('Failed to fetch schools')
  }

  return data || []
}

/**
 * Get a single school by ID
 */
export async function getSchool(schoolId: string): Promise<School | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single()

  if (error) {
    console.error('Error fetching school:', error)
    throw new Error('Failed to fetch school')
  }

  return data
}

/**
 * Create a new school
 */
export async function createSchool(schoolData: SchoolInsert): Promise<School> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .insert(schoolData)
    .select()
    .single()

  if (error) {
    console.error('Error creating school:', error)
    throw new Error('Failed to create school')
  }

  return data
}

/**
 * Update a school
 */
export async function updateSchool(schoolId: string, updates: SchoolUpdate): Promise<School> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .update(updates)
    .eq('id', schoolId)
    .select()
    .single()

  if (error) {
    console.error('Error updating school:', error)
    throw new Error('Failed to update school')
  }

  return data
}

/**
 * Delete a school
 */
export async function deleteSchool(schoolId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', schoolId)

  if (error) {
    console.error('Error deleting school:', error)
    throw new Error('Failed to delete school')
  }
}

/**
 * Get school configuration including working days
 */
export async function getSchoolConfig(schoolId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('schools')
    .select(`
      *,
      working_days_config (
        id,
        academic_year_id,
        term_id,
        working_days,
        start_time,
        end_time,
        period_duration
      )
    `)
    .eq('id', schoolId)
    .single()

  if (error) {
    console.error('Error fetching school config:', error)
    throw new Error('Failed to fetch school configuration')
  }

  return data
}

/**
 * Update school working days configuration
 */
export async function updateSchoolWorkingDays(
  schoolId: string,
  workingDays: string[],
  startTime?: string,
  endTime?: string,
  periodDuration?: number
) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('schools')
    .update({
      working_days: workingDays,
      start_time: startTime,
      end_time: endTime,
      period_duration: periodDuration,
    })
    .eq('id', schoolId)

  if (error) {
    console.error('Error updating school working days:', error)
    throw new Error('Failed to update school working days')
  }
}

/**
 * Get academic years for a school
 * @deprecated Use getAcademicYearsWithTerms from academic-calendar API instead
 */
export async function getAcademicYears(schoolId: string): Promise<AcademicYear[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching academic years:', error)
    throw new Error('Failed to fetch academic years')
  }

  return data || []
}

/**
 * Get school statistics
 */
export async function getSchoolStats(schoolId: string) {
  const supabase = createClient()
  
  // Get counts for various entities
  const [
    { count: teachersCount },
    { count: classesCount },
    { count: coursesCount },
    { count: departmentsCount },
    { count: roomsCount },
    { count: academicYearsCount }
  ] = await Promise.all([
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('departments').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('academic_years').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
  ])

  return {
    teachers: teachersCount || 0,
    classes: classesCount || 0,
    courses: coursesCount || 0,
    departments: departmentsCount || 0,
    rooms: roomsCount || 0,
    academicYears: academicYearsCount || 0,
  }
}

/**
 * Validate school configuration
 */
export async function validateSchoolConfig(schoolId: string) {
  const supabase = createClient()
  
  // Check if school has basic configuration
  const { data: school } = await supabase
    .from('schools')
    .select('name, working_days, start_time, end_time, period_duration')
    .eq('id', schoolId)
    .single()

  if (!school) {
    return { isValid: false, message: 'School not found' }
  }

  const issues = []

  if (!school.working_days || school.working_days.length === 0) {
    issues.push('No working days configured')
  }

  if (!school.start_time || !school.end_time) {
    issues.push('School hours not configured')
  }

  if (!school.period_duration) {
    issues.push('Period duration not configured')
  }

  // Check if school has academic years
  const { count: academicYearsCount } = await supabase
    .from('academic_years')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (!academicYearsCount || academicYearsCount === 0) {
    issues.push('No academic years configured')
  }

  return {
    isValid: issues.length === 0,
    message: issues.length > 0 ? issues.join(', ') : 'Configuration is valid',
    issues
  }
}

export const getSchoolByUserId = async (userId: string): Promise<School | null> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching school:', error);
    throw new Error('Failed to fetch school data.');
  }

  return data;
}; 