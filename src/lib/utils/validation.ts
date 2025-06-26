import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';
import type { 
  TimeSlot, 
  TeachingAssignment, 
  SchoolConstraints,
  Teacher,
  ClassOffering,
  Room
} from '../types/database-helpers';

import { 
  isTimeSlot, 
  isTeachingAssignment, 
  isSchoolConstraints,
  isValidTimeRange,
  isValidDayOfWeek,
  isValidWorkingDays,
  isValidPeriodCount
} from './type-guards';

type AcademicYear = Database['public']['Tables']['academic_years']['Row'];
type Term = Database['public']['Tables']['terms']['Row'];
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
 * Time slot validation
 */
export function validateTimeSlot(timeSlot: TimeSlot): string[] {
  const errors: string[] = [];

  if (!isTimeSlot(timeSlot)) {
    errors.push('Invalid time slot format');
    return errors;
  }

  if (!isValidDayOfWeek(timeSlot.day_of_week)) {
    errors.push('Invalid day of week');
  }

  if (!isValidTimeRange(timeSlot.start_time, timeSlot.end_time)) {
    errors.push('End time must be after start time');
  }

  return errors;
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
  if (data.term_id && data.class_id && data.course_id) {
    let query = supabase
      .from('class_offerings')
      .select('id')
      .eq('term_id', data.term_id)
      .eq('class_id', data.class_id)
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
 * Teaching assignment validation
 */
export function validateTeachingAssignment(
  assignment: TeachingAssignment,
  existingAssignments: TeachingAssignment[] = []
): string[] {
  const errors: string[] = [];

  if (!isTeachingAssignment(assignment)) {
    errors.push('Invalid teaching assignment format');
    return errors;
  }

  // Check for teacher workload
  const teacherAssignments = existingAssignments.filter(
    a => a.teacher_id === assignment.teacher_id
  );
  const totalPeriods = teacherAssignments.reduce((sum, a) => 
    sum + (a.class_offerings?.periods_per_week || 0), 0
  );

  const maxPeriodsPerWeek = assignment.teacher?.max_periods_per_week;
  if (maxPeriodsPerWeek && totalPeriods > maxPeriodsPerWeek) {
    errors.push(`Exceeds teacher's maximum periods per week (${maxPeriodsPerWeek})`);
  }

  // Check for class offering validity
  if (!assignment.class_offerings) {
    errors.push('Missing class offering details');
  } else {
    if (!isValidPeriodCount(assignment.class_offerings.periods_per_week)) {
      errors.push('Invalid number of periods per week');
    }
  }

  return errors;
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
    
    // Check for duplicate holidays for the same school, academic year, and date
    if (data.school_id && 'academic_year_id' in data && typeof data.academic_year_id === 'string' && data.academic_year_id) {
      let query = supabase
        .from('holidays')
        .select('id')
        .eq('school_id', data.school_id)
        .eq('academic_year_id', data.academic_year_id)
        .eq('date', data.date);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data: existing } = await query;
      
      if (existing && existing.length > 0) {
        return { isValid: false, message: 'A holiday already exists for this date in this school and academic year' };
      }
    }
    
    // Check if holiday date is within academic year dates
    if ('academic_year_id' in data && typeof data.academic_year_id === 'string' && data.academic_year_id) {
      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('start_date, end_date')
        .eq('id', data.academic_year_id)
        .single();
      
      if (academicYear) {
        const yearStart = new Date(academicYear.start_date);
        const yearEnd = new Date(academicYear.end_date);
        
        if (holidayDate < yearStart || holidayDate > yearEnd) {
          return { isValid: false, message: 'Holiday date must be within the academic year dates' };
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
  
  const periodDuration = school.period_duration ?? 40; // Default to 40 minutes if null
  const sessionsPerDay = school.sessions_per_day ?? 7; // Default to 7 if null
  const requiredMinutes = periodDuration * sessionsPerDay;
  
  const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  
  if (totalMinutes < requiredMinutes) {
    return { 
      isValid: false, 
      message: `School day is too short for ${sessionsPerDay} periods of ${periodDuration} minutes each` 
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
  const { data: assigned } = await supabase
    .from('teaching_assignments')
    .select('class_offering_id');

  const assignedIds = (assigned || []).map(a => a.class_offering_id);

  const { data: unassignedOfferings } = await supabase
    .from('class_offerings')
    .select('id, courses(name), classes(name)')
    .eq('courses.school_id', schoolId)
    .not('id', 'in', assignedIds.length > 0 ? assignedIds : ['']);
  
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

/**
 * School constraints validation
 */
export function validateSchoolConstraints(constraints: SchoolConstraints): string[] {
  const errors: string[] = [];

  if (!isSchoolConstraints(constraints)) {
    errors.push('Invalid school constraints format');
    return errors;
  }

  if (constraints.minLessonsPerDay > constraints.maxLessonsPerDay) {
    errors.push('Minimum lessons per day cannot exceed maximum lessons per day');
  }

  if (constraints.maxLessonsPerDay > 12) { // Assuming reasonable max
    errors.push('Maximum lessons per day cannot exceed 12');
  }

  if (constraints.minLessonsPerDay < 1) {
    errors.push('Minimum lessons per day must be at least 1');
  }

  if (constraints.maxConsecutiveLessons < 1) {
    errors.push('Maximum consecutive lessons must be at least 1');
  }

  if (constraints.maxConsecutiveLessons > constraints.maxLessonsPerDay) {
    errors.push('Maximum consecutive lessons cannot exceed maximum lessons per day');
  }

  return errors;
}

/**
 * Schedule validation
 */
export function validateSchedule(
  assignments: TeachingAssignment[],
  timeSlots: TimeSlot[],
  constraints: SchoolConstraints
): string[] {
  const errors: string[] = [];

  // Validate individual components first
  assignments.forEach(assignment => {
    const assignmentErrors = validateTeachingAssignment(assignment);
    errors.push(...assignmentErrors.map(e => `Assignment ${assignment.id}: ${e}`));
  });

  timeSlots.forEach(slot => {
    const slotErrors = validateTimeSlot(slot);
    errors.push(...slotErrors.map(e => `Time slot ${slot.id}: ${e}`));
  });

  const constraintErrors = validateSchoolConstraints(constraints);
  errors.push(...constraintErrors);

  if (errors.length > 0) return errors;

  // Validate schedule as a whole
  const teacherSchedules = groupByTeacher(assignments);
  
  // Check for teacher conflicts
  Object.entries(teacherSchedules).forEach(([teacherId, teacherAssignments]) => {
    const teacherTimeSlots = teacherAssignments.flatMap(a => 
      a.scheduled_lessons?.map(l => l.time_slots) || []
    );

    // Check for overlapping slots
    for (let i = 0; i < teacherTimeSlots.length; i++) {
      for (let j = i + 1; j < teacherTimeSlots.length; j++) {
        if (hasTimeSlotOverlap(teacherTimeSlots[i], teacherTimeSlots[j])) {
          errors.push(`Teacher ${teacherId} has overlapping lessons`);
        }
      }
    }

    // Check consecutive lessons
    const consecutiveCheck = checkConsecutiveLessons(teacherTimeSlots, constraints);
    if (!consecutiveCheck.isValid) {
      errors.push(
        `Teacher ${teacherId} has ${consecutiveCheck.consecutiveCount} consecutive lessons ` +
        `(max allowed: ${constraints.maxConsecutiveLessons})`
      );
    }

    // Check daily lessons
    const dailyCheck = checkDailyLessons(teacherTimeSlots, constraints);
    if (!dailyCheck.isValid) {
      Object.entries(dailyCheck.lessonsByDay).forEach(([day, count]) => {
        if (count < constraints.minLessonsPerDay) {
          errors.push(
            `Teacher ${teacherId} has only ${count} lessons on ${getDayName(Number(day))} ` +
            `(min required: ${constraints.minLessonsPerDay})`
          );
        }
        if (count > constraints.maxLessonsPerDay) {
          errors.push(
            `Teacher ${teacherId} has ${count} lessons on ${getDayName(Number(day))} ` +
            `(max allowed: ${constraints.maxLessonsPerDay})`
          );
        }
      });
    }
  });

  return errors;
}

/**
 * Helper functions
 */
function groupByTeacher(assignments: TeachingAssignment[]): Record<string, TeachingAssignment[]> {
  return assignments.reduce((acc, assignment) => {
    const teacherId = assignment.teacher_id;
    if (!acc[teacherId]) {
      acc[teacherId] = [];
    }
    acc[teacherId].push(assignment);
    return acc;
  }, {} as Record<string, TeachingAssignment[]>);
}

function hasTimeSlotOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
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

function checkConsecutiveLessons(
  timeSlots: TimeSlot[],
  constraints: SchoolConstraints
): { isValid: boolean; consecutiveCount: number } {
  let maxConsecutive = 1;
  let currentConsecutive = 1;

  const sortedSlots = [...timeSlots].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return a.start_time.localeCompare(b.start_time);
  });

  for (let i = 1; i < sortedSlots.length; i++) {
    const prevSlot = sortedSlots[i - 1];
    const currSlot = sortedSlots[i];

    if (prevSlot.day_of_week === currSlot.day_of_week) {
      const prevEnd = new Date(`1970-01-01T${prevSlot.end_time}`);
      const currStart = new Date(`1970-01-01T${currSlot.start_time}`);
      
      if ((currStart.getTime() - prevEnd.getTime()) / 1000 / 60 < 5) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    } else {
      currentConsecutive = 1;
    }
  }

  return {
    isValid: maxConsecutive <= constraints.maxConsecutiveLessons,
    consecutiveCount: maxConsecutive
  };
}

function checkDailyLessons(
  timeSlots: TimeSlot[],
  constraints: SchoolConstraints
): { isValid: boolean; lessonsByDay: Record<number, number> } {
  const lessonsByDay: Record<number, number> = {};

  timeSlots.forEach(slot => {
    lessonsByDay[slot.day_of_week] = (lessonsByDay[slot.day_of_week] || 0) + 1;
  });

  const isValid = Object.values(lessonsByDay).every(count =>
    count >= constraints.minLessonsPerDay && count <= constraints.maxLessonsPerDay
  );

  return { isValid, lessonsByDay };
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
} 