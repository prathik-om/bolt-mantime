import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';
import { TimeSlot, SchoolConstraints } from '../types/database-helpers';
import { validateTimeSlot } from '../utils/validation';
import { convertToTimeSlot, isValidTimeRange } from '../utils/type-guards';
import { handleError } from '../utils/error-handling';

type TimeSlotInsert = Database['public']['Tables']['time_slots']['Insert'];
type TimeSlotUpdate = Database['public']['Tables']['time_slots']['Update'];

export interface TimeSlotWithValidation extends TimeSlot {
  isValid: boolean;
  validationMessage?: string;
}

export interface TimeSlotSummary {
  total_slots: number;
  teaching_periods: number;
  break_periods: number;
  total_hours_per_week: number;
  average_period_duration: number;
  days_with_slots: number;
}

export interface DaySchedule {
  day_of_week: number;
  day_name: string;
  slots: TimeSlot[];
  total_hours: number;
  teaching_periods: number;
  break_periods: number;
}

interface TimeSlotValidation {
  isValid: boolean;
  message: string;
  details?: {
    duration_minutes?: number;
    overlaps_break?: boolean;
    overlaps_existing_slot?: boolean;
    is_within_school_hours?: boolean;
    is_working_day?: boolean;
  };
}

/**
 * Get all time slots for a school
 */
export async function getTimeSlots(schoolId: string): Promise<TimeSlot[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('school_id', schoolId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch time slots: ${error.message}`);
  }

  return data || [];
}

/**
 * Get time slots grouped by day
 */
export async function getTimeSlotsByDay(schoolId: string): Promise<DaySchedule[]> {
  const slots = await getTimeSlots(schoolId);
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const daySchedules: DaySchedule[] = [];
  
  for (let day = 0; day < 7; day++) {
    const daySlots = slots.filter(slot => slot.day_of_week === day);
    
    if (daySlots.length > 0) {
      const totalHours = daySlots.reduce((total, slot) => {
        const start = new Date(`2000-01-01T${slot.start_time}`);
        const end = new Date(`2000-01-01T${slot.end_time}`);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);
      
      const teachingPeriods = daySlots.filter(slot => slot.is_teaching_period).length;
      const breakPeriods = daySlots.filter(slot => !slot.is_teaching_period).length;
      
      daySchedules.push({
        day_of_week: day,
        day_name: dayNames[day],
        slots: daySlots,
        total_hours: totalHours,
        teaching_periods: teachingPeriods,
        break_periods: breakPeriods,
      });
    }
  }
  
  return daySchedules;
}

/**
 * Get a single time slot
 */
export async function getTimeSlot(slotId: string): Promise<TimeSlot | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('id', slotId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch time slot: ${error.message}`);
  }

  return data;
}

/**
 * Validate time slot data
 */
