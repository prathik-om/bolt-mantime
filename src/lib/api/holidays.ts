import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';
import { Holiday } from '../types/database-helpers';
import { handleError } from '../utils/error-handling';

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

interface HolidayValidation {
  isValid: boolean;
  message: string;
  details?: {
    is_working_day?: boolean;
    overlaps_break?: boolean;
    overlaps_existing_holiday?: boolean;
    term_id?: string;
    academic_year_id?: string;
  };
}

/**
 * Validate holiday data
 */
async function validateHoliday(holiday: Partial<Holiday>): Promise<HolidayValidation> {
  try {
    const errors: string[] = [];
    const supabase = createClient();

    if (!holiday.name?.trim()) {
      errors.push('Holiday name is required');
    } else if (holiday.name.length > 100) {
      errors.push('Holiday name cannot exceed 100 characters');
    }

    if (!holiday.date) {
      errors.push('Date is required');
    } else if (!isValidDate(holiday.date)) {
      errors.push('Invalid date format');
    }

    if (!holiday.school_id) {
      errors.push('School ID is required');
    }

    if (holiday.date && holiday.school_id) {
      // Get school working days
      const { data: school } = await supabase
        .from('schools')
        .select('working_days')
        .eq('id', holiday.school_id)
        .single();

      if (school) {
        const holidayDate = new Date(holiday.date);
        const dayOfWeek = holidayDate.toLocaleDateString('en-US', { weekday: 'lowercase' });

        const isWorkingDay = school.working_days.includes(dayOfWeek);
        if (!isWorkingDay) {
          errors.push('Holiday cannot be set on a non-working day');
        }

        // Check for overlapping holidays
        const { data: existingHolidays } = await supabase
          .from('holidays')
          .select('*')
          .eq('school_id', holiday.school_id)
          .eq('date', holiday.date)
          .neq('id', holiday.id || '');

        if (existingHolidays && existingHolidays.length > 0) {
          errors.push('A holiday already exists on this date');
        }

        // Check for breaks on this day
        const { data: breaks } = await supabase
          .from('breaks')
          .select('*')
          .eq('school_id', holiday.school_id)
          .eq('day_of_week', dayOfWeek);

        const overlapsBreak = breaks && breaks.length > 0;

        // Find which term this date falls into
        const { data: term } = await supabase
          .from('terms')
          .select(`
            id,
            academic_year_id,
            start_date,
            end_date
          `)
          .eq('academic_years.school_id', holiday.school_id)
          .lte('start_date', holiday.date)
          .gte('end_date', holiday.date)
          .single();

        return {
          isValid: errors.length === 0,
          message: errors.join(', '),
          details: {
            is_working_day: isWorkingDay,
            overlaps_break: overlapsBreak,
            overlaps_existing_holiday: existingHolidays && existingHolidays.length > 0,
            term_id: term?.id,
            academic_year_id: term?.academic_year_id
          }
        };
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.join(', ')
    };
  } catch (error) {
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create a new holiday with validation
 */
export async function createHoliday(
  holiday: Omit<Holiday, 'id' | 'created_at'>
): Promise<{ data: Holiday | null; error: string | null }> {
  try {
    // Validate holiday
    const validation = await validateHoliday(holiday);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    // Add term and academic year IDs if found
    if (validation.details?.term_id) {
      holiday.term_id = validation.details.term_id;
    }
    if (validation.details?.academic_year_id) {
      holiday.academic_year_id = validation.details.academic_year_id;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('holidays')
      .insert(holiday)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create holiday', error);
  }
}

/**
 * Update a holiday with validation
 */
export async function updateHoliday(
  id: string,
  updates: Partial<Holiday>
): Promise<{ data: Holiday | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current holiday
    const { data: currentHoliday } = await supabase
      .from('holidays')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentHoliday) {
      return { data: null, error: 'Holiday not found' };
    }

    const updatedHoliday = { ...currentHoliday, ...updates };

    // Validate updated holiday
    const validation = await validateHoliday(updatedHoliday);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    // Update term and academic year IDs if found
    if (validation.details?.term_id) {
      updates.term_id = validation.details.term_id;
    }
    if (validation.details?.academic_year_id) {
      updates.academic_year_id = validation.details.academic_year_id;
    }

    const { data, error } = await supabase
      .from('holidays')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to update holiday', error);
  }
}

/**
 * Delete a holiday
 */
export async function deleteHoliday(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Check if holiday exists
    const { data: holiday } = await supabase
      .from('holidays')
      .select('id')
      .eq('id', id)
      .single();

    if (!holiday) {
      return { success: false, error: 'Holiday not found' };
    }

    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to delete holiday', error);
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

/**
 * Get a single holiday
 */
export async function getHoliday(
  id: string
): Promise<{ data: Holiday | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get holiday', error);
  }
}

/**
 * Get holidays by date range
 */
export async function getHolidaysByDateRange(
  schoolId: string,
  startDate: string,
  endDate: string
): Promise<{ data: Holiday[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Validate dates
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return { data: null, error: 'Invalid date format' };
    }

    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('school_id', schoolId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get holidays by date range', error);
  }
}

/**
 * Get holidays by term
 */
export async function getHolidaysByTerm(
  schoolId: string,
  termStartDate: string,
  termEndDate: string
): Promise<{ data: Holiday[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Validate dates
    if (!isValidDate(termStartDate) || !isValidDate(termEndDate)) {
      return { data: null, error: 'Invalid date format' };
    }

    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('school_id', schoolId)
      .gte('date', termStartDate)
      .lte('date', termEndDate)
      .order('date');

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get holidays by term', error);
  }
}

/**
 * Get holidays by academic year
 */
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

/**
 * Helper function to validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
} 