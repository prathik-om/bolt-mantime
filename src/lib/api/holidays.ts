import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

export type Holiday = Database['public']['Tables']['holidays']['Row'];
export type HolidayInsert = Database['public']['Tables']['holidays']['Insert'];
export type HolidayUpdate = Database['public']['Tables']['holidays']['Update'];

export async function getHolidays(academicYearId: string): Promise<Holiday[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('academic_year_id', academicYearId)
    .order('date');
    
  if (error) {
    console.error('Error fetching holidays:', error);
    throw new Error('Failed to fetch holidays');
  }
  
  return data || [];
}

export async function getHolidaysByAcademicYear(academicYearId: string): Promise<Holiday[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('academic_year_id', academicYearId)
    .order('date');
    
  if (error) {
    console.error('Error fetching holidays by academic year:', error);
    throw new Error('Failed to fetch holidays');
  }
  
  return data || [];
}

export async function createHoliday(holidayData: HolidayInsert): Promise<Holiday> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('holidays')
    .insert(holidayData)
    .select()
    .single();
    
  if (error) {
    console.error('Error creating holiday:', error);
    throw new Error('Failed to create holiday');
  }
  
  return data;
}

export async function updateHoliday(id: string, holidayData: HolidayUpdate): Promise<Holiday> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('holidays')
    .update(holidayData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating holiday:', error);
    throw new Error('Failed to update holiday');
  }
  
  return data;
}

export async function deleteHoliday(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting holiday:', error);
    throw new Error('Failed to delete holiday');
  }
}

export async function createBulkHolidays(holidays: HolidayInsert[]): Promise<Holiday[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('holidays')
    .insert(holidays)
    .select();
    
  if (error) {
    console.error('Error creating bulk holidays:', error);
    throw new Error('Failed to create holidays');
  }
  
  return data || [];
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
    .order('date')

  if (error) {
    console.error('Error fetching holidays by date range:', error)
    throw new Error('Failed to fetch holidays')
  }

  return data
}

export async function getHolidaysByTerm(
  schoolId: string,
  termStartDate: string,
  termEndDate: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('school_id', schoolId)
    .gte('date', termStartDate)
    .lte('date', termEndDate)
    .order('date')

  if (error) {
    console.error('Error fetching holidays by term:', error)
    throw new Error('Failed to fetch holidays')
  }

  return data
}

export async function getHolidaysByAcademicYearId(
  schoolId: string,
  academicYearId: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .order('date')

  if (error) {
    console.error('Error fetching holidays by academic year ID:', error)
    throw new Error('Failed to fetch holidays')
  }

  return data
}

export async function calculateAvailableHours(
  schoolId: string,
  academicYearId: string,
  termStartDate: string,
  termEndDate: string
) {
  // TODO: Implement or replace with working RPC function
  console.warn('calculateAvailableHours: RPC function calculate_available_teaching_hours not found');
  return null;
  
  // const supabase = createClient()
  
  // const { data, error } = await supabase
  //   .rpc('calculate_available_teaching_hours', {
  //     term_start_date: termStartDate,
  //     term_end_date: termEndDate,
  //     school_id: schoolId,
  //     academic_year_id: academicYearId
  //   })

  // if (error) {
  //   console.error('Error calculating available hours:', error)
  //   throw new Error('Failed to calculate available hours')
  // }

  // return data?.[0] || null
}

export async function validateCourseHours(
  courseId: string,
  termId: string
) {
  // TODO: Implement or replace with working RPC function
  console.warn('validateCourseHours: RPC function validate_course_hours_requirements not found');
  return null;
  
  // const supabase = createClient()
  
  // const { data, error } = await supabase
  //   .rpc('validate_course_hours_requirements', {
  //     course_id: courseId,
  //     term_id: termId
  //   })

  // if (error) {
  //   console.error('Error validating course hours:', error)
  //   throw new Error('Failed to validate course hours')
  // }

  // return data?.[0] || null
} 