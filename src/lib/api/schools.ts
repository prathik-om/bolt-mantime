// TODO: Refactor this file to use the new supabase client pattern.
// import { createClient } from '@/utils/supabase/server' for server-side
// import { createBrowserClient } from '@/utils/supabase' for client-side
// import { supabase } from '@/lib/supabase-server';
import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/lib/database.types'
import { Tables } from '../types/database-helpers'
import { handleError } from '../utils/error-handling'

export type School = Tables<'schools'>
export type SchoolInsert = Database['public']['Tables']['schools']['Insert']
export type SchoolUpdate = Database['public']['Tables']['schools']['Update']

// Re-export types from academic calendar API for backward compatibility
export type AcademicYear = Database['public']['Tables']['academic_years']['Row']

export interface SchoolConstraints {
  maxLessonsPerDay: number
  minLessonsPerDay: number
  maxConsecutiveLessons: number
  breakRequired: boolean
}

export interface SchoolSettings extends SchoolConstraints {
  periodDuration: number
  sessionsPerDay: number
  startTime: string
  endTime: string
  workingDays: string[]
}

export interface SchoolWithStats extends School {
  department_count: number;
  teacher_count: number;
  class_count: number;
  student_count: number;
}

interface SchoolValidation {
  isValid: boolean;
  message: string;
  details?: {
    working_days_count?: number;
    total_hours_per_day?: number;
    total_periods_per_day?: number;
    break_count?: number;
    department_count?: number;
    teacher_count?: number;
  };
}

/**
 * Get all schools for a user
 */
export async function getSchools(): Promise<{ data: School[] | null; error: string | null }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name')

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    return handleError('Failed to get schools', error)
  }
}

/**
 * Get a single school by ID
 */
export async function getSchool(schoolId: string): Promise<{ data: School | null; error: string | null }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    return handleError('Failed to get school', error)
  }
}

/**
 * Validate school data
 */
async function validateSchool(school: Partial<School>): Promise<SchoolValidation> {
  try {
    const errors: string[] = [];
    const supabase = createClient();

    if (!school.name?.trim()) {
      errors.push('School name is required');
    } else if (school.name.length > 100) {
      errors.push('School name cannot exceed 100 characters');
    }

    if (school.address && school.address.length > 200) {
      errors.push('School address cannot exceed 200 characters');
    }

    if (school.contact_email && !isValidEmail(school.contact_email)) {
      errors.push('Invalid contact email format');
    }

    if (school.contact_phone && !isValidPhone(school.contact_phone)) {
      errors.push('Invalid contact phone format');
    }

    if (school.status && !['active', 'inactive'].includes(school.status)) {
      errors.push('Invalid status');
    }

    // Validate working hours
    if (school.start_time && school.end_time) {
      const start = new Date(`1970-01-01T${school.start_time}`);
      const end = new Date(`1970-01-01T${school.end_time}`);

      if (isNaN(start.getTime())) {
        errors.push('Invalid start time format');
      }

      if (isNaN(end.getTime())) {
        errors.push('Invalid end time format');
      }

      if (end <= start) {
        errors.push('End time must be after start time');
      }

      // Calculate total hours
      const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (totalHours < 4) {
        errors.push('School day must be at least 4 hours');
      }
      if (totalHours > 12) {
        errors.push('School day cannot exceed 12 hours');
      }
    }

    // Validate working days
    if (school.working_days) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const invalidDays = school.working_days.filter(day => !validDays.includes(day.toLowerCase()));
      if (invalidDays.length > 0) {
        errors.push(`Invalid working days: ${invalidDays.join(', ')}`);
      }
      if (school.working_days.length < 1) {
        errors.push('At least one working day is required');
      }
      if (school.working_days.length > 6) {
        errors.push('Maximum 6 working days allowed');
      }
    }

    // Validate period settings
    if (school.period_duration !== undefined) {
      if (school.period_duration < 30) {
        errors.push('Period duration must be at least 30 minutes');
      }
      if (school.period_duration > 120) {
        errors.push('Period duration cannot exceed 120 minutes');
      }
    }

    if (school.sessions_per_day !== undefined) {
      if (school.sessions_per_day < 1) {
        errors.push('At least 1 session per day is required');
      }
      if (school.sessions_per_day > 12) {
        errors.push('Maximum 12 sessions per day allowed');
      }
    }

    // Get counts for details
    let details = {};
    if (school.id) {
      const [
        { count: breakCount },
        { count: departmentCount },
        { count: teacherCount }
      ] = await Promise.all([
        supabase
          .from('breaks')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id),
        supabase
          .from('departments')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id),
        supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
      ]);

      details = {
        working_days_count: school.working_days?.length || 0,
        total_hours_per_day: school.start_time && school.end_time
          ? (new Date(`1970-01-01T${school.end_time}`).getTime() - new Date(`1970-01-01T${school.start_time}`).getTime()) / (1000 * 60 * 60)
          : 0,
        total_periods_per_day: school.sessions_per_day || 0,
        break_count: breakCount || 0,
        department_count: departmentCount || 0,
        teacher_count: teacherCount || 0
      };
    }

    return {
      isValid: errors.length === 0,
      message: errors.join(', '),
      details: details as SchoolValidation['details']
    };
  } catch (error) {
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create a new school with validation
 */
export async function createSchool(
  school: Omit<School, 'id' | 'created_at'>
): Promise<{ data: School | null; error: string | null }> {
  try {
    // Validate school
    const validation = await validateSchool(school);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('schools')
      .insert(school)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create school', error);
  }
}

/**
 * Update a school with validation
 */
export async function updateSchool(
  id: string,
  updates: Partial<School>
): Promise<{ data: School | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current school
    const { data: currentSchool } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentSchool) {
      return { data: null, error: 'School not found' };
    }

    const updatedSchool = { ...currentSchool, ...updates };

    // Validate updated school
    const validation = await validateSchool(updatedSchool);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const { data, error } = await supabase
      .from('schools')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to update school', error);
  }
}

