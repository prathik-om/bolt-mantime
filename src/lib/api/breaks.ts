import { createClient } from '@/utils/supabase/client';
import { Break } from '../types/database-helpers';
import { handleError } from '../utils/error-handling';

/**
 * Create a new break
 */
export async function createBreak(
  breakData: Omit<Break, 'id' | 'created_at'>
): Promise<{ data: Break | null; error: string | null }> {
  try {
    // Basic validation
    const validationErrors = validateBreak(breakData);
    if (validationErrors.length > 0) {
      return { data: null, error: validationErrors.join(', ') };
    }

    // School hours validation
    const schoolHoursErrors = await validateBreakAgainstSchoolHours(breakData, breakData.school_id);
    if (schoolHoursErrors.length > 0) {
      return { data: null, error: schoolHoursErrors.join(', ') };
    }

    // Break distribution validation
    const distributionErrors = await validateBreakDistribution(breakData, breakData.school_id);
    if (distributionErrors.length > 0) {
      return { data: null, error: distributionErrors.join(', ') };
    }

    const supabase = createClient();

    // Check for overlapping breaks
    const { data: existingBreaks } = await supabase
      .from('breaks')
      .select('*')
      .eq('school_id', breakData.school_id)
      .eq('day_of_week', breakData.day_of_week)
      .or(`start_time.lte.${breakData.end_time},end_time.gte.${breakData.start_time}`);

    if (existingBreaks && existingBreaks.length > 0) {
      return { data: null, error: 'Break time overlaps with existing breaks' };
    }

    const { data, error } = await supabase
      .from('breaks')
      .insert(breakData)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create break', error);
  }
}

/**
 * Update a break
 */
export async function updateBreak(
  id: string,
  updates: Partial<Break>
): Promise<{ data: Break | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current break
    const { data: currentBreak } = await supabase
      .from('breaks')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentBreak) {
      return { data: null, error: 'Break not found' };
    }

    const updatedBreak = { ...currentBreak, ...updates };

    // Validate updated break data
    const validationErrors = validateBreak(updatedBreak);
    if (validationErrors.length > 0) {
      return { data: null, error: validationErrors.join(', ') };
    }

    // Check for overlapping breaks if time is being updated
    if (updates.start_time || updates.end_time || updates.day_of_week) {
      const { data: existingBreaks } = await supabase
        .from('breaks')
        .select('*')
        .eq('school_id', currentBreak.school_id)
        .eq('day_of_week', updates.day_of_week || currentBreak.day_of_week)
        .neq('id', id)
        .or(`start_time.lte.${updates.end_time || currentBreak.end_time},end_time.gte.${updates.start_time || currentBreak.start_time}`);

      if (existingBreaks && existingBreaks.length > 0) {
        return { data: null, error: 'Break time overlaps with existing breaks' };
      }
    }

    const { data, error } = await supabase
      .from('breaks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to update break', error);
  }
}

/**
 * Delete a break
 */
export async function deleteBreak(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('breaks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to delete break', error);
  }
}

/**
 * Get all breaks for a school
 */
export async function getBreaks(
  schoolId: string
): Promise<{ data: Break[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('breaks')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('sequence');

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get breaks', error);
  }
}

/**
 * Get a single break
 */
export async function getBreak(
  id: string
): Promise<{ data: Break | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('breaks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get break', error);
  }
}

/**
 * Helper function to validate break data
 */
function validateBreak(breakData: Partial<Break>): string[] {
  const errors: string[] = [];

  if (!breakData.school_id) {
    errors.push('School ID is required');
  }

  if (!breakData.name?.trim()) {
    errors.push('Break name is required');
  } else if (breakData.name.length > 100) {
    errors.push('Break name cannot exceed 100 characters');
  }

  if (!breakData.start_time) {
    errors.push('Start time is required');
  } else if (!isValidTime(breakData.start_time)) {
    errors.push('Invalid start time format (should be HH:MM)');
  }

  if (!breakData.end_time) {
    errors.push('End time is required');
  } else if (!isValidTime(breakData.end_time)) {
    errors.push('Invalid end time format (should be HH:MM)');
  }

  if (breakData.start_time && breakData.end_time) {
    const start = new Date(`1970-01-01T${breakData.start_time}`);
    const end = new Date(`1970-01-01T${breakData.end_time}`);
    
    if (end <= start) {
      errors.push('End time must be after start time');
    }

    // Calculate duration in minutes
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

    if (durationMinutes < 5) {
      errors.push('Break duration must be at least 5 minutes');
    }
    if (durationMinutes > 120) {
      errors.push('Break duration cannot exceed 120 minutes');
    }

    // Store duration for later use
    breakData.duration_minutes = durationMinutes;
  }

  if (breakData.sequence !== undefined) {
    if (breakData.sequence < 0) {
      errors.push('Sequence must be a non-negative number');
    }
  }

  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  if (breakData.day_of_week && !validDays.includes(breakData.day_of_week.toLowerCase())) {
    errors.push('Invalid day of week');
  }

  return errors;
}

