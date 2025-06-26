import { TimeSlot, TeachingAssignment, SchoolConstraints } from '../types/database-helpers';

/**
 * Time-related helper functions
 */
export function parseTimeSlot(timeSlot: TimeSlot) {
  const startTime = new Date(`1970-01-01T${timeSlot.start_time}`);
  const endTime = new Date(`1970-01-01T${timeSlot.end_time}`);
  
  return {
    startTime,
    endTime,
    durationMinutes: (endTime.getTime() - startTime.getTime()) / 1000 / 60
  };
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

export function formatTime(time: string): string {
  const date = new Date(`1970-01-01T${time}`);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

/**
 * Constraint-related helper functions
 */
export function checkConsecutiveLessons(
  timeSlots: TimeSlot[],
  constraints: SchoolConstraints
): { isValid: boolean; consecutiveCount: number } {
  let maxConsecutive = 1;
  let currentConsecutive = 1;

  // Sort time slots by day and start time
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
      
      // Check if slots are consecutive (less than 5 minutes gap)
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

export function checkDailyLessons(
  timeSlots: TimeSlot[],
  constraints: SchoolConstraints
): { isValid: boolean; lessonsByDay: Record<number, number> } {
  const lessonsByDay: Record<number, number> = {};

  // Count lessons per day
  timeSlots.forEach(slot => {
    lessonsByDay[slot.day_of_week] = (lessonsByDay[slot.day_of_week] || 0) + 1;
  });

  // Check against constraints
  const isValid = Object.values(lessonsByDay).every(count =>
    count >= constraints.minLessonsPerDay && count <= constraints.maxLessonsPerDay
  );

  return { isValid, lessonsByDay };
}

/**
 * Teaching assignment helper functions
 */
export function calculateTeacherWorkload(assignments: TeachingAssignment[]): {
  totalPeriods: number;
  periodsByDay: Record<number, number>;
} {
  const periodsByDay: Record<number, number> = {};
  let totalPeriods = 0;

  assignments.forEach(assignment => {
    const periodsPerWeek = assignment.class_offerings?.periods_per_week || 0;
    totalPeriods += periodsPerWeek;

    // Distribute periods across working days
    const workingDays = assignment.school?.working_days || [];
    const periodsPerDay = Math.ceil(periodsPerWeek / workingDays.length);

    workingDays.forEach(day => {
      periodsByDay[day] = (periodsByDay[day] || 0) + periodsPerDay;
    });
  });

  return { totalPeriods, periodsByDay };
}

/**
 * Schedule optimization helper functions
 */
export function findOptimalTimeSlot(
  availableSlots: TimeSlot[],
  existingAssignments: TeachingAssignment[],
  constraints: SchoolConstraints
): TimeSlot | null {
  // Sort slots by preference (earlier in the day is better)
  const sortedSlots = [...availableSlots].sort((a, b) => 
    a.start_time.localeCompare(b.start_time)
  );

  // Get existing time slots
  const existingSlots = existingAssignments.flatMap(a => 
    a.scheduled_lessons?.map(l => l.time_slots) || []
  );

  // Try each available slot
  for (const slot of sortedSlots) {
    const testSlots = [...existingSlots, slot];
    
    // Check consecutive lessons
    const consecutiveCheck = checkConsecutiveLessons(testSlots, constraints);
    if (!consecutiveCheck.isValid) continue;

    // Check daily lessons
    const dailyCheck = checkDailyLessons(testSlots, constraints);
    if (!dailyCheck.isValid) continue;

    // If all checks pass, this slot is optimal
    return slot;
  }

  return null;
}

/**
 * Data transformation helpers
 */
export function groupAssignmentsByTeacher(assignments: TeachingAssignment[]): Record<string, TeachingAssignment[]> {
  return assignments.reduce((acc, assignment) => {
    const teacherId = assignment.teacher_id;
    if (!acc[teacherId]) {
      acc[teacherId] = [];
    }
    acc[teacherId].push(assignment);
    return acc;
  }, {} as Record<string, TeachingAssignment[]>);
}

export function groupAssignmentsByClass(assignments: TeachingAssignment[]): Record<string, TeachingAssignment[]> {
  return assignments.reduce((acc, assignment) => {
    const classId = assignment.class_offerings?.classes?.id;
    if (classId && !acc[classId]) {
      acc[classId] = [];
    }
    if (classId) {
      acc[classId].push(assignment);
    }
    return acc;
  }, {} as Record<string, TeachingAssignment[]>);
}

/**
 * Validation helper functions
 */
export function validateTimeSlotOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
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

export function validateBreakRequirement(
  timeSlots: TimeSlot[],
  constraints: SchoolConstraints
): boolean {
  if (!constraints.breakRequired) return true;

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
      
      // Check if there's at least a 15-minute break
      if ((currStart.getTime() - prevEnd.getTime()) / 1000 / 60 < 15) {
        return false;
      }
    }
  }

  return true;
} 