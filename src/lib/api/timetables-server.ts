import { createClient } from '@/utils/supabase/server';
import { Tables } from '@/types/database';

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
  teacherId?: string;
  classId?: string;
  departmentId?: string;
  gradeLevel?: number;
}

export interface TimetableData {
  id: string;
  date: string;
  timeslot_id: string;
  teaching_assignment_id: string;
  class_id: string;
  course_id: string;
  teacher_id: string;
  room_id?: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  period_number?: number;
  slot_name?: string;
}

// Server-side function for use in server components
export async function getScheduledLessons(
  schoolId: string,
  filters: TimetableFilters = {}
): Promise<TimetableLesson[]> {
  const supabase = await createClient();

  // First, get all time slots for the school
  const { data: timeSlots, error: timeSlotsError } = await supabase
    .from('time_slots')
    .select('id, day_of_week, start_time, end_time, period_number, slot_name')
    .eq('school_id', schoolId);

  if (timeSlotsError) {
    console.error('Error fetching time slots:', timeSlotsError);
    throw new Error(`Failed to fetch time slots: ${timeSlotsError.message}`);
  }

  if (!timeSlots || timeSlots.length === 0) {
    return [];
  }

  // Create a map of time slot IDs to time slot data
  const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));

  // Get time slot IDs for filtering
  const timeSlotIds = timeSlots.map(ts => ts.id);

  // Build the query for scheduled lessons
  let query = supabase
    .from('scheduled_lessons')
    .select(`
      id,
      date,
      timeslot_id,
      teaching_assignment_id,
      teaching_assignments(
        teachers(
          first_name,
          last_name,
          email
        ),
        class_offerings(
          courses(
            name,
            code,
            departments(name)
          ),
          classes(
            name,
            grade_level
          )
        )
      )
    `)
    .in('timeslot_id', timeSlotIds);

  // Apply filters
  if (filters.termId) {
    query = query.eq('teaching_assignments.class_offerings.term_id', filters.termId);
  }

  if (filters.teacherId) {
    query = query.eq('teaching_assignments.teacher_id', filters.teacherId);
  }

  if (filters.classId) {
    query = query.eq('teaching_assignments.class_offerings.class_id', filters.classId);
  }

  if (filters.departmentId) {
    query = query.eq('teaching_assignments.class_offerings.courses.departments.id', filters.departmentId);
  }

  if (filters.gradeLevel) {
    query = query.eq('teaching_assignments.class_offerings.classes.grade_level', filters.gradeLevel);
  }

  const { data, error } = await query
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching scheduled lessons:', error);
    throw new Error(`Failed to fetch scheduled lessons: ${error.message}`);
  }

  if (!data) return [];

  // Transform the data to match our interface, filtering out incomplete records
  return data
    .filter(lesson => {
      const timeSlot = timeSlotMap.get(lesson.timeslot_id);
      return timeSlot && 
        lesson.teaching_assignments?.teachers && 
        lesson.teaching_assignments?.class_offerings?.courses && 
        lesson.teaching_assignments?.class_offerings?.classes;
    })
    .map((lesson) => {
      const timeSlot = timeSlotMap.get(lesson.timeslot_id)!;
      return {
        id: lesson.id,
        date: lesson.date,
        day_of_week: timeSlot.day_of_week,
        start_time: timeSlot.start_time,
        end_time: timeSlot.end_time,
        period_number: timeSlot.period_number,
        slot_name: timeSlot.slot_name,
        teacher_name: `${lesson.teaching_assignments.teachers.first_name} ${lesson.teaching_assignments.teachers.last_name}`,
        teacher_email: lesson.teaching_assignments.teachers.email,
        course_name: lesson.teaching_assignments.class_offerings.courses.name,
        course_code: lesson.teaching_assignments.class_offerings.courses.code,
        class_name: lesson.teaching_assignments.class_offerings.classes.name,
        grade_level: lesson.teaching_assignments.class_offerings.classes.grade_level,
        department_name: lesson.teaching_assignments.class_offerings.courses.departments.name,
      };
    });
}

export async function getTimetableGenerations(schoolId: string) {
  const supabase = await createClient();

  // First, get all terms for the school
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

  // Get term IDs for this school
  const termIds = terms.map(term => term.id);

  // Now get timetable generations for these terms
  const { data, error } = await supabase
    .from('timetable_generations')
    .select(`
      id,
      term_id,
      generated_at,
      status,
      notes
    `)
    .in('term_id', termIds)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('Error fetching timetable generations:', error);
    throw new Error(`Failed to fetch timetable generations: ${error.message}`);
  }

  if (!data) return [];

  // Enrich the data with term information
  return data.map(generation => {
    const term = terms.find(t => t.id === generation.term_id);
    return {
      ...generation,
      terms: term || null
    };
  });
}

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

export async function getTimetableData(
  schoolId: string,
  filters?: TimetableFilters
): Promise<TimetableData[]> {
  const supabase = await createClient();
  
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
      date: new Date().toISOString().split('T')[0], // Default to today since we don't have specific date
      timeslot_id: timeSlot.id,
      teaching_assignment_id: assignment.id,
      class_id: offering.classes.id,
      course_id: offering.courses.id,
      teacher_id: assignment.teachers.id,
      room_id: undefined, // Not available in current structure
      start_time: timeSlot.start_time,
      end_time: timeSlot.end_time,
      day_of_week: timeSlot.day_of_week,
      period_number: timeSlot.period_number ?? undefined,
      slot_name: timeSlot.slot_name ?? undefined,
    });
  }

  return transformedData;
} 