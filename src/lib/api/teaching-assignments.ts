import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';
import { getSchoolConstraints } from './schools';
import { TeachingAssignment, TimeSlot, SchoolConstraints } from '../types/database-helpers';
import { validateTeachingAssignment, validateSchedule } from '../utils/validation';
import { convertToTeachingAssignment } from '../utils/type-guards';
import { handleError } from '../utils/error-handling';

type TeachingAssignment = Database['public']['Tables']['teaching_assignments']['Row'];
type TeachingAssignmentInsert = Database['public']['Tables']['teaching_assignments']['Insert'];
type TeachingAssignmentUpdate = Database['public']['Tables']['teaching_assignments']['Update'];

type ClassOffering = Database['public']['Tables']['class_offerings']['Row'];
type Teacher = Database['public']['Tables']['teachers']['Row'];

export interface TeachingAssignmentWithDetails extends TeachingAssignment {
  class_offerings: ClassOffering & {
    courses: {
      id: string;
      name: string;
      code: string | null;
      department_id: string;
    };
    classes: {
      id: string;
      name: string;
      grade_level: number;
    };
    terms: {
      id: string;
      name: string;
      start_date: string;
      end_date: string;
    };
  };
  teachers: Teacher;
}

export interface TeacherWorkloadSummary {
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  total_assignments: number;
  total_periods_per_week: number;
  total_hours_per_term: number;
  max_periods_per_week: number | null;
  workload_percentage: number;
  assignments: {
    class_offering_id: string;
    course_name: string;
    class_name: string;
    term_name: string;
    periods_per_week: number;
    required_hours_per_term: number | null;
  }[];
}

export interface ClassOfferingAssignmentSummary {
  class_offering_id: string;
  course_name: string;
  class_name: string;
  term_name: string;
  periods_per_week: number;
  required_hours_per_term: number | null;
  assigned_teacher: string | null;
  teacher_name: string | null;
  teacher_email: string | null;
  is_assigned: boolean;
}

interface TeachingAssignmentValidation {
  isValid: boolean;
  message: string;
  details?: {
    current_workload?: number;
    max_workload?: number;
    qualification_match?: boolean;
    schedule_conflicts?: number;
  };
}

/**
 * Validate a teaching assignment
 */
