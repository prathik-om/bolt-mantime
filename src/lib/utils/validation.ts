import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

type AcademicYear = Database['public']['Tables']['academic_years']['Row'];
type Term = Database['public']['Tables']['terms']['Row'];
type TimeSlot = Database['public']['Tables']['time_slots']['Row'];
type ClassOffering = Database['public']['Tables']['class_offerings']['Row'];
type TeachingAssignment = Database['public']['Tables']['teaching_assignments']['Row'];
type Holiday = Database['public']['Tables']['holidays']['Row'];

export interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: any;
}

/**
 * Validate academic year data
 */
export async function validateAcademicYear(
  data: Partial<AcademicYear>,
  excludeId?: string
): Promise<ValidationResult> {
  const supabase = createClient();
  
  // Basic validation
  if (data.name && data.name.trim().length === 0) {
    return { isValid: false, message: 'Academic year name is required' };
  }
  
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    
    if (endDate <= startDate) {
      return { isValid: false, message: 'End date must be after start date' };
    }
    
    // Check for overlapping academic years
    if (data.school_id) {
      let query = supabase
        .from('academic_years')
        .select('id')
        .eq('school_id', data.school_id)
        .or(`start_date.lte.${data.end_date},end_date.gte.${data.start_date}`);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data: overlapping } = await query;
      
      if (overlapping && overlapping.length > 0) {
        return { isValid: false, message: 'Academic year dates overlap with existing academic year' };
      }
    }
  }
  
  return { isValid: true, message: 'Academic year data is valid' };
}

/**
 * Validate term data
 */
export async function validateTerm(
  data: Partial<Term>,
  excludeId?: string
): Promise<ValidationResult> {
  const supabase = createClient();
  
  // Basic validation
  if (data.name && data.name.trim().length === 0) {
    return { isValid: false, message: 'Term name is required' };
  }
  
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    
    if (endDate <= startDate) {
      return { isValid: false, message: 'Term end date must be after start date' };
    }
    
    // Check if term dates are within academic year
    if (data.academic_year_id) {
      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('start_date, end_date')
        .eq('id', data.academic_year_id)
        .single();
      
      if (academicYear) {
        const yearStart = new Date(academicYear.start_date);
        const yearEnd = new Date(academicYear.end_date);
        
        if (startDate < yearStart || endDate > yearEnd) {
          return { isValid: false, message: 'Term dates must be within the academic year dates' };
        }
      }
    }
    
    // Check for overlapping terms in the same academic year
    if (data.academic_year_id) {
      let query = supabase
        .from('terms')
        .select('id')
        .eq('academic_year_id', data.academic_year_id)
        .or(`start_date.lte.${data.end_date},end_date.gte.${data.start_date}`);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data: overlapping } = await query;
      
      if (overlapping && overlapping.length > 0) {
        return { isValid: false, message: 'Term dates overlap with existing term in this academic year' };
      }
    }
  }
  
  return { isValid: true, message: 'Term data is valid' };
}

/**
 * Validate time slot data
 */