/**
 * Delete a school
 */
export async function deleteSchool(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient()

    // Get current school
    const { data: school } = await supabase
      .from('schools')
      .select('status')
      .eq('id', id)
      .single()

    if (!school) {
      return { success: false, error: 'School not found' }
    }

    // Don't allow deletion of active schools
    if (school.status === 'active') {
      return { success: false, error: 'Cannot delete an active school. Deactivate it first.' }
    }

    // Check for dependencies
    const dependencies = await checkSchoolDependencies(id)
    if (dependencies.hasDependencies) {
      return {
        success: false,
        error: `Cannot delete school: ${dependencies.message}`
      }
    }

    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    return handleError('Failed to delete school', error)
  }
}

/**
 * Get school configuration including working days
 */
export async function getSchoolConfig(schoolId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('schools')
    .select(`
      *,
      working_days_config (
        id,
        academic_year_id,
        term_id,
        working_days,
        start_time,
        end_time,
        period_duration
      )
    `)
    .eq('id', schoolId)
    .single()

  if (error) {
    console.error('Error fetching school config:', error)
    throw new Error('Failed to fetch school configuration')
  }

  return data
}

/**
 * Update school working days configuration
 */
export async function updateSchoolWorkingDays(
  schoolId: string,
  workingDays: string[],
  startTime?: string,
  endTime?: string,
  periodDuration?: number
) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('schools')
    .update({
      working_days: workingDays,
      start_time: startTime,
      end_time: endTime,
      period_duration: periodDuration,
    })
    .eq('id', schoolId)

  if (error) {
    console.error('Error updating school working days:', error)
    throw new Error('Failed to update school working days')
  }
}

/**
 * Get academic years for a school
 * @deprecated Use getAcademicYearsWithTerms from academic-calendar API instead
 */
export async function getAcademicYears(schoolId: string): Promise<AcademicYear[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching academic years:', error)
    throw new Error('Failed to fetch academic years')
  }

  return data || []
}

/**
 * Get school statistics
 */
export async function getSchoolStats(
  schoolId: string
): Promise<{ data: SchoolStats | null; error: string | null }> {
  try {
    const supabase = createClient()
    
    // Get counts for various entities
    const [
      { count: teachersCount },
      { count: classesCount },
      { count: coursesCount },
      { count: departmentsCount },
      { count: roomsCount },
      { count: academicYearsCount }
    ] = await Promise.all([
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('departments').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('academic_years').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    ])

    const stats: SchoolStats = {
      teachers: teachersCount || 0,
      classes: classesCount || 0,
      courses: coursesCount || 0,
      departments: departmentsCount || 0,
      rooms: roomsCount || 0,
      academicYears: academicYearsCount || 0,
    }

    return { data: stats, error: null }
  } catch (error) {
    return handleError('Failed to get school statistics', error)
  }
}

