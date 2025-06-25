import { createClient } from '@/utils/supabase/client';
import { createClient as createServerClient } from '@/utils/supabase/server';
import type { Database } from '@/lib/database.types';

type ClassOffering = Database['public']['Tables']['class_offerings']['Row'];
type TeachingAssignment = Database['public']['Tables']['teaching_assignments']['Row'];
type TimeSlot = Database['public']['Tables']['time_slots']['Row'];

export interface TimetableLesson {
  id: number;
  date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  period_number: number | null;
  slot_name: string | null;
  teacher_name: string;
  teacher_email: string;
  course_name: string;
  course_code: string | null;
  class_name: string;
  grade_level: number;
  department_name: string;
  room_name?: string;
  room_type?: string;
}

export interface TimetableFilters {
  termId?: string;
  academicYearId?: string;
  departmentId?: string;
  gradeLevel?: number;
  classId?: string;
  teacherId?: string;
  roomId?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  status?: string;
}

export interface TimetableData {
  id: string;
  term_id: string;
  term_name: string;
  academic_year_id: string;
  academic_year_name: string;
  class_name: string;
  grade_level: number;
  course_id: string;
  course_name: string;
  course_code: string | null;
  department_id: string;
  department_name: string;
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  periods_per_week: number;
  required_hours_per_term: number | null;
  assignment_type: string;
  time_slot_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  period_number: number | null;
  slot_name: string | null;
}

// Client-side functions using simple database functions
export async function getScheduledLessonsClient(
  schoolId: string,
  filters: TimetableFilters = {}
): Promise<TimetableLesson[]> {
  const supabase = createClient();

  // Use simple query with basic joins instead of complex nested selects
  let query = supabase
    .from('scheduled_lessons')
    .select(`
      id,
      date,
      timeslot_id,
      teaching_assignment_id,
      teaching_assignments!inner(
        teacher_id,
        class_offering_id,
        teachers!inner(
          first_name,
          last_name,
          email
        ),
        class_offerings!inner(
          course_id,
          class_id,
          courses!inner(
            name,
            code,
            departments!inner(name)
          ),
          classes!inner(
            name,
            grade_level
          )
        )
      ),
      time_slots!inner(
        day_of_week,
        start_time,
        end_time,
        period_number,
        slot_name
      )
    `);

  // Apply filters
  if (filters.termId) {
    query = query.eq('teaching_assignments.class_offerings.term_id', filters.termId);
  }

  if (filters.teacherId) {
    query = query.eq('teaching_assignments.teacher_id', filters.teacherId);
  }

  if (filters.departmentId) {
    query = query.eq('teaching_assignments.class_offerings.courses.departments.id', filters.departmentId);
  }

  if (filters.gradeLevel) {
    query = query.eq('teaching_assignments.class_offerings.classes.grade_level', filters.gradeLevel);
  }

  if (filters.classId) {
    query = query.eq('teaching_assignments.class_offerings.class_id', filters.classId);
  }

  const { data, error } = await query.order('date', { ascending: true });

  if (error) {
    console.error('Error fetching scheduled lessons:', error);
    throw new Error(`Failed to fetch scheduled lessons: ${error.message}`);
  }

  if (!data) return [];

  // Transform the data to match our interface
  return data.map((lesson) => ({
    id: lesson.id,
    date: lesson.date,
    day_of_week: lesson.time_slots.day_of_week,
    start_time: lesson.time_slots.start_time,
    end_time: lesson.time_slots.end_time,
    period_number: lesson.time_slots.period_number,
    slot_name: lesson.time_slots.slot_name,
    teacher_name: `${lesson.teaching_assignments.teachers.first_name} ${lesson.teaching_assignments.teachers.last_name}`,
    teacher_email: lesson.teaching_assignments.teachers.email,
    course_name: lesson.teaching_assignments.class_offerings.courses.name,
    course_code: lesson.teaching_assignments.class_offerings.courses.code,
    class_name: lesson.teaching_assignments.class_offerings.classes.name,
    grade_level: lesson.teaching_assignments.class_offerings.classes.grade_level,
    department_name: lesson.teaching_assignments.class_offerings.courses.departments.name,
  }));
}

