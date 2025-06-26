// Timetable AI Service API utility

import { createClient } from '@/utils/supabase/client';
import { School, SchoolConstraints, TimeSlot, Teacher, Class, Room } from '../types/database-helpers';
import { handleError } from '../utils/error-handling';

const API_BASE = process.env.NEXT_PUBLIC_TIMETABLE_AI_SERVICE_URL || 'http://localhost:8000';

interface TimetableRequestValidation {
  isValid: boolean;
  message: string;
  details?: {
    teacher_count?: number;
    class_count?: number;
    room_count?: number;
    time_slot_count?: number;
    constraint_count?: number;
    total_periods_needed?: number;
    total_periods_available?: number;
  };
}

interface TimetableRequest {
  school_config: {
    id: string;
    name: string;
    constraints: SchoolConstraints;
  };
  term_id: string;
  timetable_generation_id: string;
  selected_classes: string[];
  selected_teachers: string[];
  algorithm: 'ai' | 'manual';
  optimization_level: 'basic' | 'advanced';
  time_limit: number;
  constraints?: {
    type: string;
    value: any;
  }[];
  optimization_goals?: string[];
  holidays?: string[];
  term_start?: string;
  term_end?: string;
}

export interface JobStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: {
    lessons: {
      teaching_assignment_id: string;
      date: string;
      timeslot_id: string;
    }[];
    statistics?: {
      total_lessons: number;
      scheduled_lessons: number;
      unscheduled_lessons: number;
      teacher_conflicts: number;
      class_conflicts: number;
    };
  };
  error?: string;
}

/**
 * Validate timetable generation request
 */