async function validateTeachingAssignment(
  assignment: Partial<TeachingAssignment>
): Promise<TeachingAssignmentValidation> {
  try {
    const supabase = createClient();
    const errors: string[] = [];

    if (!assignment.teacher_id) {
      errors.push('Teacher ID is required');
    }

    if (!assignment.class_offering_id) {
      errors.push('Class offering ID is required');
    }

    if (!assignment.school_id) {
      errors.push('School ID is required');
    }

    // Get teacher details and current workload
    const { data: teacher } = await supabase
      .from('teachers')
      .select(`
        *,
        teacher_departments!inner (
          department_id
        ),
        teaching_assignments (
          class_offerings (
            periods_per_week
          )
        )
      `)
      .eq('id', assignment.teacher_id)
      .single();

    if (!teacher) {
      errors.push('Teacher not found');
    } else {
      // Calculate current workload
      const currentWorkload = teacher.teaching_assignments?.reduce(
        (total, ta) => total + (ta.class_offerings?.periods_per_week || 0),
        0
      ) || 0;

      // Get class offering details
      const { data: classOffering } = await supabase
        .from('class_offerings')
        .select(`
          *,
          courses (
            department_id
          )
        `)
        .eq('id', assignment.class_offering_id)
        .single();

      if (!classOffering) {
        errors.push('Class offering not found');
      } else {
        // Check workload constraints
        if (currentWorkload + classOffering.periods_per_week > (teacher.max_periods_per_week || 30)) {
          errors.push(`Assignment would exceed teacher's maximum workload of ${teacher.max_periods_per_week} periods per week`);
        }

        // Check department qualification
        const teacherDepartments = teacher.teacher_departments.map(td => td.department_id);
        if (!teacherDepartments.includes(classOffering.courses.department_id)) {
          errors.push('Teacher is not qualified for this department');
        }

        // Check for schedule conflicts
        const { data: conflicts } = await supabase
          .from('teaching_assignments')
          .select(`
            id,
            scheduled_lessons (
              time_slots (
                day_of_week,
                start_time,
                end_time
              )
            )
          `)
          .eq('teacher_id', assignment.teacher_id)
          .neq('id', assignment.id || '');

        if (conflicts) {
          const hasConflict = conflicts.some(ta => 
            ta.scheduled_lessons?.some(sl =>
              // Add conflict checking logic here
              sl.time_slots.some(ts => {
                // Check for time slot overlaps
                return false; // Placeholder
              })
            )
          );

          if (hasConflict) {
            errors.push('Assignment would create schedule conflicts');
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.join(', '),
      details: teacher ? {
        current_workload: teacher.teaching_assignments?.reduce(
          (total, ta) => total + (ta.class_offerings?.periods_per_week || 0),
          0
        ) || 0,
        max_workload: teacher.max_periods_per_week || 30,
        qualification_match: true, // Set based on department check
        schedule_conflicts: 0 // Set based on conflict check
      } : undefined
    };
  } catch (error) {
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get all teaching assignments for a school
 */
export async function getTeachingAssignments(schoolId: string): Promise<TeachingAssignmentWithDetails[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('teaching_assignments')
    .select(`
      *,
      class_offerings (
        *,
        courses (
          id,
          name,
          code,
          department_id
        ),
        classes (
          id,
          name,
          grade_level
        ),
        terms (
          id,
          name,
          start_date,
          end_date
        )
      ),
      teachers (
        id,
        first_name,
        last_name,
        email,
        max_periods_per_week,
        school_id
      )
    `)
    .eq('school_id', schoolId)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch teaching assignments: ${error.message}`);
  }

  return data || [];
}

/**
 * Get teaching assignments for a specific teacher
 */
export async function getTeachingAssignmentsByTeacher(teacherId: string): Promise<TeachingAssignmentWithDetails[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('teaching_assignments')
    .select(`
      *,
      class_offerings (
        *,
        courses (
          id,
          name,
          code,
          department_id
        ),
        classes (
          id,
          name,
          grade_level
        ),
        terms (
          id,
          name,
          start_date,
          end_date
        )
      ),
      teachers (
        id,
        first_name,
        last_name,
        email,
        max_periods_per_week,
        school_id
      )
    `)
    .eq('teacher_id', teacherId)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch teaching assignments: ${error.message}`);
  }

  return data || [];
}

/**
 * Get teaching assignments for a specific term
 */
export async function getTeachingAssignmentsByTerm(termId: string): Promise<TeachingAssignmentWithDetails[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('teaching_assignments')
    .select(`
      *,
      class_offerings!inner (
        *,
        courses (
          id,
          name,
          code,
          department_id
        ),
        classes (
          id,
          name,
          grade_level
        ),
        terms (
          id,
          name,
          start_date,
          end_date
        )
      ),
      teachers (
        id,
        first_name,
        last_name,
        email,
        max_periods_per_week,
        school_id
      )
    `)
    .eq('class_offerings.term_id', termId)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch teaching assignments: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single teaching assignment
 */
export async function getTeachingAssignment(assignmentId: string): Promise<TeachingAssignmentWithDetails | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('teaching_assignments')
    .select(`
      *,
      class_offerings (
        *,
        courses (
          id,
          name,
          code,
          department_id
        ),
        classes (
          id,
          name,
          grade_level
        ),
        terms (
          id,
          name,
          start_date,
          end_date
        )
      ),
      teachers (
        id,
        first_name,
        last_name,
        email,
        max_periods_per_week,
        school_id
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch teaching assignment: ${error.message}`);
  }

  return data;
}

/**
 * Create a new teaching assignment with validation
 */
export async function createTeachingAssignment(
  assignment: Omit<TeachingAssignment, 'id' | 'created_at'>
): Promise<{ data: TeachingAssignment | null; error: string | null }> {
  try {
    // Validate assignment
    const validation = await validateTeachingAssignment(assignment);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('teaching_assignments')
      .insert(assignment)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create teaching assignment', error);
  }
}

/**
 * Update an existing teaching assignment
 */
export async function updateTeachingAssignment(
  id: string,
  updates: Partial<TeachingAssignment>
): Promise<{ data: TeachingAssignment | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get existing assignments for validation
    const { data: existingAssignments } = await supabase
      .from('teaching_assignments')
      .select(`
        *,
        teacher:teachers(*),
        class_offerings:class_offerings(
          *,
          classes:classes(*),
          scheduled_lessons:scheduled_lessons(
            *,
            time_slots:time_slots(*)
          )
        )
      `)
      .neq('id', id)
      .eq('teacher_id', updates.teacher_id || '');

    // Get current assignment
    const { data: currentAssignment } = await supabase
      .from('teaching_assignments')
      .select(`
        *,
        teacher:teachers(*),
        class_offerings:class_offerings(
          *,
          classes:classes(*),
          scheduled_lessons:scheduled_lessons(
            *,
            time_slots:time_slots(*)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (!currentAssignment) {
      return { data: null, error: 'Teaching assignment not found' };
    }

    const updatedAssignment = { ...currentAssignment, ...updates };

    // Validate updated assignment
    const validationErrors = validateTeachingAssignment(
      updatedAssignment as TeachingAssignment,
      existingAssignments || []
    );

    if (validationErrors.length > 0) {
      return { data: null, error: validationErrors.join(', ') };
    }

    // Update assignment
    const { data, error } = await supabase
      .from('teaching_assignments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        teacher:teachers(*),
        class_offerings:class_offerings(
          *,
          classes:classes(*),
          scheduled_lessons:scheduled_lessons(
            *,
            time_slots:time_slots(*)
          )
        )
      `)
      .single();

    if (error) throw error;

    const convertedAssignment = convertToTeachingAssignment(data);
    if (!convertedAssignment) {
      throw new Error('Failed to convert teaching assignment data');
    }

    return { data: convertedAssignment, error: null };
  } catch (error) {
    return handleError('Failed to update teaching assignment', error);
  }
}

/**
 * Delete a teaching assignment
 */
export async function deleteTeachingAssignment(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('teaching_assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to delete teaching assignment', error);
  }
}