// Use the new database function for teacher qualifications
export async function getTeacherQualifications(teacherId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_teacher_qualifications', {
    p_teacher_id: teacherId
  });

  if (error) {
    console.error('Error fetching teacher qualifications:', error);
    throw new Error(`Failed to fetch teacher qualifications: ${error.message}`);
  }

  return data || [];
}

// Use the new database function for curriculum validation
export async function validateCurriculumHours(
  periodsPerWeek: number,
  requiredHoursPerTerm: number,
  periodDurationMinutes: number = 50,
  weeksPerTerm: number = 16
) {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('validate_curriculum_hours', {
    p_periods_per_week: periodsPerWeek,
    p_required_hours_per_term: requiredHoursPerTerm,
    p_period_duration_minutes: periodDurationMinutes,
    p_weeks_per_term: weeksPerTerm
  });

  if (error) {
    console.error('Error validating curriculum hours:', error);
    throw new Error(`Failed to validate curriculum hours: ${error.message}`);
  }

  return data?.[0] || null;
}

// Use the new database function for curriculum consistency
export async function getCurriculumConsistencyReport(schoolId?: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_curriculum_consistency_report', {
    p_school_id: schoolId
  });

  if (error) {
    console.error('Error fetching curriculum consistency report:', error);
    throw new Error(`Failed to fetch curriculum consistency report: ${error.message}`);
  }

  return data || [];
}

// Use the new database function for teacher department summary
export async function getTeacherDepartmentSummary(teacherId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_teacher_department_summary', {
    p_teacher_id: teacherId
  });

  if (error) {
    console.error('Error fetching teacher department summary:', error);
    throw new Error(`Failed to fetch teacher department summary: ${error.message}`);
  }

  return data || [];
}

// Use the new database function for teachers for course
export async function getTeachersForCourse(courseId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_teachers_for_course', {
    p_course_id: courseId
  });

  if (error) {
    console.error('Error fetching teachers for course:', error);
    throw new Error(`Failed to fetch teachers for course: ${error.message}`);
  }

  return data || [];
}

// Use the new database function for class curriculum summary
export async function getClassCurriculumSummary(classId: string, termId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_class_section_curriculum_summary', {
    p_class_id: classId,
    p_term_id: termId
  });

  if (error) {
    console.error('Error fetching class curriculum summary:', error);
    throw new Error(`Failed to fetch class curriculum summary: ${error.message}`);
  }

  return data?.[0] || null;
}

// Simple timetable generations query
export async function getTimetableGenerationsClient(schoolId: string) {
  const supabase = createClient();

  // Get terms for the school first
  const { data: terms, error: termsError } = await supabase
    .from('terms')
    .select(`
      id,
      name,
      start_date,
      end_date,
      academic_years!inner(
        name,
        school_id
      )
    `)
    .eq('academic_years.school_id', schoolId);

  if (termsError) {
    console.error('Error fetching terms for timetable generations:', termsError);
    throw new Error(`Failed to fetch terms: ${termsError.message}`);
  }

  if (!terms || terms.length === 0) {
    return [];
  }

  const termIds = terms.map(term => term.id);

  // Get timetable generations for these terms
  const { data, error } = await supabase
    .from('timetable_generations')
    .select(`
      id,
      term_id,
      generated_at,
      status,
      notes,
      terms!inner(name)
    `)
    .in('term_id', termIds)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('Error fetching timetable generations:', error);
    throw new Error(`Failed to fetch timetable generations: ${error.message}`);
  }

  return data || [];
}

// Simple queries for basic data
export async function getClassesForSchoolClient(schoolId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('classes')
    .select('id, name, grade_level')
    .eq('school_id', schoolId)
    .order('grade_level', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching classes:', error);
    throw new Error(`Failed to fetch classes: ${error.message}`);
  }

  return data || [];
}

export async function getTeachersForSchoolClient(schoolId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('teachers')
    .select('id, first_name, last_name, email')
    .eq('school_id', schoolId)
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching teachers:', error);
    throw new Error(`Failed to fetch teachers: ${error.message}`);
  }

  return data || [];
}

