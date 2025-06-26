import { createClient } from '@/utils/supabase/client';
import { Timetable, TeachingAssignment, Break, TimeSlot, TimetableGeneration, ScheduledLesson } from '../types/database-helpers';
import { handleError } from '../utils/error-handling';

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
  timetableGenerationId?: string;
}

export interface TimetableWithDetails extends Timetable {
  teaching_assignments: (TeachingAssignment & {
    teachers: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      department_id: string;
    };
    class_offerings: {
      id: string;
      course_id: string;
      class_id: string;
      term_id: string;
    };
  })[];
  breaks: Break[];
  time_slots: TimeSlot[];
}

interface TimetableValidation {
  isValid: boolean;
  message: string;
  details?: {
    total_assignments?: number;
    total_conflicts?: number;
    teacher_conflicts?: number;
    class_conflicts?: number;
    room_conflicts?: number;
    unassigned_classes?: number;
    teacher_workload_violations?: number;
  };
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
      timetable_generation_id,
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

  if (filters.timetableGenerationId) {
    query = query.eq('timetable_generation_id', filters.timetableGenerationId);
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
        timetable_generation_id: lesson.timetable_generation_id,
        teaching_assignment_id: lesson.teaching_assignment_id,
        timeslot_id: lesson.timeslot_id,
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

/**
 * Validate timetable data
 */
async function validateTimetable(timetable: Partial<Timetable>): Promise<TimetableValidation> {
  try {
    const errors: string[] = [];
    const supabase = createClient();

    if (!timetable.term_id) {
      errors.push('Term ID is required');
    }

    if (!timetable.status) {
      errors.push('Status is required');
    } else if (!['draft', 'published', 'archived'].includes(timetable.status)) {
      errors.push('Invalid status');
    }

    // Get term dates
    if (timetable.term_id) {
      const { data: term } = await supabase
        .from('terms')
        .select('start_date, end_date')
        .eq('id', timetable.term_id)
        .single();

      if (!term) {
        errors.push('Term not found');
      } else {
        // Check if there's already a published timetable for this term
        if (timetable.status === 'published') {
          const { data: existingTimetable } = await supabase
            .from('timetables')
            .select('id')
            .eq('term_id', timetable.term_id)
            .eq('status', 'published')
            .neq('id', timetable.id || '')
            .single();

          if (existingTimetable) {
            errors.push('A published timetable already exists for this term');
          }
        }

        // Get all assignments for validation
        if (timetable.id) {
          const { data: assignments } = await supabase
            .from('teaching_assignments')
            .select(`
              *,
              teachers (
                id,
                name,
                max_periods_per_week
              ),
              time_slots (
                id,
                day_of_week,
                start_time,
                end_time
              ),
              classes (
                id,
                name
              ),
              rooms (
                id,
                name
              )
            `)
            .eq('timetable_id', timetable.id);

          if (assignments) {
            // Check for conflicts
            const conflicts = {
              teacher: new Set<string>(),
              class: new Set<string>(),
              room: new Set<string>()
            };

            const teacherWorkload = new Map<string, number>();

            // Group assignments by time slot
            const assignmentsByTimeSlot = assignments.reduce((acc, assignment) => {
              const key = `${assignment.time_slot.day_of_week}-${assignment.time_slot.start_time}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(assignment);
              return acc;
            }, {} as Record<string, typeof assignments>);

            // Check for conflicts in each time slot
            Object.values(assignmentsByTimeSlot).forEach(slotAssignments => {
              // Check teacher conflicts
              const teacherIds = new Set<string>();
              slotAssignments.forEach(assignment => {
                if (teacherIds.has(assignment.teacher_id)) {
                  conflicts.teacher.add(assignment.teacher_id);
                }
                teacherIds.add(assignment.teacher_id);

                // Track teacher workload
                const currentLoad = teacherWorkload.get(assignment.teacher_id) || 0;
                teacherWorkload.set(assignment.teacher_id, currentLoad + 1);
              });

              // Check class conflicts
              const classIds = new Set<string>();
              slotAssignments.forEach(assignment => {
                if (classIds.has(assignment.class_id)) {
                  conflicts.class.add(assignment.class_id);
                }
                classIds.add(assignment.class_id);
              });

              // Check room conflicts
              const roomIds = new Set<string>();
              slotAssignments.forEach(assignment => {
                if (roomIds.has(assignment.room_id)) {
                  conflicts.room.add(assignment.room_id);
                }
                roomIds.add(assignment.room_id);
              });
            });

            // Check teacher workload violations
            const workloadViolations = Array.from(teacherWorkload.entries())
              .filter(([teacherId, load]) => {
                const teacher = assignments.find(a => a.teacher_id === teacherId)?.teachers;
                return teacher && load > teacher.max_periods_per_week;
              });

            // Get unassigned classes
            const { data: unassignedClasses } = await supabase
              .from('class_offerings')
              .select('id')
              .eq('term_id', timetable.term_id)
              .not('id', 'in', `(${assignments.map(a => a.class_id).join(',')})`);

            return {
              isValid: errors.length === 0 && 
                      conflicts.teacher.size === 0 && 
                      conflicts.class.size === 0 && 
                      conflicts.room.size === 0 && 
                      workloadViolations.length === 0,
              message: errors.join(', '),
              details: {
                total_assignments: assignments.length,
                total_conflicts: conflicts.teacher.size + conflicts.class.size + conflicts.room.size,
                teacher_conflicts: conflicts.teacher.size,
                class_conflicts: conflicts.class.size,
                room_conflicts: conflicts.room.size,
                unassigned_classes: unassignedClasses?.length || 0,
                teacher_workload_violations: workloadViolations.length
              }
            };
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.join(', ')
    };
  } catch (error) {
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create a new timetable with validation
 */
export async function createTimetable(
  timetable: Omit<Timetable, 'id' | 'created_at'>
): Promise<{ data: Timetable | null; error: string | null }> {
  try {
    // Validate timetable
    const validation = await validateTimetable(timetable);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('timetables')
      .insert(timetable)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create timetable', error);
  }
}

/**
 * Update a timetable with validation
 */
export async function updateTimetable(
  id: string,
  updates: Partial<Timetable>
): Promise<{ data: Timetable | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current timetable
    const { data: currentTimetable } = await supabase
      .from('timetables')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentTimetable) {
      return { data: null, error: 'Timetable not found' };
    }

    const updatedTimetable = { ...currentTimetable, ...updates };

    // Validate updated timetable
    const validation = await validateTimetable(updatedTimetable);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    // Special validation for status changes
    if (updates.status && updates.status !== currentTimetable.status) {
      if (updates.status === 'published') {
        // Additional validation for publishing
        if (validation.details?.total_conflicts && validation.details.total_conflicts > 0) {
          return { data: null, error: 'Cannot publish timetable with conflicts' };
        }
        if (validation.details?.unassigned_classes && validation.details.unassigned_classes > 0) {
          return { data: null, error: 'Cannot publish timetable with unassigned classes' };
        }
        if (validation.details?.teacher_workload_violations && validation.details.teacher_workload_violations > 0) {
          return { data: null, error: 'Cannot publish timetable with teacher workload violations' };
        }
      } else if (updates.status === 'archived') {
        // Check if this timetable is referenced by active entities
        const { data: dependencies } = await supabase
          .from('teaching_assignments')
          .select('id')
          .eq('timetable_id', id)
          .limit(1);

        if (dependencies && dependencies.length > 0) {
          return { data: null, error: 'Cannot archive timetable with active teaching assignments' };
        }
      }
    }

    const { data, error } = await supabase
      .from('timetables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to update timetable', error);
  }
}

/**
 * Delete a timetable
 */
export async function deleteTimetable(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current timetable
    const { data: timetable } = await supabase
      .from('timetables')
      .select('status')
      .eq('id', id)
      .single();

    if (!timetable) {
      return { success: false, error: 'Timetable not found' };
    }

    // Don't allow deletion of published timetables
    if (timetable.status === 'published') {
      return { success: false, error: 'Cannot delete a published timetable' };
    }

    // Check for dependencies
    const dependencies = await checkTimetableDependencies(id);
    if (dependencies.hasDependencies) {
      return {
        success: false,
        error: `Cannot delete timetable: ${dependencies.message}`
      };
    }

    const { error } = await supabase
      .from('timetables')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to delete timetable', error);
  }
}

/**
 * Get all timetables for a school with optional filters
 */
export async function getTimetables(
  schoolId: string,
  filters?: {
    status?: 'draft' | 'published' | 'archived';
    termId?: string;
    academicYearId?: string;
  }
): Promise<{ data: Timetable[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('timetables')
      .select(`
        *,
        terms!inner (
          id,
          name,
          academic_year_id,
          academic_years!inner (
            id,
            name,
            school_id
          )
        )
      `)
      .eq('terms.academic_years.school_id', schoolId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.termId) {
      query = query.eq('term_id', filters.termId);
    }
    if (filters?.academicYearId) {
      query = query.eq('terms.academic_year_id', filters.academicYearId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get timetables', error);
  }
}

/**
 * Get a single timetable
 */
export async function getTimetable(
  id: string
): Promise<{ data: Timetable | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get timetable', error);
  }
}

/**
 * Get a timetable with all its details
 */
export async function getTimetableWithDetails(
  id: string
): Promise<{ data: TimetableWithDetails | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('timetables')
      .select(`
        *,
        teaching_assignments (
          *,
          teachers (
            id,
            first_name,
            last_name,
            email,
            department_id
          ),
          class_offerings (
            id,
            course_id,
            class_id,
            term_id
          )
        ),
        breaks (
          *
        ),
        time_slots (
          *
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get timetable with details', error);
  }
}

/**
 * Helper function to check timetable dependencies
 */
async function checkTimetableDependencies(
  timetableId: string
): Promise<{ hasDependencies: boolean; message: string }> {
  const supabase = createClient();

  // Check for various dependencies
  const [
    { count: assignmentsCount },
    { count: breaksCount },
    { count: timeSlotsCount }
  ] = await Promise.all([
    supabase.from('teaching_assignments').select('*', { count: 'exact', head: true }).eq('timetable_id', timetableId),
    supabase.from('breaks').select('*', { count: 'exact', head: true }).eq('timetable_id', timetableId),
    supabase.from('time_slots').select('*', { count: 'exact', head: true }).eq('timetable_id', timetableId)
  ]);

  const dependencies = [];
  if (assignmentsCount) dependencies.push(`${assignmentsCount} teaching assignments`);
  if (breaksCount) dependencies.push(`${breaksCount} breaks`);
  if (timeSlotsCount) dependencies.push(`${timeSlotsCount} time slots`);

  return {
    hasDependencies: dependencies.length > 0,
    message: dependencies.length > 0
      ? `Timetable has active ${dependencies.join(', ')}`
      : ''
  };
}

// Create a new timetable generation
export async function createTimetableGeneration(
  termId: string,
  generatedBy: string,
  notes?: string
): Promise<{ data: TimetableGeneration | null; error: string | null }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('timetable_generations')
      .insert({
        term_id: termId,
        generated_by: generatedBy,
        status: 'draft',
        notes: notes || null,
        scheduled_lessons: 0,
        total_offerings: 0
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create timetable generation', error);
  }
}

// Schedule a lesson with database-level conflict prevention
export async function scheduleLesson(
  lesson: Omit<ScheduledLesson, 'id'>
): Promise<{ data: ScheduledLesson | null; error: string | null }> {
  const supabase = createClient();

  try {
    // The database EXCLUDE constraints will automatically prevent:
    // 1. Teacher double-booking (prevent_teacher_double_booking)
    // 2. Class double-booking (prevent_class_double_booking)
    const { data, error } = await supabase
      .from('scheduled_lessons')
      .insert(lesson)
      .select()
      .single();

    if (error) {
      // Handle specific constraint violation errors
      if (error.code === '23P01') { // EXCLUDE constraint violation
        if (error.message.includes('prevent_teacher_double_booking')) {
          return { data: null, error: 'Teacher is already scheduled for this time slot' };
        }
        if (error.message.includes('prevent_class_double_booking')) {
          return { data: null, error: 'Class is already scheduled for this time slot' };
        }
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to schedule lesson', error);
  }
}

// Update timetable generation status
export async function updateTimetableGenerationStatus(
  generationId: string,
  status: TimetableGenerationStatus,
  notes?: string
): Promise<{ data: TimetableGeneration | null; error: string | null }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('timetable_generations')
      .update({
        status,
        notes: notes || null,
        ...(status === 'completed' && { generated_at: new Date().toISOString() })
      })
      .eq('id', generationId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to update timetable generation status', error);
  }
}

// Delete a timetable generation and its lessons
export async function deleteTimetableGeneration(
  generationId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  try {
    // Due to ON DELETE CASCADE, this will automatically delete all associated lessons
    const { error } = await supabase
      .from('timetable_generations')
      .delete()
      .eq('id', generationId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to delete timetable generation', error);
  }
}

// Get timetable generations for a term
export async function getTimetableGenerations(
  termId: string
): Promise<{ data: TimetableGeneration[] | null; error: string | null }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('timetable_generations')
      .select('*')
      .eq('term_id', termId)
      .order('generated_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to fetch timetable generations', error);
  }
}

// Get a single timetable generation with its lessons
export async function getTimetableGenerationWithLessons(
  timetableGenerationId: string
): Promise<{ data: TimetableGeneration & { lessons: TimetableLesson[] } | null; error: string | null }> {
  const supabase = createClient();

  try {
    // Get the generation
    const { data: generation, error: generationError } = await supabase
      .from('timetable_generations')
      .select('*')
      .eq('id', timetableGenerationId)
      .single();

    if (generationError) throw generationError;
    if (!generation) return { data: null, error: 'Timetable generation not found' };

    // Get the lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from('scheduled_lessons')
      .select(`
        id,
        date,
        timeslot_id,
        teaching_assignment_id,
        timetable_generation_id
      `)
      .eq('timetable_generation_id', timetableGenerationId);

    if (lessonsError) throw lessonsError;

    return {
      data: {
        ...generation,
        lessons: lessons || []
      },
      error: null
    };
  } catch (error) {
    return handleError('Failed to fetch timetable generation with lessons', error);
  }
} 