import { createClient } from '@/utils/supabase/server'
import { Database } from '@/lib/database.types'

type Holiday = Database['public']['Tables']['holidays']['Row']
type HolidayInsert = Database['public']['Tables']['holidays']['Insert']
type HolidayUpdate = Database['public']['Tables']['holidays']['Update']

export async function getHolidays(schoolId: string, academicYearId?: string) {
  const supabase = createClient()
  
  let query = supabase
    .from('holidays')
    .select('*')
    .eq('school_id', schoolId)
    .order('date', { ascending: true })

  if (academicYearId) {
    query = query.eq('academic_year_id', academicYearId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching holidays:', error)
    throw new Error('Failed to fetch holidays')
  }

  return data
}

export async function getHoliday(id: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching holiday:', error)
    throw new Error('Failed to fetch holiday')
  }

  return data
}

export async function createHoliday(holiday: HolidayInsert) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('holidays')
    .insert(holiday)
    .select()
    .single()

  if (error) {
    console.error('Error creating holiday:', error)
    throw new Error('Failed to create holiday')
  }

  return data
}

export async function updateHoliday(id: string, updates: HolidayUpdate) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('holidays')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating holiday:', error)
    throw new Error('Failed to update holiday')
  }

  return data
}

export async function deleteHoliday(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting holiday:', error)
    throw new Error('Failed to delete holiday')
  }

  return true
}

export async function getHolidaysByDateRange(
  schoolId: string, 
  startDate: string, 
  endDate: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('school_id', schoolId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching holidays by date range:', error)
    throw new Error('Failed to fetch holidays by date range')
  }

  return data
}

export async function calculateAvailableHours(
  schoolId: string,
  academicYearId: string,
  termStartDate: string,
  termEndDate: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .rpc('calculate_available_teaching_hours', {
      term_start_date: termStartDate,
      term_end_date: termEndDate,
      school_id: schoolId,
      academic_year_id: academicYearId
    })

  if (error) {
    console.error('Error calculating available hours:', error)
    throw new Error('Failed to calculate available hours')
  }

  return data?.[0] || null
}

export async function validateCourseHours(
  courseId: string,
  termId: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .rpc('validate_course_hours_requirements', {
      course_id: courseId,
      term_id: termId
    })

  if (error) {
    console.error('Error validating course hours:', error)
    throw new Error('Failed to validate course hours')
  }

  return data?.[0] || null
} 