/**
 * Get terms for a school with academic year information
 * @deprecated Use getTermsWithAcademicYears from academic-calendar API instead
 */
export async function getTermsForSchoolClient(schoolId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('terms')
    .select(`
      id,
      name,
      start_date,
      end_date,
      academic_year_id,
      academic_years(
        id,
        name,
        school_id
      )
    `)
    .eq('academic_years.school_id', schoolId)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching terms:', error);
    throw new Error(`Failed to fetch terms: ${error.message}`);
  }

  return data || [];
}

// Utility functions
export function getDayName(dayOfWeek: number): string {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayOfWeek] || 'Unknown';
}

export function formatTime(time: string): string {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get timetable data with comprehensive joins
 */
export async function getTimetableData(
  schoolId: string,
  filters?: TimetableFilters
): Promise<TimetableData[]> {
  const supabase = createClient();

  let query = supabase
    .from('teaching_assignments')
    .select(`
      id,
      assignment_type,
      class_offerings (
        id,
        periods_per_week,
        required_hours_per_term,
        classes (
          id,
          name,
          grade_level
        ),
        courses (
          id,
          name,
          code,
          departments (
            id,
            name
          )
        ),
        terms (
          id,
          name,
          academic_years (
            id,
            name
          )
        )
      ),
      teachers (
        id,
        first_name,
        last_name,
        email
      ),
      time_slots (
        id,
        day_of_week,
        start_time,
        end_time,
        period_number,
        slot_name
      )
    `)
    .eq('school_id', schoolId);

  if (filters?.termId) {
    query = query.eq('class_offerings.terms.id', filters.termId);
  }
  if (filters?.teacherId) {
    query = query.eq('teacher_id', filters.teacherId);
  }
  if (filters?.departmentId) {
    query = query.eq('class_offerings.courses.departments.id', filters.departmentId);
  }
  if (filters?.gradeLevel) {
    query = query.eq('class_offerings.classes.grade_level', filters.gradeLevel);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching timetable data:', error);
    throw new Error('Failed to fetch timetable data');
  }

  // Transform the data to match the TimetableData interface
  const transformedData: TimetableData[] = [];
  
  for (const assignment of data || []) {
    const offering = assignment.class_offerings;
    if (
      !offering ||
      typeof offering.classes !== 'object' ||
      typeof offering.courses !== 'object' ||
      typeof offering.terms !== 'object' ||
      !assignment.teachers
    ) {
      continue;
    }

    const timeSlotArr = assignment.time_slots;
    const timeSlot = Array.isArray(timeSlotArr) ? timeSlotArr[0] : timeSlotArr;
    if (!timeSlot) {
      continue;
    }

    transformedData.push({
      id: assignment.id,
      term_id: offering.terms.id,
      term_name: offering.terms.name,
      academic_year_id: offering.terms.academic_years?.id || '',
      academic_year_name: offering.terms.academic_years?.name || '',
      class_name: offering.classes.name,
      grade_level: offering.classes.grade_level,
      course_id: offering.courses.id,
      course_name: offering.courses.name,
      course_code: offering.courses.code,
      department_id: offering.courses.departments?.id || '',
      department_name: offering.courses.departments?.name || '',
      teacher_id: assignment.teachers.id,
      teacher_name: `${assignment.teachers.first_name} ${assignment.teachers.last_name}`,
      teacher_email: assignment.teachers.email,
      periods_per_week: offering.periods_per_week,
      required_hours_per_term: offering.required_hours_per_term,
      assignment_type: assignment.assignment_type || 'ai',
      time_slot_id: timeSlot.id,
      day_of_week: timeSlot.day_of_week,
      start_time: timeSlot.start_time,
      end_time: timeSlot.end_time,
      period_number: timeSlot.period_number,
      slot_name: timeSlot.slot_name,
    });
  }

  return transformedData;
}

/**
 * Get class offerings for a school
 */
export async function getClassOfferings(
  schoolId: string,
  filters?: {
    termId?: string;
    academicYearId?: string;
    departmentId?: string;
    gradeLevel?: number;
  }
) {
  const supabase = createClient();

  let query = supabase
    .from('class_offerings')
    .select(`
      id,
      periods_per_week,
      required_hours_per_term,
      assignment_type,
      terms!inner(
        id,
        name,
        academic_years!inner(
          id,
          name,
          school_id
        )
      ),
      classes!inner(
        id,
        name,
        grade_level,
        school_id
      ),
      courses!inner(
        id,
        name,
        code,
        department_id,
        departments(
          id,
          name
        )
      )
    `)
    .eq('terms.academic_years.school_id', schoolId)
    .eq('classes.school_id', schoolId);

  // Apply filters
  if (filters?.termId) {
    query = query.eq('term_id', filters.termId);
  }

  if (filters?.academicYearId) {
    query = query.eq('terms.academic_year_id', filters.academicYearId);
  }

  if (filters?.departmentId) {
    query = query.eq('courses.department_id', filters.departmentId);
  }

  if (filters?.gradeLevel) {
    query = query.eq('classes.grade_level', filters.gradeLevel);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching class offerings:', error);
    throw new Error(`Failed to fetch class offerings: ${error.message}`);
  }

  return data || [];
}

/**
 * Get teaching assignments for a school
 */
export async function getTeachingAssignments(
  schoolId: string,
  filters?: {
    termId?: string;
    academicYearId?: string;
    teacherId?: string;
    classId?: string;
  }
) {
  const supabase = createClient();

  let query = supabase
    .from('teaching_assignments')
    .select(`
      id,
      assignment_type,
      assigned_at,
      class_offerings!inner(
        id,
        periods_per_week,
        required_hours_per_term,
        terms!inner(
          id,
          name,
          academic_years!inner(
            id,
            name,
            school_id
          )
        ),
        classes!inner(
          id,
          name,
          grade_level,
          school_id
        ),
        courses!inner(
          id,
          name,
          code,
          departments(
            id,
            name
          )
        )
      ),
      teachers!inner(
        id,
        first_name,
        last_name,
        email,
        school_id
      )
    `)
    .eq('school_id', schoolId);

  // Apply filters
  if (filters?.termId) {
    query = query.eq('class_offerings.term_id', filters.termId);
  }

  if (filters?.academicYearId) {
    query = query.eq('class_offerings.terms.academic_year_id', filters.academicYearId);
  }

  if (filters?.teacherId) {
    query = query.eq('teacher_id', filters.teacherId);
  }

  if (filters?.classId) {
    query = query.eq('class_offerings.class_id', filters.classId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching teaching assignments:', error);
    throw new Error(`Failed to fetch teaching assignments: ${error.message}`);
  }

  return data || [];
}

/**
 * Get time slots for a school
 */
export async function getTimeSlots(schoolId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('school_id', schoolId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching time slots:', error);
    throw new Error(`Failed to fetch time slots: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a teaching assignment
 */
export async function createTeachingAssignment(
  classOfferingId: string,
  teacherId: string,
  timeSlotId: string,
  schoolId: string,
  assignmentType: string = 'ai'
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('teaching_assignments')
    .insert({
      class_offering_id: classOfferingId,
      teacher_id: teacherId,
      time_slot_id: timeSlotId,
      school_id: schoolId,
      assignment_type: assignmentType,
      assigned_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating teaching assignment:', error);
    throw new Error(`Failed to create teaching assignment: ${error.message}`);
  }

  return data;
}

/**
 * Update a teaching assignment
 */
export async function updateTeachingAssignment(
  assignmentId: string,
  updates: {
    teacher_id?: string;
    time_slot_id?: string;
    assignment_type?: string;
  }
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('teaching_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating teaching assignment:', error);
    throw new Error(`Failed to update teaching assignment: ${error.message}`);
  }

  return data;
}

/**
 * Delete a teaching assignment
 */
export async function deleteTeachingAssignment(assignmentId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('teaching_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error deleting teaching assignment:', error);
    throw new Error(`Failed to delete teaching assignment: ${error.message}`);
  }
} 