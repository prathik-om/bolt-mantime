import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

type TimeSlot = Database['public']['Tables']['time_slots']['Row'];
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
 * Create a new time slot
 */
export async function createTimeSlot(slotData: TimeSlotInsert): Promise<TimeSlot> {
  const supabase = createClient();
  
  // Validate time format and logic
  const validation = validateTimeSlotData(slotData);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  const { data, error } = await supabase
    .from('time_slots')
    .insert(slotData)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('time_slots_school_day_time_unique')) {
        throw new Error('A time slot with the same start and end time already exists for this day');
      }
      if (error.message.includes('time_slots_school_day_period_unique')) {
        throw new Error(`Period number ${slotData.period_number} already exists for this day`);
      }
    }
    throw new Error(`Failed to create time slot: ${error.message}`);
  }

  return data;
}

/**
 * Update a time slot
 */
export async function updateTimeSlot(slotId: string, updates: TimeSlotUpdate): Promise<TimeSlot> {
  const supabase = createClient();
  
  // Validate time format and logic
  const validation = validateTimeSlotData(updates);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  const { data, error } = await supabase
    .from('time_slots')
    .update(updates)
    .eq('id', slotId)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('time_slots_school_day_time_unique')) {
        throw new Error('A time slot with the same start and end time already exists for this day');
      }
      if (error.message.includes('time_slots_school_day_period_unique')) {
        throw new Error(`Period number ${updates.period_number} already exists for this day`);
      }
    }
    throw new Error(`Failed to update time slot: ${error.message}`);
  }

  return data;
}

/**
 * Delete a time slot
 */
export async function deleteTimeSlot(slotId: string): Promise<void> {
  const supabase = createClient();
  
  // Check if this time slot is being used in any scheduled lessons
  const { data: scheduledLessons } = await supabase
    .from('scheduled_lessons')
    .select('id')
    .eq('timeslot_id', slotId)
    .limit(1);

  if (scheduledLessons && scheduledLessons.length > 0) {
    throw new Error('Cannot delete time slot: it is being used in scheduled lessons');
  }

  // Check if this time slot is being used in teacher time constraints
  const { data: constraints } = await supabase
    .from('teacher_time_constraints')
    .select('id')
    .eq('time_slot_id', slotId)
    .limit(1);

  if (constraints && constraints.length > 0) {
    throw new Error('Cannot delete time slot: it is being used in teacher time constraints');
  }

  const { error } = await supabase
    .from('time_slots')
    .delete()
    .eq('id', slotId);

  if (error) {
    throw new Error(`Failed to delete time slot: ${error.message}`);
  }
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