export function validateTimeSlot(data: Partial<TimeSlot>): ValidationResult {
  // Validate day of week
  if (data.day_of_week !== undefined && (data.day_of_week < 0 || data.day_of_week > 6)) {
    return { isValid: false, message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' };
  }
  
  // Validate time format and logic
  if (data.start_time && data.end_time) {
    const startTime = data.start_time;
    const endTime = data.end_time;
    
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
  if (data.period_number !== undefined && data.period_number !== null) {
    if (data.period_number < 1) {
      return { isValid: false, message: 'Period number must be at least 1' };
    }
  }
  
  return { isValid: true, message: 'Time slot data is valid' };
}

/**
 * Validate time slot for a specific school and day (checks for overlaps)
 */
export async function validateTimeSlotForSchool(
  schoolId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<ValidationResult> {
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
    return { 
      isValid: false, 
      message: 'Time slot overlaps with existing time slots on this day',
      details: overlapping
    };
  }
  
  return { isValid: true, message: 'Time slot is valid' };
}

/**
 * Validate class offering data
 */
export async function validateClassOffering(
  data: Partial<ClassOffering>,
  excludeId?: string
): Promise<ValidationResult> {
  const supabase = createClient();
  
  // Basic validation
  if (data.periods_per_week !== undefined && data.periods_per_week < 1) {
    return { isValid: false, message: 'Periods per week must be at least 1' };
  }
  
  if (data.required_hours_per_term !== undefined && data.required_hours_per_term !== null) {
    if (data.required_hours_per_term < 0) {
      return { isValid: false, message: 'Required hours per term cannot be negative' };
    }
  }
  
  // Check for duplicate class offering (same term, class, and course)
  if (data.term_id && data.class_section_id && data.course_id) {
    let query = supabase
      .from('class_offerings')
      .select('id')
      .eq('term_id', data.term_id)
      .eq('class_section_id', data.class_section_id)
      .eq('course_id', data.course_id);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data: existing } = await query;
    
    if (existing && existing.length > 0) {
      return { isValid: false, message: 'This course is already offered for this class in this term' };
    }
  }
  
  return { isValid: true, message: 'Class offering data is valid' };
}

/**
 * Validate teaching assignment data
 */
export async function validateTeachingAssignment(
  data: Partial<TeachingAssignment>,
  excludeId?: string
): Promise<ValidationResult> {
  const supabase = createClient();
  
  if (!data.class_offering_id || !data.teacher_id) {
    return { isValid: false, message: 'Class offering ID and teacher ID are required' };
  }
  
  // Check if class offering exists and get school_id
  const { data: classOffering } = await supabase
    .from('class_offerings')
    .select('id, courses(school_id)')
    .eq('id', data.class_offering_id)
    .single();
  
  if (!classOffering) {
    return { isValid: false, message: 'Class offering not found' };
  }
  
  // Check if teacher exists and belongs to the same school
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, school_id')
    .eq('id', data.teacher_id)
    .single();
  
  if (!teacher) {
    return { isValid: false, message: 'Teacher not found' };
  }
  
  if (teacher.school_id !== classOffering.courses?.school_id) {
    return { isValid: false, message: 'Teacher and class offering must belong to the same school' };
  }
  
  // Check if teacher is already assigned to this class offering
  let query = supabase
    .from('teaching_assignments')
    .select('id')
    .eq('class_offering_id', data.class_offering_id)
    .eq('teacher_id', data.teacher_id);
  
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  
  const { data: existingAssignment } = await query;
  
  if (existingAssignment && existingAssignment.length > 0) {
    return { isValid: false, message: 'Teacher is already assigned to this class offering' };
  }
  
  return { isValid: true, message: 'Teaching assignment is valid' };
}

/**
 * Validate holiday data
 */
export async function validateHoliday(
  data: Partial<Holiday>,
  excludeId?: string
): Promise<ValidationResult> {
  const supabase = createClient();
  
  // Basic validation
  if (data.reason && data.reason.trim().length === 0) {
    return { isValid: false, message: 'Holiday reason is required' };
  }
  
  if (data.date) {
    const holidayDate = new Date(data.date);
    const today = new Date();
    
    // Check if date is valid
    if (isNaN(holidayDate.getTime())) {
      return { isValid: false, message: 'Invalid date format' };
    }
    
    // Check for duplicate holidays for the same school and date
    if (data.school_id) {
      let query = supabase
        .from('holidays')
        .select('id')
        .eq('school_id', data.school_id)
        .eq('date', data.date);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data: existing } = await query;
      
      if (existing && existing.length > 0) {
        return { isValid: false, message: 'A holiday already exists for this date in this school' };
      }
    }
    
    // Check if holiday date is within term dates
    if (data.term_id) {
      const { data: term } = await supabase
        .from('terms')
        .select('start_date, end_date')
        .eq('id', data.term_id)
        .single();
      
      if (term) {
        const termStart = new Date(term.start_date);
        const termEnd = new Date(term.end_date);
        
        if (holidayDate < termStart || holidayDate > termEnd) {
          return { isValid: false, message: 'Holiday date must be within the term dates' };
        }
      }
    }
  }
  
  return { isValid: true, message: 'Holiday data is valid' };
}