async function validateTimetableRequest(request: TimetableRequest): Promise<TimetableRequestValidation> {
  try {
    const errors: string[] = [];

    // Basic validation
    if (!request.school_config?.id) {
      errors.push('School configuration is required');
    }

    if (!request.term_id) {
      errors.push('Term ID is required');
    }

    if (!request.timetable_generation_id) {
      errors.push('Timetable Generation ID is required');
    }

    if (!request.selected_teachers || request.selected_teachers.length === 0) {
      errors.push('At least one teacher must be selected');
    }

    if (!request.selected_classes || request.selected_classes.length === 0) {
      errors.push('At least one class must be selected');
    }

    // Validate algorithm and optimization settings
    if (!['ai', 'manual'].includes(request.algorithm)) {
      errors.push('Invalid algorithm type');
    }

    if (!['basic', 'advanced'].includes(request.optimization_level)) {
      errors.push('Invalid optimization level');
    }

    if (request.time_limit < 60 || request.time_limit > 3600) {
      errors.push('Time limit must be between 1 and 60 minutes');
    }

    // Validate constraints
    if (request.constraints) {
      const validConstraintTypes = [
        'teacher_unavailability',
        'room_unavailability',
        'class_unavailability',
        'teacher_preference',
        'room_preference',
        'consecutive_lessons',
        'break_requirements'
      ];
      const invalidConstraints = request.constraints.filter(c => !validConstraintTypes.includes(c.type));
      if (invalidConstraints.length > 0) {
        errors.push(`Invalid constraint types: ${invalidConstraints.map(c => c.type).join(', ')}`);
      }
    }

    // Validate optimization goals
    if (request.optimization_goals) {
      const validGoals = [
        'minimize_teacher_gaps',
        'minimize_class_gaps',
        'maximize_teacher_preferences',
        'maximize_room_preferences',
        'distribute_subjects_evenly'
      ];
      const invalidGoals = request.optimization_goals.filter(g => !validGoals.includes(g));
      if (invalidGoals.length > 0) {
        errors.push(`Invalid optimization goals: ${invalidGoals.join(', ')}`);
      }
    }

    // Get term dates and validate
    const supabase = createClient();
    const { data: term, error: termError } = await supabase
      .from('terms')
      .select('start_date, end_date')
      .eq('id', request.term_id)
      .single();

    if (termError) {
      errors.push('Failed to validate term dates');
    } else if (term) {
      request.term_start = term.start_date;
      request.term_end = term.end_date;
    }

    // Get holidays for the term
    const { data: holidays, error: holidaysError } = await supabase
      .from('holidays')
      .select('date')
      .eq('term_id', request.term_id);

    if (!holidaysError && holidays) {
      request.holidays = holidays.map(h => h.date);
    }

    return {
      isValid: errors.length === 0,
      message: errors.join(', '),
      details: {
        teacher_count: request.selected_teachers.length,
        class_count: request.selected_classes.length,
        constraint_count: request.constraints?.length || 0
      }
    };
  } catch (error) {
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Submit a timetable generation request to the AI service
 */
export async function submitTimetableRequest(
  request: TimetableRequest
): Promise<{ data: { job_id: string } | null; error: string | null }> {
  try {
    // Validate request
    const validation = await validateTimetableRequest(request);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit timetable request: ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return handleError('Failed to submit timetable request', error);
  }
}

/**
 * Get the status of a timetable generation job
 */
export async function getJobStatus(
  jobId: string
): Promise<{ data: JobStatusResponse | null; error: string | null }> {
  try {
    const response = await fetch(`${API_BASE}/job-status/${jobId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get job status', error);
  }
}

/**
 * Cancel a timetable generation job
 */
export async function cancelJob(
  jobId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const response = await fetch(`${API_BASE}/cancel/${jobId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.status}`);
    }

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to cancel job', error);
  }
}

/**
 * Get the configuration for a school's timetable generation
 */
export async function getSchoolTimetableConfig(
  schoolId: string
): Promise<{ data: TimetableRequest | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get school data with constraints
    const { data: school } = await supabase
      .from('schools')
      .select(`
        id,
        name,
        constraints:school_constraints (*)
      `)
      .eq('id', schoolId)
      .single();

    if (!school) {
      return { data: null, error: 'School not found' };
    }

    // Get active teachers
    const { data: teachers } = await supabase
      .from('teachers')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    // Get active classes
    const { data: classes } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    // Get active rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    // Get time slots
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    const config: TimetableRequest = {
      school_config: {
        id: school.id,
        name: school.name,
        constraints: school.constraints || {},
      },
      term_id: '',
      timetable_generation_id: '',
      selected_classes: classes.map(c => c.id),
      selected_teachers: teachers.map(t => t.id),
      algorithm: 'manual',
      optimization_level: 'basic',
      time_limit: 3600,
      optimization_goals: [
        'minimize_teacher_gaps',
        'minimize_class_gaps',
        'prefer_teacher_preferences',
        'balance_teacher_workload',
      ],
    };

    return { data: config, error: null };
  } catch (error) {
    return handleError('Failed to get school timetable configuration', error);
  }
}

interface TimetableValidationResult {
  isValid: boolean;
  errors: string[];
}

interface ConsecutiveLessonsCheck {
  teacherId: string;
  count: number;
  timeSlots: TimeSlot[];
}

export async function validateTimetableAgainstConstraints(
  schoolId: string,
  timetableData: any[]
): Promise<TimetableValidationResult> {
  const errors: string[] = [];
  const constraints = await getSchoolConstraints(schoolId);
  
  // Group lessons by day and teacher
  const lessonsByDayAndTeacher = groupLessonsByDayAndTeacher(timetableData);
  
  // Check each day's lessons
  for (const [day, teacherLessons] of Object.entries(lessonsByDayAndTeacher)) {
    // Check lessons per day constraints
    for (const [teacherId, lessons] of Object.entries(teacherLessons)) {
      // Check maximum lessons per day
      if (lessons.length > constraints.maxLessonsPerDay) {
        errors.push(`Teacher ${teacherId} has ${lessons.length} lessons on ${day}, exceeding maximum of ${constraints.maxLessonsPerDay}`);
      }
      
      // Check minimum lessons per day
      if (lessons.length < constraints.minLessonsPerDay) {
        errors.push(`Teacher ${teacherId} has ${lessons.length} lessons on ${day}, below minimum of ${constraints.minLessonsPerDay}`);
      }
      
      // Check consecutive lessons
      const consecutiveLessons = findConsecutiveLessons(lessons);
      for (const check of consecutiveLessons) {
        if (check.count > constraints.maxConsecutiveLessons) {
          errors.push(`Teacher ${teacherId} has ${check.count} consecutive lessons on ${day}, exceeding maximum of ${constraints.maxConsecutiveLessons}`);
        }
      }
      
      // Check break requirements
      if (constraints.breakRequired) {
        const missingBreaks = findMissingBreaks(lessons);
        if (missingBreaks.length > 0) {
          errors.push(`Teacher ${teacherId} is missing required breaks between sessions on ${day}`);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function groupLessonsByDayAndTeacher(timetableData: any[]): Record<string, Record<string, any[]>> {
  const grouped: Record<string, Record<string, any[]>> = {};
  
  for (const lesson of timetableData) {
    const day = lesson.day_of_week;
    const teacherId = lesson.teacher_id;
    
    if (!grouped[day]) {
      grouped[day] = {};
    }
    if (!grouped[day][teacherId]) {
      grouped[day][teacherId] = [];
    }
    
    grouped[day][teacherId].push(lesson);
  }
  
  // Sort lessons by start time for each teacher
  for (const day of Object.values(grouped)) {
    for (const lessons of Object.values(day)) {
      lessons.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
    }
  }
  
  return grouped;
}

function findConsecutiveLessons(lessons: any[]): ConsecutiveLessonsCheck[] {
  const checks: ConsecutiveLessonsCheck[] = [];
  let currentCount = 1;
  let currentGroup: any[] = [lessons[0]];
  
  for (let i = 1; i < lessons.length; i++) {
    const currentLesson = lessons[i];
    const previousLesson = lessons[i - 1];
    
    // Check if lessons are consecutive (no break in between)
    if (isConsecutive(previousLesson, currentLesson)) {
      currentCount++;
      currentGroup.push(currentLesson);
    } else {
      if (currentCount > 1) {
        checks.push({
          teacherId: currentLesson.teacher_id,
          count: currentCount,
          timeSlots: currentGroup
        });
      }
      currentCount = 1;
      currentGroup = [currentLesson];
    }
  }
  
  // Don't forget to check the last group
  if (currentCount > 1) {
    checks.push({
      teacherId: lessons[lessons.length - 1].teacher_id,
      count: currentCount,
      timeSlots: currentGroup
    });
  }
  
  return checks;
}

function isConsecutive(lesson1: any, lesson2: any): boolean {
  const end1 = new Date(`1970-01-01T${lesson1.end_time}`);
  const start2 = new Date(`1970-01-01T${lesson2.start_time}`);
  
  // Consider lessons consecutive if there's less than 5 minutes between them
  const diffMinutes = (start2.getTime() - end1.getTime()) / 1000 / 60;
  return diffMinutes < 5;
}

function findMissingBreaks(lessons: any[]): any[] {
  const missingBreaks: any[] = [];
  
  for (let i = 1; i < lessons.length; i++) {
    const currentLesson = lessons[i];
    const previousLesson = lessons[i - 1];
    
    // Check if there's at least a 15-minute break between lessons
    const end1 = new Date(`1970-01-01T${previousLesson.end_time}`);
    const start2 = new Date(`1970-01-01T${currentLesson.start_time}`);
    
    const diffMinutes = (start2.getTime() - end1.getTime()) / 1000 / 60;
    if (diffMinutes < 15) {
      missingBreaks.push({
        lesson1: previousLesson,
        lesson2: currentLesson,
        breakMinutes: diffMinutes
      });
    }
  }
  
  return missingBreaks;
}

export async function validateScheduledLesson(
  schoolId: string,
  teacherId: string,
  timeSlotId: string,
  date: string
): Promise<TimetableValidationResult> {
  const supabase = await createClient();
  const constraints = await getSchoolConstraints(schoolId);
  const errors: string[] = [];

  // Get existing lessons for the teacher on this day
  const { data: existingLessons, error } = await supabase
    .from('scheduled_lessons')
    .select(`
      id,
      date,
      time_slots (
        id,
        start_time,
        end_time,
        period_number
      )
    `)
    .eq('teaching_assignments.teacher_id', teacherId)
    .eq('date', date);

  if (error) {
    throw error;
  }

  // Get the time slot details
  const { data: timeSlot } = await supabase
    .from('time_slots')
    .select('*')
    .eq('id', timeSlotId)
    .single();

  if (!timeSlot) {
    throw new Error('Time slot not found');
  }

  // Check lessons per day limit
  if (existingLessons && existingLessons.length >= constraints.maxLessonsPerDay) {
    errors.push(`Cannot schedule more than ${constraints.maxLessonsPerDay} lessons per day`);
  }

  // Check consecutive lessons
  const allLessons = [...(existingLessons || []), { time_slots: timeSlot }];
  const sortedLessons = allLessons.sort((a, b) => 
    a.time_slots.start_time.localeCompare(b.time_slots.start_time)
  );

  const consecutiveGroups = findConsecutiveLessons(sortedLessons);
  for (const group of consecutiveGroups) {
    if (group.count > constraints.maxConsecutiveLessons) {
      errors.push(`Cannot schedule more than ${constraints.maxConsecutiveLessons} consecutive lessons`);
    }
  }

  // Check break requirements
  if (constraints.breakRequired) {
    const missingBreaks = findMissingBreaks(sortedLessons);
    if (missingBreaks.length > 0) {
      errors.push('A break is required between teaching sessions');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
} 