async function validateTimeSlot(timeSlot: Partial<TimeSlot>): Promise<TimeSlotValidation> {
  try {
    const errors: string[] = [];
    const supabase = createClient();

    if (!timeSlot.school_id) {
      errors.push('School ID is required');
    }

    if (!timeSlot.day_of_week) {
      errors.push('Day of week is required');
    } else {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (!validDays.includes(timeSlot.day_of_week.toLowerCase())) {
        errors.push('Invalid day of week');
      }
    }

    if (!timeSlot.start_time) {
      errors.push('Start time is required');
    } else if (!isValidTime(timeSlot.start_time)) {
      errors.push('Invalid start time format (should be HH:MM)');
    }

    if (!timeSlot.end_time) {
      errors.push('End time is required');
    } else if (!isValidTime(timeSlot.end_time)) {
      errors.push('Invalid end time format (should be HH:MM)');
    }

    if (timeSlot.school_id && timeSlot.day_of_week) {
      // Get school working hours and days
      const { data: school } = await supabase
        .from('schools')
        .select('start_time, end_time, working_days')
        .eq('id', timeSlot.school_id)
        .single();

      if (school) {
        // Check if it's a working day
        const isWorkingDay = school.working_days.includes(timeSlot.day_of_week.toLowerCase());
        if (!isWorkingDay) {
          errors.push('Time slot cannot be set on a non-working day');
        }

        // Check if within school hours
        if (timeSlot.start_time && timeSlot.end_time) {
          const schoolStart = new Date(`1970-01-01T${school.start_time}`);
          const schoolEnd = new Date(`1970-01-01T${school.end_time}`);
          const slotStart = new Date(`1970-01-01T${timeSlot.start_time}`);
          const slotEnd = new Date(`1970-01-01T${timeSlot.end_time}`);

          if (slotStart < schoolStart) {
            errors.push('Time slot cannot start before school hours');
          }

          if (slotEnd > schoolEnd) {
            errors.push('Time slot cannot end after school hours');
          }

          if (slotEnd <= slotStart) {
            errors.push('End time must be after start time');
          }

          // Calculate duration
          const durationMinutes = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
          if (durationMinutes < 30) {
            errors.push('Time slot must be at least 30 minutes');
          }
          if (durationMinutes > 120) {
            errors.push('Time slot cannot exceed 120 minutes');
          }

          // Check for overlapping time slots
          const { data: existingSlots } = await supabase
            .from('time_slots')
            .select('*')
            .eq('school_id', timeSlot.school_id)
            .eq('day_of_week', timeSlot.day_of_week)
            .neq('id', timeSlot.id || '')
            .or(`start_time.lte.${timeSlot.end_time},end_time.gte.${timeSlot.start_time}`);

          const overlapsExistingSlot = existingSlots && existingSlots.length > 0;
          if (overlapsExistingSlot) {
            errors.push('Time slot overlaps with existing slots');
          }

          // Check for breaks during this time
          const { data: breaks } = await supabase
            .from('breaks')
            .select('*')
            .eq('school_id', timeSlot.school_id)
            .eq('day_of_week', timeSlot.day_of_week)
            .or(`start_time.lte.${timeSlot.end_time},end_time.gte.${timeSlot.start_time}`);

          const overlapsBreak = breaks && breaks.length > 0;

          return {
            isValid: errors.length === 0,
            message: errors.join(', '),
            details: {
              duration_minutes: durationMinutes,
              overlaps_break: overlapsBreak,
              overlaps_existing_slot: overlapsExistingSlot,
              is_within_school_hours: slotStart >= schoolStart && slotEnd <= schoolEnd,
              is_working_day: isWorkingDay
            }
          };
        }
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
 * Create a new time slot with validation
 */
export async function createTimeSlot(
  timeSlot: Omit<TimeSlot, 'id' | 'created_at'>
): Promise<{ data: TimeSlot | null; error: string | null }> {
  try {
    // Validate time slot
    const validation = await validateTimeSlot(timeSlot);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('time_slots')
      .insert(timeSlot)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create time slot', error);
  }
}

/**
 * Update a time slot with validation
 */
export async function updateTimeSlot(
  id: string,
  updates: Partial<TimeSlot>
): Promise<{ data: TimeSlot | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current time slot
    const { data: currentTimeSlot } = await supabase
      .from('time_slots')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentTimeSlot) {
      return { data: null, error: 'Time slot not found' };
    }

    const updatedTimeSlot = { ...currentTimeSlot, ...updates };

    // Validate updated time slot
    const validation = await validateTimeSlot(updatedTimeSlot);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const { data, error } = await supabase
      .from('time_slots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to update time slot', error);
  }
}

/**
 * Delete a time slot
 */
export async function deleteTimeSlot(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Check if time slot exists
    const { data: timeSlot } = await supabase
      .from('time_slots')
      .select('id')
      .eq('id', id)
      .single();

    if (!timeSlot) {
      return { success: false, error: 'Time slot not found' };
    }

    // Check for dependencies
    const dependencies = await checkTimeSlotDependencies(id);
    if (dependencies.hasDependencies) {
      return {
        success: false,
        error: `Cannot delete time slot: ${dependencies.message}`
      };
    }

    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to delete time slot', error);
  }
}

/**
 * Helper function to check time slot dependencies
 */
async function checkTimeSlotDependencies(
  timeSlotId: string
): Promise<{ hasDependencies: boolean; message: string }> {
  const supabase = createClient();

  // Check for teaching assignments using this time slot
  const { count: assignmentCount } = await supabase
    .from('teaching_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('time_slot_id', timeSlotId);

  // Check for breaks using this time slot
  const { count: breakCount } = await supabase
    .from('breaks')
    .select('*', { count: 'exact', head: true })
    .eq('time_slot_id', timeSlotId);

  const dependencies = [];
  if (assignmentCount) dependencies.push(`${assignmentCount} teaching assignments`);
  if (breakCount) dependencies.push(`${breakCount} breaks`);

  return {
    hasDependencies: dependencies.length > 0,
    message: dependencies.length > 0
      ? `Time slot has active ${dependencies.join(', ')}`
      : ''
  };
}

/**
 * Get time slots summary for a school
 */
export async function getTimeSlotsSummary(schoolId: string): Promise<TimeSlotSummary> {
  const slots = await getTimeSlots(schoolId);
  
  const totalSlots = slots.length;
  const teachingPeriods = slots.filter(slot => slot.is_teaching_period).length;
  const breakPeriods = slots.filter(slot => !slot.is_teaching_period).length;
  
  const totalHoursPerWeek = slots.reduce((total, slot) => {
    const start = new Date(`2000-01-01T${slot.start_time}`);
    const end = new Date(`2000-01-01T${slot.end_time}`);
    return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);
  
  const averagePeriodDuration = totalSlots > 0 
    ? slots.reduce((total, slot) => {
        const start = new Date(`2000-01-01T${slot.start_time}`);
        const end = new Date(`2000-01-01T${slot.end_time}`);
        return total + (end.getTime() - start.getTime()) / (1000 * 60);
      }, 0) / totalSlots
    : 0;
  
  const daysWithSlots = new Set(slots.map(slot => slot.day_of_week)).size;
  
  return {
    total_slots: totalSlots,
    teaching_periods: teachingPeriods,
    break_periods: breakPeriods,
    total_hours_per_week: totalHoursPerWeek,
    average_period_duration: averagePeriodDuration,
    days_with_slots: daysWithSlots,
  };
}

/**
 * Validate time slot data
 */
export function validateTimeSlotData(slotData: Partial<TimeSlot>): { isValid: boolean; message: string } {
  // Validate day of week
  if (slotData.day_of_week !== undefined && (slotData.day_of_week < 0 || slotData.day_of_week > 6)) {
    return { isValid: false, message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' };
  }

  // Validate time format and logic
  if (slotData.start_time && slotData.end_time) {
    const startTime = slotData.start_time;
    const endTime = slotData.end_time;
    
    // Validate time format (HH:MM:SS)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return { isValid: false, message: 'Time format must be HH:MM:SS' };
    }
    
    // Validate that end time is after start time
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (end <= start) {
      return { isValid: false, message: 'End time must be after start time' };
    }
    
    // Validate period duration (minimum 15 minutes, maximum 4 hours)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      return { isValid: false, message: 'Period duration must be at least 15 minutes' };
    }
    if (durationMinutes > 240) {
      return { isValid: false, message: 'Period duration cannot exceed 4 hours' };
    }
  }

  // Validate period number
  if (slotData.period_number !== undefined && slotData.period_number !== null) {
    if (slotData.period_number < 1) {
      return { isValid: false, message: 'Period number must be at least 1' };
    }
  }

  return { isValid: true, message: 'Time slot data is valid' };
}

/**
 * Validate time slot for a specific school and day
 */
export async function validateTimeSlotForSchool(
  schoolId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<{ isValid: boolean; message: string }> {
  const supabase = createClient();
  
  // Check for overlapping time slots
  let query = supabase
    .from('time_slots')
    .select('id, start_time, end_time')
    .eq('school_id', schoolId)
    .eq('day_of_week', dayOfWeek)
    .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: overlapping } = await query;

  if (overlapping && overlapping.length > 0) {
    return { isValid: false, message: 'Time slot overlaps with existing time slots on this day' };
  }

  return { isValid: true, message: 'Time slot is valid' };
}

/**
 * Bulk create time slots for a school
 */
export async function bulkCreateTimeSlots(schoolId: string, slots: Omit<TimeSlotInsert, 'school_id'>[]): Promise<TimeSlot[]> {
  const supabase = createClient();
  
  // Validate all slots first
  for (const slot of slots) {
    const validation = validateTimeSlotData(slot);
    if (!validation.isValid) {
      throw new Error(`Invalid time slot data: ${validation.message}`);
    }
  }

  // Add school_id to all slots
  const slotsWithSchoolId = slots.map(slot => ({ ...slot, school_id: schoolId }));

  const { data, error } = await supabase
    .from('time_slots')
    .insert(slotsWithSchoolId)
    .select();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('time_slots_school_day_time_unique')) {
        throw new Error('One or more time slots overlap with existing time slots');
      }
      if (error.message.includes('time_slots_school_day_period_unique')) {
        throw new Error('One or more period numbers already exist for the specified days');
      }
    }
    throw new Error(`Failed to create time slots: ${error.message}`);
  }

  return data || [];
}