/**
 * Helper function to validate time format
 */
function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Helper function to validate break against school working hours
 */
async function validateBreakAgainstSchoolHours(
  breakData: Partial<Break>,
  schoolId: string
): Promise<string[]> {
  const errors: string[] = [];
  const supabase = createClient();

  // Get school working hours
  const { data: school } = await supabase
    .from('schools')
    .select('start_time, end_time, working_days')
    .eq('id', schoolId)
    .single();

  if (school) {
    // Check if break day is a working day
    if (breakData.day_of_week && school.working_days) {
      if (!school.working_days.includes(breakData.day_of_week.toLowerCase())) {
        errors.push(`${breakData.day_of_week} is not a working day`);
      }
    }

    // Check if break time is within school hours
    if (breakData.start_time && breakData.end_time && school.start_time && school.end_time) {
      const breakStart = new Date(`1970-01-01T${breakData.start_time}`);
      const breakEnd = new Date(`1970-01-01T${breakData.end_time}`);
      const schoolStart = new Date(`1970-01-01T${school.start_time}`);
      const schoolEnd = new Date(`1970-01-01T${school.end_time}`);

      if (breakStart < schoolStart) {
        errors.push('Break cannot start before school hours');
      }
      if (breakEnd > schoolEnd) {
        errors.push('Break cannot end after school hours');
      }
    }
  }

  return errors;
}

/**
 * Helper function to validate break distribution
 */
async function validateBreakDistribution(
  breakData: Partial<Break>,
  schoolId: string
): Promise<string[]> {
  const errors: string[] = [];
  const supabase = createClient();

  if (!breakData.day_of_week || !breakData.start_time || !breakData.end_time) {
    return errors;
  }

  // Get all breaks for this day
  const { data: existingBreaks } = await supabase
    .from('breaks')
    .select('*')
    .eq('school_id', schoolId)
    .eq('day_of_week', breakData.day_of_week)
    .neq('id', breakData.id || '')
    .order('start_time', { ascending: true });

  if (existingBreaks && existingBreaks.length > 0) {
    // Check minimum gap between breaks (15 minutes)
    const breakStart = new Date(`1970-01-01T${breakData.start_time}`);
    const breakEnd = new Date(`1970-01-01T${breakData.end_time}`);

    for (const existingBreak of existingBreaks) {
      const existingStart = new Date(`1970-01-01T${existingBreak.start_time}`);
      const existingEnd = new Date(`1970-01-01T${existingBreak.end_time}`);

      const gapBefore = (breakStart.getTime() - existingEnd.getTime()) / (1000 * 60);
      const gapAfter = (existingStart.getTime() - breakEnd.getTime()) / (1000 * 60);

      if (gapBefore > 0 && gapBefore < 15) {
        errors.push('Breaks must be at least 15 minutes apart');
      }
      if (gapAfter > 0 && gapAfter < 15) {
        errors.push('Breaks must be at least 15 minutes apart');
      }
    }

    // Check maximum breaks per day (4)
    if (existingBreaks.length >= 4) {
      errors.push('Maximum of 4 breaks per day allowed');
    }

    // Check total break time per day (maximum 3 hours)
    let totalBreakMinutes = breakData.duration_minutes || 0;
    for (const existingBreak of existingBreaks) {
      totalBreakMinutes += existingBreak.duration_minutes || 0;
    }
    if (totalBreakMinutes > 180) {
      errors.push('Total break time per day cannot exceed 3 hours');
    }
  }

  return errors;
} 