/**
 * Validate school configuration
 */
export async function validateSchoolConfig(schoolId: string) {
  const supabase = createClient()
  
  // Check if school has basic configuration
  const { data: school } = await supabase
    .from('schools')
    .select('name, working_days, start_time, end_time, period_duration')
    .eq('id', schoolId)
    .single()

  if (!school) {
    return { isValid: false, message: 'School not found' }
  }

  const issues = []

  if (!school.working_days || school.working_days.length === 0) {
    issues.push('No working days configured')
  }

  if (!school.start_time || !school.end_time) {
    issues.push('School hours not configured')
  }

  if (!school.period_duration) {
    issues.push('Period duration not configured')
  }

  // Check if school has academic years
  const { count: academicYearsCount } = await supabase
    .from('academic_years')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (!academicYearsCount || academicYearsCount === 0) {
    issues.push('No academic years configured')
  }

  return {
    isValid: issues.length === 0,
    message: issues.length > 0 ? issues.join(', ') : 'Configuration is valid',
    issues
  }
}

export const getSchoolByUserId = async (userId: string): Promise<School | null> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching school:', error);
    throw new Error('Failed to fetch school data.');
  }

  return data;
};

export async function updateSchoolConstraints(
  schoolId: string,
  constraints: Partial<SchoolConstraints>
): Promise<School> {
  const supabase = await createClient();
  
  // Validate constraints
  if (
    constraints.maxLessonsPerDay !== undefined &&
    constraints.minLessonsPerDay !== undefined &&
    constraints.maxLessonsPerDay < constraints.minLessonsPerDay
  ) {
    throw new Error('Maximum lessons per day must be greater than or equal to minimum lessons per day');
  }

  if (constraints.maxConsecutiveLessons !== undefined && constraints.maxConsecutiveLessons < 1) {
    throw new Error('Maximum consecutive lessons must be at least 1');
  }

  const { data, error } = await supabase
    .from('schools')
    .update({
      max_lessons_per_day: constraints.maxLessonsPerDay,
      min_lessons_per_day: constraints.minLessonsPerDay,
      max_consecutive_lessons: constraints.maxConsecutiveLessons,
      break_required: constraints.breakRequired
    })
    .eq('id', schoolId)
    .select()
    .single();

  if (error) {
    console.error('Error updating school constraints:', error);
    throw error;
  }

  return data;
}

export async function updateSchoolSettings(
  schoolId: string,
  settings: Partial<SchoolSettings>
): Promise<School> {
  const supabase = await createClient();

  // Validate settings
  if (settings.maxLessonsPerDay && settings.minLessonsPerDay) {
    if (settings.maxLessonsPerDay < settings.minLessonsPerDay) {
      throw new Error('Maximum lessons per day must be greater than or equal to minimum lessons per day');
    }
  }

  if (settings.maxConsecutiveLessons && settings.maxConsecutiveLessons < 1) {
    throw new Error('Maximum consecutive lessons must be at least 1');
  }

  if (settings.periodDuration && (settings.periodDuration < 15 || settings.periodDuration > 120)) {
    throw new Error('Period duration must be between 15 and 120 minutes');
  }

  if (settings.sessionsPerDay && (settings.sessionsPerDay < 1 || settings.sessionsPerDay > 12)) {
    throw new Error('Sessions per day must be between 1 and 12');
  }

  const { data, error } = await supabase
    .from('schools')
    .update({
      max_lessons_per_day: settings.maxLessonsPerDay,
      min_lessons_per_day: settings.minLessonsPerDay,
      max_consecutive_lessons: settings.maxConsecutiveLessons,
      break_required: settings.breakRequired,
      period_duration: settings.periodDuration,
      sessions_per_day: settings.sessionsPerDay,
      start_time: settings.startTime,
      end_time: settings.endTime,
      working_days: settings.workingDays
    })
    .eq('id', schoolId)
    .select()
    .single();

  if (error) {
    console.error('Error updating school settings:', error);
    throw error;
  }

  return data;
}

