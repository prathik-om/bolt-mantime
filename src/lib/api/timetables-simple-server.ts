import { createClient } from '@/utils/supabase/server';

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
  term_id?: string;
  class_id?: string;
  teacher_id?: string;
  date_from?: string;
  date_to?: string;
  day_of_week?: number;
}

// Server-side functions using simple database functions
export async function getScheduledLessons(
  schoolId: string,
  filters: TimetableFilters = {}
): Promise<TimetableLesson[]> {
  const supabase = await createClient();

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
  if (filters.term_id) {
    query = query.eq('teaching_assignments.class_offerings.term_id', filters.term_id);
  }

  if (filters.class_id) {
    query = query.eq('teaching_assignments.class_offerings.class_id', filters.class_id);
  }

  if (filters.teacher_id) {
    query = query.eq('teaching_assignments.teacher_id', filters.teacher_id);
  }

  if (filters.date_from) {
    query = query.gte('date', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('date', filters.date_to);
  }

  if (filters.day_of_week) {
    query = query.eq('time_slots.day_of_week', filters.day_of_week);
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
  const supabase = await createClient();
  
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
  const supabase = await createClient();
  
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
  const supabase = await createClient();
  
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
  const supabase = await createClient();
  
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
  const supabase = await createClient();
  
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
  const supabase = await createClient();
  
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
export async function getTimetableGenerations(schoolId: string) {
  const supabase = await createClient();

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
export async function getClassesForSchool(schoolId: string) {
  const supabase = await createClient();

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

export async function getTeachersForSchool(schoolId: string) {
  const supabase = await createClient();

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

export async function getTermsForSchool(schoolId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
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