/**
 * Get teacher workload summary
 */
export async function getTeacherWorkloadSummary(schoolId: string): Promise<TeacherWorkloadSummary[]> {
  const supabase = createClient();
  
  // Get all teachers with their assignments
  const { data: teachers } = await supabase
    .from('teachers')
    .select(`
      id,
      first_name,
      last_name,
      email,
      max_periods_per_week,
      teaching_assignments (
        class_offerings (
          periods_per_week,
          required_hours_per_term
        )
      )
    `)
    .eq('school_id', schoolId);

  if (!teachers) return [];

  return teachers.map(teacher => {
    const assignments = teacher.teaching_assignments || [];
    const totalPeriodsPerWeek = assignments.reduce((total, assignment) => {
      return total + (assignment.class_offerings?.periods_per_week || 0);
    }, 0);
    
    const totalHoursPerTerm = assignments.reduce((total, assignment) => {
      return total + (assignment.class_offerings?.required_hours_per_term || 0);
    }, 0);
    
    const maxPeriods = teacher.max_periods_per_week || 0;
    const workloadPercentage = maxPeriods > 0 ? (totalPeriodsPerWeek / maxPeriods) * 100 : 0;

    return {
      teacher_id: teacher.id,
      teacher_name: `${teacher.first_name} ${teacher.last_name}`,
      teacher_email: teacher.email,
      total_assignments: assignments.length,
      total_periods_per_week: totalPeriodsPerWeek,
      total_hours_per_term: totalHoursPerTerm,
      max_periods_per_week: teacher.max_periods_per_week,
      workload_percentage: workloadPercentage,
      assignments: assignments.map(assignment => ({
        class_offering_id: '', // Not available in current structure; align with schema if needed
        course_name: '', // Would need to join with courses table
        class_name: '', // Would need to join with classes table
        term_name: '', // Would need to join with terms table
        periods_per_week: assignment.class_offerings?.periods_per_week || 0,
        required_hours_per_term: assignment.class_offerings?.required_hours_per_term || null,
      })),
    };
  });
}