export async function validateSchoolConstraints(schoolId: string): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const school = await getSchool(schoolId);
  if (!school) {
    throw new Error('School not found');
  }

  const errors: string[] = [];

  // Validate lessons per day
  if (school.max_lessons_per_day !== null && school.min_lessons_per_day !== null) {
    if (school.max_lessons_per_day < school.min_lessons_per_day) {
      errors.push('Maximum lessons per day must be greater than or equal to minimum lessons per day');
    }
  }

  // Validate consecutive lessons
  if (school.max_consecutive_lessons !== null && school.max_consecutive_lessons < 1) {
    errors.push('Maximum consecutive lessons must be at least 1');
  }

  // Validate period duration
  if (school.period_duration !== null && (school.period_duration < 15 || school.period_duration > 120)) {
    errors.push('Period duration must be between 15 and 120 minutes');
  }

  // Validate sessions per day
  if (school.sessions_per_day !== null && (school.sessions_per_day < 1 || school.sessions_per_day > 12)) {
    errors.push('Sessions per day must be between 1 and 12');
  }

  // Validate working days
  if (school.working_days !== null && school.working_days.length === 0) {
    errors.push('At least one working day must be specified');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function getSchoolConstraints(schoolId: string): Promise<{ data: SchoolConstraints | null; error: string | null }> {
  try {
    const { data: school, error } = await getSchool(schoolId);

    if (error) throw new Error(error);
    if (!school) throw new Error('School not found');

    const constraints: SchoolConstraints = {
      maxLessonsPerDay: school.max_lessons_per_day ?? 8,
      minLessonsPerDay: school.min_lessons_per_day ?? 1,
      maxConsecutiveLessons: school.max_consecutive_lessons ?? 2,
      breakRequired: school.break_required ?? true
    };

    return { data: constraints, error: null };
  } catch (error) {
    return handleError('Failed to get school constraints', error);
  }
}

export async function getSchoolSettings(schoolId: string): Promise<{ data: SchoolSettings | null; error: string | null }> {
  try {
    const { data: school, error } = await getSchool(schoolId);

    if (error) throw new Error(error);
    if (!school) throw new Error('School not found');

    const settings: SchoolSettings = {
      maxLessonsPerDay: school.max_lessons_per_day ?? 8,
      minLessonsPerDay: school.min_lessons_per_day ?? 1,
      maxConsecutiveLessons: school.max_consecutive_lessons ?? 2,
      breakRequired: school.break_required ?? true,
      periodDuration: school.period_duration ?? 50,
      sessionsPerDay: school.sessions_per_day ?? 8,
      startTime: school.start_time ?? '08:00',
      endTime: school.end_time ?? '15:00',
      workingDays: school.working_days ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    };

    return { data: settings, error: null };
  } catch (error) {
    return handleError('Failed to get school settings', error);
  }
}

/**
 * Helper function to check school dependencies
 */
async function checkSchoolDependencies(
  schoolId: string
): Promise<{ hasDependencies: boolean; message: string }> {
  const supabase = createClient();

  // Check for various dependencies
  const [
    { count: departmentCount },
    { count: teacherCount },
    { count: classCount },
    { count: studentCount },
    { count: timetableCount }
  ] = await Promise.all([
    supabase.from('departments').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('timetables').select('*', { count: 'exact', head: true }).eq('school_id', schoolId)
  ]);

  const dependencies = [];
  if (departmentCount) dependencies.push(`${departmentCount} departments`);
  if (teacherCount) dependencies.push(`${teacherCount} teachers`);
  if (classCount) dependencies.push(`${classCount} classes`);
  if (studentCount) dependencies.push(`${studentCount} students`);
  if (timetableCount) dependencies.push(`${timetableCount} timetables`);

  return {
    hasDependencies: dependencies.length > 0,
    message: dependencies.length > 0
      ? `School has active ${dependencies.join(', ')}`
      : ''
  };
}

/**
 * Helper function to validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper function to validate phone format
 */
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
}

interface SchoolStats {
  teachers: number;
  classes: number;
  courses: number;
  departments: number;
  rooms: number;
  academicYears: number;
} 