/**
 * Get teaching periods only
 */
export async function getTeachingPeriods(schoolId: string): Promise<TimeSlot[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_teaching_period', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch teaching periods: ${error.message}`);
  }

  return data || [];
}

/**
 * Get break periods only
 */
export async function getBreakPeriods(schoolId: string): Promise<TimeSlot[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_teaching_period', false)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch break periods: ${error.message}`);
  }

  return data || [];
}

/**
 * Generate default time slots for a school based on school configuration
 */
export async function generateDefaultTimeSlots(schoolId: string): Promise<TimeSlot[]> {
  const supabase = createClient();
  
  // Get school configuration
  const { data: school } = await supabase
    .from('schools')
    .select('start_time, end_time, period_duration, sessions_per_day, working_days')
    .eq('id', schoolId)
    .single();

  if (!school) {
    throw new Error('School not found');
  }

  if (!school.start_time || !school.end_time || !school.sessions_per_day) {
    throw new Error('School configuration is incomplete. Please set start time, end time, and sessions per day.');
  }

  const workingDays = school.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayMap: { [key: string]: number } = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  const slots: Omit<TimeSlotInsert, 'school_id'>[] = [];
  
  workingDays.forEach(day => {
    const dayOfWeek = dayMap[day.toLowerCase()];
    if (dayOfWeek === undefined) return;

    const startTime = new Date(`2000-01-01T${school.start_time}`);
    const periodDuration = school.period_duration ?? 40; // Default to 40 minutes if null
    const periodDurationMs = periodDuration * 60 * 1000; // Convert minutes to milliseconds
    
    const sessionsPerDay = school.sessions_per_day ?? 7; // Default to 7 if null
    for (let i = 0; i < sessionsPerDay; i++) {
      const periodStart = new Date(startTime.getTime() + (i * periodDurationMs));
      const periodEnd = new Date(periodStart.getTime() + periodDurationMs);
      
      // Check if period extends beyond school end time
      const schoolEnd = new Date(`2000-01-01T${school.end_time}`);
      if (periodEnd > schoolEnd) break;
      
      slots.push({
        day_of_week: dayOfWeek,
        start_time: periodStart.toTimeString().slice(0, 8),
        end_time: periodEnd.toTimeString().slice(0, 8),
        period_number: i + 1,
        is_teaching_period: true,
        slot_name: `Period ${i + 1}`,
      });
    }
  });

  return bulkCreateTimeSlots(schoolId, slots);
}

