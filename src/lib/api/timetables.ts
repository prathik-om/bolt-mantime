import { createClient } from '@/utils/supabase/client';
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
  roomId?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  status?: string;
}

// Client-side function for use in client components
export async function getScheduledLessonsClient(
  schoolId: string,
  filters: TimetableFilters = {}
): Promise<TimetableLesson[]> {
  const supabase = createClient();

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

  if (filters.classId) {
    query = query.eq('teaching_assignments.class_offerings.class_id', filters.classId);
  }

  if (filters.teacherId) {
    query = query.eq('teaching_assignments.teacher_id', filters.teacherId);
  }

  if (filters.startTime) {
    query = query.gte('date', filters.startTime);
  }

  if (filters.endTime) {
    query = query.lte('date', filters.endTime);
  }

  if (filters.dayOfWeek) {
    // Filter by day of week using the time slot map
    const filteredTimeSlotIds = timeSlots
      .filter(ts => ts.day_of_week === filters.dayOfWeek)
      .map(ts => ts.id);
    query = query.in('timeslot_id', filteredTimeSlotIds);
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

// Client-side functions
export async function getTimetableGenerationsClient(schoolId: string) {
  const supabase = createClient();

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

export async function getTermsForSchoolClient(schoolId: string) {
  const supabase = createClient();

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

export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek - 1] || 'Unknown';
}

export function formatTime(time: string): string {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
} 