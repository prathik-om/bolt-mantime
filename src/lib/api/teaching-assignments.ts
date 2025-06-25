import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

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
 * Create a new teaching assignment
 */
export async function createTeachingAssignment(assignmentData: TeachingAssignmentInsert): Promise<TeachingAssignment> {
  const supabase = createClient();
  
  // Validate assignment data
  const validation = await validateTeachingAssignment(assignmentData);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  const { data, error } = await supabase
    .from('teaching_assignments')
    .insert({
      ...assignmentData,
      assigned_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('teaching_assignments_class_offering_teacher_unique')) {
        throw new Error('This teacher is already assigned to this class offering');
      }
    }
    throw new Error(`Failed to create teaching assignment: ${error.message}`);
  }

  return data;
}

/**
 * Update a teaching assignment
 */
export async function updateTeachingAssignment(
  assignmentId: string, 
  updates: TeachingAssignmentUpdate
): Promise<TeachingAssignment> {
  const supabase = createClient();
  
  // Validate assignment data
  const validation = await validateTeachingAssignment(updates, assignmentId);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  const { data, error } = await supabase
    .from('teaching_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('teaching_assignments_class_offering_teacher_unique')) {
        throw new Error('This teacher is already assigned to this class offering');
      }
    }
    throw new Error(`Failed to update teaching assignment: ${error.message}`);
  }

  return data;
}

/**
 * Delete a teaching assignment
 */
export async function deleteTeachingAssignment(assignmentId: string): Promise<void> {
  const supabase = createClient();
  
  // Check if this assignment is being used in scheduled lessons
  const { data: scheduledLessons } = await supabase
    .from('scheduled_lessons')
    .select('id')
    .eq('teaching_assignment_id', assignmentId)
    .limit(1);

  if (scheduledLessons && scheduledLessons.length > 0) {
    throw new Error('Cannot delete teaching assignment: it is being used in scheduled lessons');
  }

  const { error } = await supabase
    .from('teaching_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    throw new Error(`Failed to delete teaching assignment: ${error.message}`);
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
 * Validate teaching assignment
 */
export async function validateTeachingAssignment(
  assignmentData: Partial<TeachingAssignment>,
  excludeId?: string
): Promise<{ isValid: boolean; message: string }> {
  const supabase = createClient();
  
  if (!assignmentData.class_offering_id || !assignmentData.teacher_id) {
    return { isValid: false, message: 'Class offering ID and teacher ID are required' };
  }

  // Check if class offering exists and get school_id
  const { data: classOffering } = await supabase
    .from('class_offerings')
    .select('id, courses(school_id)')
    .eq('id', assignmentData.class_offering_id)
    .single();

  if (!classOffering) {
    return { isValid: false, message: 'Class offering not found' };
  }

  // Check if teacher exists and belongs to the same school
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, school_id')
    .eq('id', assignmentData.teacher_id)
    .single();

  if (!teacher) {
    return { isValid: false, message: 'Teacher not found' };
  }

  if (teacher.school_id !== classOffering.courses?.school_id) {
    return { isValid: false, message: 'Teacher and class offering must belong to the same school' };
  }

  // Check if teacher is already assigned to this class offering
  let query = supabase
    .from('teaching_assignments')
    .select('id')
    .eq('class_offering_id', assignmentData.class_offering_id)
    .eq('teacher_id', assignmentData.teacher_id);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: existingAssignment } = await query;

  if (existingAssignment && existingAssignment.length > 0) {
    return { isValid: false, message: 'Teacher is already assigned to this class offering' };
  }

  return { isValid: true, message: 'Teaching assignment is valid' };
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