/**
 * Get class offering assignment summary
 */
export async function getClassOfferingAssignmentSummary(schoolId: string): Promise<ClassOfferingAssignmentSummary[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('class_offerings')
    .select(`
      id,
      periods_per_week,
      required_hours_per_term,
      courses (
        name
      ),
      classes (
        name
      ),
      terms (
        name
      ),
      teaching_assignments (
        teachers (
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('courses.school_id', schoolId);

  if (error) {
    throw new Error(`Failed to fetch class offering assignments: ${error.message}`);
  }

  return (data || []).map(offering => {
    const assignment = offering.teaching_assignments?.[0];
    const teacher = assignment?.teachers;
    
    return {
      class_offering_id: offering.id,
      course_name: offering.courses?.name || '',
      class_name: offering.classes?.name || '',
      term_name: offering.terms?.name || '',
      periods_per_week: offering.periods_per_week,
      required_hours_per_term: offering.required_hours_per_term,
      assigned_teacher: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
      teacher_email: teacher?.email || null,
      is_assigned: !!teacher,
    };
  });
}

/**
 * Bulk assign teachers to class offerings
 */
export async function bulkAssignTeachers(
  assignments: Array<{ class_offering_id: string; teacher_id: string; assignment_type?: string }>
): Promise<TeachingAssignment[]> {
  const supabase = createClient();
  
  // Validate all assignments first
  for (const assignment of assignments) {
    const validation = await validateTeachingAssignment({
      class_offering_id: assignment.class_offering_id,
      teacher_id: assignment.teacher_id,
      assignment_type: assignment.assignment_type,
      school_id: '', // Will be set from class offering
    });
    if (!validation.isValid) {
      throw new Error(`Invalid assignment: ${validation.message}`);
    }
  }

  // Get school_id for each class offering
  const { data: classOfferings } = await supabase
    .from('class_offerings')
    .select('id, courses(school_id)')
    .in('id', assignments.map(a => a.class_offering_id));

  if (!classOfferings) {
    throw new Error('Failed to fetch class offerings');
  }

  const schoolIdMap = new Map(classOfferings.map(co => [co.id, co.courses?.school_id]));

  const assignmentsWithSchoolId = assignments.map(assignment => ({
    ...assignment,
    school_id: schoolIdMap.get(assignment.class_offering_id) || '',
    assigned_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('teaching_assignments')
    .insert(assignmentsWithSchoolId)
    .select();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      throw new Error('One or more teachers are already assigned to the specified class offerings');
    }
    throw new Error(`Failed to create teaching assignments: ${error.message}`);
  }

  return data || [];
}

/**
 * Get unassigned class offerings for a school
 */
export async function getUnassignedClassOfferings(schoolId: string): Promise<ClassOffering[]> {
  const supabase = createClient();

  // Step 1: Get all assigned class_offering_ids
  const { data: assigned, error: assignedError } = await supabase
    .from('teaching_assignments')
    .select('class_offering_id');

  if (assignedError) {
    throw new Error(`Failed to fetch assigned class offerings: ${assignedError.message}`);
  }

  const assignedIds = (assigned || []).map(a => a.class_offering_id);

  // Step 2: Get unassigned class offerings
  const { data, error } = await supabase
    .from('class_offerings')
    .select(`
      *,
      courses!inner (
        id,
        name,
        code,
        school_id
      ),
      classes (
        id,
        name,
        grade_level
      ),
      terms (
        id,
        name,
        start_date,
        end_date
      )
    `)
    .eq('courses.school_id', schoolId)
    .not('id', 'in', assignedIds.length > 0 ? assignedIds : ['']);

  if (error) {
    throw new Error(`Failed to fetch unassigned class offerings: ${error.message}`);
  }

  return data || [];
}

/**
 * Get available teachers for a class offering
 */
export async function getAvailableTeachersForClassOffering(classOfferingId: string): Promise<Teacher[]> {
  const supabase = createClient();
  
  // Get class offering details
  const { data: classOffering } = await supabase
    .from('class_offerings')
    .select(`
      courses (
        department_id,
        school_id
      )
    `)
    .eq('id', classOfferingId)
    .single();

  if (!classOffering) {
    throw new Error('Class offering not found');
  }

  // Get teachers from the same school and department
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select(`
      *,
      teacher_departments!inner (
        department_id
      )
    `)
    .eq('school_id', classOffering.courses.school_id)
    .eq('teacher_departments.department_id', classOffering.courses.department_id);

  if (error) {
    throw new Error(`Failed to fetch available teachers: ${error.message}`);
  }

  return teachers || [];
}

export async function getTeacherAssignments(teacherId: string, termId?: string): Promise<TeachingAssignment[]> {
  const supabase = await createClient();

  let query = supabase
    .from('teaching_assignments')
    .select(`
      *,
      class_offerings (
        id,
        periods_per_week,
        term_id,
        classes (
          id,
          name,
          grade_level
        ),
        courses (
          id,
          name,
          code,
          department_id
        )
      )
    `)
    .eq('teacher_id', teacherId);

  if (termId) {
    query = query.eq('class_offerings.term_id', termId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get teaching assignments for a class offering
 */
export async function getClassOfferingAssignments(
  classOfferingId: string
): Promise<{ data: TeachingAssignment[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('teaching_assignments')
      .select(`
        *,
        teacher:teachers(*),
        class_offerings:class_offerings(
          *,
          classes:classes(*),
          scheduled_lessons:scheduled_lessons(
            *,
            time_slots:time_slots(*)
          )
        )
      `)
      .eq('class_offering_id', classOfferingId);

    if (error) throw error;

    const convertedAssignments = data
      .map(convertToTeachingAssignment)
      .filter((a): a is TeachingAssignment => a !== null);

    return { data: convertedAssignments, error: null };
  } catch (error) {
    return handleError('Failed to get class offering assignments', error);
  }
}

/**
 * Validate schedule for a set of teaching assignments
 */
export async function validateTeachingSchedule(
  assignments: TeachingAssignment[],
  schoolId: string
): Promise<{ isValid: boolean; errors: string[] }> {
  try {
    const supabase = createClient();

    // Get school constraints
    const { data: constraintsData } = await supabase
      .from('school_constraints')
      .select('*')
      .eq('school_id', schoolId)
      .single();

    if (!constraintsData) {
      return {
        isValid: false,
        errors: ['School constraints not found']
      };
    }

    // Get all time slots for these assignments
    const timeSlots = assignments.flatMap(a => 
      a.scheduled_lessons?.flatMap(l => l.time_slots) || []
    ).filter((slot): slot is TimeSlot => slot !== null);

    // Validate schedule
    const validationErrors = validateSchedule(
      assignments,
      timeSlots,
      constraintsData as SchoolConstraints
    );

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    };
  } catch (error) {
    const { error: errorMessage } = handleError('Failed to validate teaching schedule', error);
    return {
      isValid: false,
      errors: [errorMessage || 'Unknown error occurred']
    };
  }
} 