import { createClient } from '@/utils/supabase/server'
import { Database } from '@/lib/database.types'

type WorkingDaysConfig = Database['public']['Tables']['working_days_config']['Row']
type WorkingDaysConfigInsert = Database['public']['Tables']['working_days_config']['Insert']
type WorkingDaysConfigUpdate = Database['public']['Tables']['working_days_config']['Update']

export async function getWorkingDaysConfig(
  schoolId: string, 
  academicYearId?: string,
  termId?: string
) {
  const supabase = createClient()
  
  let query = supabase
    .from('working_days_config')
    .select('*')
    .eq('school_id', schoolId)

  if (academicYearId) {
    query = query.eq('academic_year_id', academicYearId)
  }

  if (termId) {
    query = query.eq('term_id', termId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching working days config:', error)
    throw new Error('Failed to fetch working days configuration')
  }

  return data
}

export async function getWorkingDaysConfigById(id: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('working_days_config')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching working days config:', error)
    throw new Error('Failed to fetch working days configuration')
  }

  return data
}

export async function createWorkingDaysConfig(config: WorkingDaysConfigInsert) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('working_days_config')
    .insert(config)
    .select()
    .single()

  if (error) {
    console.error('Error creating working days config:', error)
    throw new Error('Failed to create working days configuration')
  }

  return data
}

export async function updateWorkingDaysConfig(
  id: string, 
  updates: WorkingDaysConfigUpdate
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('working_days_config')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating working days config:', error)
    throw new Error('Failed to update working days configuration')
  }

  return data
}

export async function deleteWorkingDaysConfig(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('working_days_config')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting working days config:', error)
    throw new Error('Failed to delete working days configuration')
  }

  return true
}

export async function getWorkingDaysConfigForTerm(
  schoolId: string,
  termId: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('working_days_config')
    .select('*')
    .eq('school_id', schoolId)
    .eq('term_id', termId)
    .single()

  if (error) {
    console.error('Error fetching working days config for term:', error)
    throw new Error('Failed to fetch working days configuration for term')
  }

  return data
}

export async function calculateWeeklyHours(config: WorkingDaysConfig) {
  const weeklyHours = config.working_days_per_week * config.hours_per_day
  const weeklyPeriods = config.working_days_per_week * config.periods_per_day
  const periodHours = config.period_duration_minutes / 60

  return {
    weeklyHours,
    weeklyPeriods,
    periodHours,
    totalPeriodMinutes: config.period_duration_minutes
  }
}

export async function validateWorkingDaysConfig(config: WorkingDaysConfigInsert) {
  const errors: string[] = []

  if (config.working_days_per_week < 1 || config.working_days_per_week > 7) {
    errors.push('Working days per week must be between 1 and 7')
  }

  if (config.hours_per_day <= 0 || config.hours_per_day > 12) {
    errors.push('Hours per day must be between 0 and 12')
  }

  if (config.periods_per_day < 1 || config.periods_per_day > 10) {
    errors.push('Periods per day must be between 1 and 10')
  }

  if (config.period_duration_minutes < 15 || config.period_duration_minutes > 120) {
    errors.push('Period duration must be between 15 and 120 minutes')
  }

  // Check if total daily hours match periods * period duration
  const totalDailyMinutes = config.periods_per_day * config.period_duration_minutes
  const totalDailyHours = config.hours_per_day * 60

  if (Math.abs(totalDailyMinutes - totalDailyHours) > 5) { // Allow 5 minute tolerance
    errors.push('Total daily hours must match periods × period duration')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
} 