/**
 * Validate course term hours JSONB structure
 */
export function validateCourseTermHours(termHours: any): ValidationResult {
  if (!termHours || typeof termHours !== 'object') {
    return { isValid: false, message: 'Term hours must be an object' };
  }
  
  for (const [termId, hours] of Object.entries(termHours)) {
    if (typeof hours !== 'number' || hours < 0) {
      return { isValid: false, message: `Invalid hours value for term ${termId}` };
    }
  }
  
  return { isValid: true, message: 'Term hours structure is valid' };
}

/**
 * Validate timetable generation status
 */
export function validateTimetableStatus(status: string): ValidationResult {
  const validStatuses = ['draft', 'generating', 'completed', 'failed', 'published'];
  
  if (!validStatuses.includes(status)) {
    return { 
      isValid: false, 
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
    };
  }
  
  return { isValid: true, message: 'Timetable status is valid' };
}

/**
 * Validate school configuration for time slot generation
 */
export async function validateSchoolTimeConfiguration(schoolId: string): Promise<ValidationResult> {
  const supabase = createClient();
  
  const { data: school } = await supabase
    .from('schools')
    .select('start_time, end_time, period_duration, sessions_per_day, working_days')
    .eq('id', schoolId)
    .single();
  
  if (!school) {
    return { isValid: false, message: 'School not found' };
  }
  
  const missingFields = [];
  if (!school.start_time) missingFields.push('start time');
  if (!school.end_time) missingFields.push('end time');
  if (!school.period_duration) missingFields.push('period duration');
  if (!school.sessions_per_day) missingFields.push('sessions per day');
  
  if (missingFields.length > 0) {
    return { 
      isValid: false, 
      message: `School configuration is incomplete. Missing: ${missingFields.join(', ')}` 
    };
  }
  
  // Validate time logic
  const startTime = new Date(`2000-01-01T${school.start_time}`);
  const endTime = new Date(`2000-01-01T${school.end_time}`);
  
  if (endTime <= startTime) {
    return { isValid: false, message: 'School end time must be after start time' };
  }
  
  const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  const requiredMinutes = school.period_duration * school.sessions_per_day;
  
  if (totalMinutes < requiredMinutes) {
    return { 
      isValid: false, 
      message: `School day is too short for ${school.sessions_per_day} periods of ${school.period_duration} minutes each` 
    };
  }
  
  return { isValid: true, message: 'School time configuration is valid' };
}

/**
 * Validate teacher workload constraints
 */
export async function validateTeacherWorkload(
  teacherId: string,
  additionalPeriods: number = 0
): Promise<ValidationResult> {
  const supabase = createClient();
  
  // Get teacher's current assignments and max periods
  const { data: teacher } = await supabase
    .from('teachers')
    .select(`
      max_periods_per_week,
      teaching_assignments (
        class_offerings (
          periods_per_week
        )
      )
    `)
    .eq('id', teacherId)
    .single();
  
  if (!teacher) {
    return { isValid: false, message: 'Teacher not found' };
  }
  
  const currentPeriods = teacher.teaching_assignments?.reduce((total, assignment) => {
    return total + (assignment.class_offerings?.periods_per_week || 0);
  }, 0) || 0;
  
  const totalPeriods = currentPeriods + additionalPeriods;
  const maxPeriods = teacher.max_periods_per_week || 0;
  
  if (maxPeriods > 0 && totalPeriods > maxPeriods) {
    return { 
      isValid: false, 
      message: `Teacher workload would exceed maximum of ${maxPeriods} periods per week (current: ${currentPeriods}, additional: ${additionalPeriods})` 
    };
  }
  
  return { isValid: true, message: 'Teacher workload is within limits' };
}

/**
 * Comprehensive validation for OR-Tools data integrity
 */