/**
 * Get time slots for a school
 */
export async function getSchoolTimeSlots(
  schoolId: string
): Promise<{ data: TimeSlot[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('school_id', schoolId)
      .order('day_of_week')
      .order('start_time');

    if (error) throw error;

    const convertedTimeSlots = data
      .map(convertToTimeSlot)
      .filter((slot): slot is TimeSlot => slot !== null);

    return { data: convertedTimeSlots, error: null };
  } catch (error) {
    return handleError('Failed to get school time slots', error);
  }
}

/**
 * Get available time slots for a teaching assignment
 */
export async function getAvailableTimeSlots(
  teacherId: string,
  classOfferingId: string,
  schoolId: string
): Promise<{ data: TimeSlot[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get school constraints
    const { data: constraintsData } = await supabase
      .from('school_constraints')
      .select('*')
      .eq('school_id', schoolId)
      .single();

    if (!constraintsData) {
      return {
        data: null,
        error: 'School constraints not found'
      };
    }

    const constraints = constraintsData as SchoolConstraints;

    // Get all time slots for the school
    const { data: allTimeSlots } = await supabase
      .from('time_slots')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_teaching_period', true)
      .order('day_of_week')
      .order('start_time');

    if (!allTimeSlots) {
      return { data: null, error: 'No time slots found' };
    }

    // Get teacher's existing assignments
    const { data: teacherAssignments } = await supabase
      .from('teaching_assignments')
      .select(`
        *,
        scheduled_lessons (
          *,
          time_slots (*)
        )
      `)
      .eq('teacher_id', teacherId);

    if (!teacherAssignments) {
      return { data: null, error: 'Failed to get teacher assignments' };
    }

    // Get class's existing assignments
    const { data: classAssignments } = await supabase
      .from('teaching_assignments')
      .select(`
        *,
        scheduled_lessons (
          *,
          time_slots (*)
        )
      `)
      .eq('class_offering_id', classOfferingId);

    if (!classAssignments) {
      return { data: null, error: 'Failed to get class assignments' };
    }

    // Filter out unavailable time slots
    const availableSlots = allTimeSlots.filter(slot => {
      // Check teacher availability
      const teacherUnavailable = teacherAssignments.some(assignment =>
        assignment.scheduled_lessons?.some(lesson =>
          isTimeSlotOverlap(slot, lesson.time_slots)
        )
      );
      if (teacherUnavailable) return false;

      // Check class availability
      const classUnavailable = classAssignments.some(assignment =>
        assignment.scheduled_lessons?.some(lesson =>
          isTimeSlotOverlap(slot, lesson.time_slots)
        )
      );
      if (classUnavailable) return false;

      return true;
    });

    const convertedTimeSlots = availableSlots
      .map(convertToTimeSlot)
      .filter((slot): slot is TimeSlot => slot !== null);

    return { data: convertedTimeSlots, error: null };
  } catch (error) {
    return handleError('Failed to get available time slots', error);
  }
}

/**
 * Helper function to check if two time slots overlap
 */
function isTimeSlotOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.day_of_week !== slot2.day_of_week) return false;

  const slot1Start = new Date(`1970-01-01T${slot1.start_time}`);
  const slot1End = new Date(`1970-01-01T${slot1.end_time}`);
  const slot2Start = new Date(`1970-01-01T${slot2.start_time}`);
  const slot2End = new Date(`1970-01-01T${slot2.end_time}`);

  return (
    (slot1Start >= slot2Start && slot1Start < slot2End) ||
    (slot2Start >= slot1Start && slot2Start < slot1End)
  );
}

/**
 * Helper function to validate time format
 */
function isValidTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
} 