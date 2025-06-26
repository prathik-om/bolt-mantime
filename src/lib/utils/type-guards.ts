import type { 
  TimeSlot, 
  TeachingAssignment, 
  SchoolConstraints,
  Teacher,
  ClassOffering,
  Course,
  Room,
  ScheduledLesson
} from '../types/database-helpers';

/**
 * Type guards for core entities
 */
export function isTimeSlot(obj: any): obj is TimeSlot {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.day_of_week === 'number' &&
    typeof obj.start_time === 'string' &&
    typeof obj.end_time === 'string' &&
    typeof obj.is_teaching_period === 'boolean'
  );
}

export function isTeachingAssignment(obj: any): obj is TeachingAssignment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.teacher_id === 'string' &&
    typeof obj.class_offering_id === 'string' &&
    typeof obj.assigned_at === 'string'
  );
}

export function isSchoolConstraints(obj: any): obj is SchoolConstraints {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.maxLessonsPerDay === 'number' &&
    typeof obj.minLessonsPerDay === 'number' &&
    typeof obj.maxConsecutiveLessons === 'number' &&
    typeof obj.breakRequired === 'boolean'
  );
}

export function isTeacher(obj: any): obj is Teacher {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.first_name === 'string' &&
    typeof obj.last_name === 'string' &&
    typeof obj.email === 'string' &&
    (obj.max_periods_per_week === null || typeof obj.max_periods_per_week === 'number')
  );
}

export function isClassOffering(obj: any): obj is ClassOffering {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.periods_per_week === 'number' &&
    typeof obj.term_id === 'string'
  );
}

/**
 * Type guards for relationships
 */
export function hasTeacherRelation(obj: any): obj is { teacher: Teacher } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isTeacher(obj.teacher)
  );
}

export function hasClassOfferingRelation(obj: any): obj is { class_offering: ClassOffering } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isClassOffering(obj.class_offering)
  );
}

/**
 * Type converters
 */
export function convertToTimeSlot(data: any): TimeSlot | null {
  if (!data || typeof data !== 'object') return null;

  try {
    const timeSlot: TimeSlot = {
      id: String(data.id),
      day_of_week: Number(data.day_of_week),
      start_time: String(data.start_time),
      end_time: String(data.end_time),
      is_teaching_period: Boolean(data.is_teaching_period),
      school_id: String(data.school_id),
      created_at: data.created_at ? String(data.created_at) : new Date().toISOString()
    };

    return isTimeSlot(timeSlot) ? timeSlot : null;
  } catch {
    return null;
  }
}

export function convertToTeachingAssignment(data: any): TeachingAssignment | null {
  if (!data || typeof data !== 'object') return null;

  try {
    const assignment: TeachingAssignment = {
      id: String(data.id),
      teacher_id: String(data.teacher_id),
      class_offering_id: String(data.class_offering_id),
      assigned_at: data.assigned_at ? String(data.assigned_at) : new Date().toISOString(),
      school_id: String(data.school_id)
    };

    return isTeachingAssignment(assignment) ? assignment : null;
  } catch {
    return null;
  }
}

export function convertToSchoolConstraints(data: any): SchoolConstraints | null {
  if (!data || typeof data !== 'object') return null;

  try {
    const constraints: SchoolConstraints = {
      maxLessonsPerDay: Number(data.maxLessonsPerDay),
      minLessonsPerDay: Number(data.minLessonsPerDay),
      maxConsecutiveLessons: Number(data.maxConsecutiveLessons),
      breakRequired: Boolean(data.breakRequired)
    };

    return isSchoolConstraints(constraints) ? constraints : null;
  } catch {
    return null;
  }
}

/**
 * Validation type guards
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  try {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    return start < end;
  } catch {
    return false;
  }
}

export function isValidDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

export function isValidWorkingDays(days: any[]): boolean {
  if (!Array.isArray(days)) return false;
  return days.every(day => isValidDayOfWeek(day));
}

export function isValidPeriodCount(count: number): boolean {
  return Number.isInteger(count) && count > 0 && count <= 20; // Assuming max 20 periods per week
}

/**
 * Complex type guards
 */
export function isScheduledLesson(obj: any): obj is ScheduledLesson {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.teaching_assignment_id === 'string' &&
    typeof obj.timeslot_id === 'string' &&
    typeof obj.date === 'string' &&
    (!obj.room_id || typeof obj.room_id === 'string')
  );
}

export function hasValidSchedule(
  assignment: TeachingAssignment,
  timeSlots: TimeSlot[],
  constraints: SchoolConstraints
): boolean {
  // Check if assignment has required periods
  const periodsPerWeek = assignment.class_offerings?.periods_per_week;
  if (!periodsPerWeek || !isValidPeriodCount(periodsPerWeek)) return false;

  // Check if time slots are valid
  if (!timeSlots.every(isTimeSlot)) return false;

  // Check if constraints are valid
  if (!isSchoolConstraints(constraints)) return false;

  // Check consecutive lessons
  const consecutiveCheck = checkConsecutiveLessons(timeSlots, constraints);
  if (!consecutiveCheck.isValid) return false;

  // Check daily lessons
  const dailyCheck = checkDailyLessons(timeSlots, constraints);
  if (!dailyCheck.isValid) return false;

  return true;
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