export async function validateORToolsDataIntegrity(schoolId: string): Promise<ValidationResult[]> {
  const supabase = createClient();
  const results: ValidationResult[] = [];
  
  // 1. Check for duplicate academic years
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('id, name, start_date, end_date')
    .eq('school_id', schoolId);
  
  if (academicYears) {
    const nameCounts = new Map<string, number>();
    const dateOverlaps = [];
    
    for (const year of academicYears) {
      // Check name duplicates
      nameCounts.set(year.name, (nameCounts.get(year.name) || 0) + 1);
      
      // Check date overlaps
      for (const otherYear of academicYears) {
        if (year.id !== otherYear.id) {
          const yearStart = new Date(year.start_date);
          const yearEnd = new Date(year.end_date);
          const otherStart = new Date(otherYear.start_date);
          const otherEnd = new Date(otherYear.end_date);
          
          if ((yearStart <= otherEnd && yearEnd >= otherStart)) {
            dateOverlaps.push({ year1: year.name, year2: otherYear.name });
          }
        }
      }
    }
    
    for (const [name, count] of nameCounts) {
      if (count > 1) {
        results.push({
          isValid: false,
          message: `Duplicate academic year name: "${name}" appears ${count} times`,
          details: { type: 'duplicate_name', name, count }
        });
      }
    }
    
    if (dateOverlaps.length > 0) {
      results.push({
        isValid: false,
        message: 'Academic years have overlapping dates',
        details: { type: 'date_overlap', overlaps: dateOverlaps }
      });
    }
  }
  
  // 2. Check for duplicate time slots
  const { data: timeSlots } = await supabase
    .from('time_slots')
    .select('id, day_of_week, start_time, end_time, period_number')
    .eq('school_id', schoolId);
  
  if (timeSlots) {
    const timeOverlaps = [];
    const periodDuplicates = [];
    
    for (const slot of timeSlots) {
      for (const otherSlot of timeSlots) {
        if (slot.id !== otherSlot.id && slot.day_of_week === otherSlot.day_of_week) {
          // Check time overlaps
          const slotStart = new Date(`2000-01-01T${slot.start_time}`);
          const slotEnd = new Date(`2000-01-01T${slot.end_time}`);
          const otherStart = new Date(`2000-01-01T${otherSlot.start_time}`);
          const otherEnd = new Date(`2000-01-01T${otherSlot.end_time}`);
          
          if ((slotStart < otherEnd && slotEnd > otherStart)) {
            timeOverlaps.push({
              slot1: `${slot.day_of_week} ${slot.start_time}-${slot.end_time}`,
              slot2: `${otherSlot.day_of_week} ${otherSlot.start_time}-${otherSlot.end_time}`
            });
          }
          
          // Check period number duplicates
          if (slot.period_number && slot.period_number === otherSlot.period_number) {
            periodDuplicates.push({
              day: slot.day_of_week,
              period: slot.period_number
            });
          }
        }
      }
    }
    
    if (timeOverlaps.length > 0) {
      results.push({
        isValid: false,
        message: 'Time slots have overlapping times',
        details: { type: 'time_overlap', overlaps: timeOverlaps }
      });
    }
    
    if (periodDuplicates.length > 0) {
      results.push({
        isValid: false,
        message: 'Duplicate period numbers found',
        details: { type: 'period_duplicate', duplicates: periodDuplicates }
      });
    }
  }
  
  // 3. Check for unassigned class offerings
  const { data: unassignedOfferings } = await supabase
    .from('class_offerings')
    .select('id, courses(name), classes(name)')
    .eq('courses.school_id', schoolId)
    .not('id', 'in', (
      select('class_offering_id')
      .from('teaching_assignments')
    ));
  
  if (unassignedOfferings && unassignedOfferings.length > 0) {
    results.push({
      isValid: false,
      message: `${unassignedOfferings.length} class offerings are not assigned to teachers`,
      details: { 
        type: 'unassigned_offerings', 
        count: unassignedOfferings.length,
        offerings: unassignedOfferings.map(o => ({
          id: o.id,
          course: o.courses?.name,
          class: o.classes?.name
        }))
      }
    });
  }
  
  return results;
} 