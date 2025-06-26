import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/lib/database.types'
import { Teacher } from '../types/database-helpers'
import { handleError } from '../utils/error-handling'

type Teacher = Database['public']['Tables']['teachers']['Row']
type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
type TeacherUpdate = Database['public']['Tables']['teachers']['Update']

export async function getTeachers(schoolId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      *,
      teacher_departments (
        department_id,
        is_primary,
        departments (
          id,
          name
        )
      )
    `)
    .eq('school_id', schoolId)
    .order('first_name')

  if (error) throw error
  return data || []
}

/**
 * Create a new teacher
 */
export async function createTeacher(
  teacher: Omit<Teacher, 'id' | 'created_at'>
): Promise<{ data: Teacher | null; error: string | null }> {
  try {
    const supabase = createClient()

    // Validate teacher data
    const validationErrors = await validateTeacher(teacher)
    if (validationErrors.length > 0) {
      return { data: null, error: validationErrors.join(', ') }
    }

    // Check for duplicate email
    const { data: existingTeacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', teacher.email)
      .maybeSingle()

    if (existingTeacher) {
      return { data: null, error: 'A teacher with this email already exists' }
    }

    // Check if department exists and belongs to the same school
    if (teacher.department_id) {
      const { data: department } = await supabase
        .from('departments')
        .select('school_id')
        .eq('id', teacher.department_id)
        .single()

      if (!department) {
        return { data: null, error: 'Department not found' }
      }

      if (department.school_id !== teacher.school_id) {
        return { data: null, error: 'Department must belong to the same school' }
      }
    }

    const { data, error } = await supabase
      .from('teachers')
      .insert(teacher)
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    return handleError('Failed to create teacher', error)
  }
}

/**
 * Update a teacher
 */
export async function updateTeacher(
  id: string,
  updates: Partial<Teacher>
): Promise<{ data: Teacher | null; error: string | null }> {
  try {
    const supabase = createClient()

    // Get current teacher
    const { data: currentTeacher } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentTeacher) {
      return { data: null, error: 'Teacher not found' }
    }

    const updatedTeacher = { ...currentTeacher, ...updates }

    // Validate updated teacher data
    const validationErrors = await validateTeacher(updatedTeacher)
    if (validationErrors.length > 0) {
      return { data: null, error: validationErrors.join(', ') }
    }

    // Check for duplicate email if email is being updated
    if (updates.email && updates.email !== currentTeacher.email) {
      const { data: existingTeacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', updates.email)
        .neq('id', id)
        .maybeSingle()

      if (existingTeacher) {
        return { data: null, error: 'A teacher with this email already exists' }
      }
    }

    // Check if department exists and belongs to the same school
    if (updates.department_id && updates.department_id !== currentTeacher.department_id) {
      const { data: department } = await supabase
        .from('departments')
        .select('school_id')
        .eq('id', updates.department_id)
        .single()

      if (!department) {
        return { data: null, error: 'Department not found' }
      }

      if (department.school_id !== currentTeacher.school_id) {
        return { data: null, error: 'Department must belong to the same school' }
      }
    }

    const { data, error } = await supabase
      .from('teachers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    return handleError('Failed to update teacher', error)
  }
}

/**
 * Delete a teacher
 */
export async function deleteTeacher(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient()

    // Check if teacher exists
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', id)
      .single()

    if (!teacher) {
      return { success: false, error: 'Teacher not found' }
    }

    // Check for dependencies
    const dependencies = await checkTeacherDependencies(id)
    if (dependencies.hasDependencies) {
      return {
        success: false,
        error: `Cannot delete teacher: ${dependencies.message}`
      }
    }

    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    return handleError('Failed to delete teacher', error)
  }
}

/**
 * Helper function to validate teacher data
 */
async function validateTeacher(teacher: Partial<Teacher>): Promise<string[]> {
  const errors: string[] = []
  const supabase = createClient()

  if (!teacher.school_id) {
    errors.push('School ID is required')
  } else {
    // Check if school exists
    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('id', teacher.school_id)
      .single()

    if (!school) {
      errors.push('Invalid school')
    }
  }

  if (!teacher.first_name?.trim()) {
    errors.push('First name is required')
  } else if (teacher.first_name.length > 50) {
    errors.push('First name cannot exceed 50 characters')
  }

  if (!teacher.last_name?.trim()) {
    errors.push('Last name is required')
  } else if (teacher.last_name.length > 50) {
    errors.push('Last name cannot exceed 50 characters')
  }

  if (!teacher.email?.trim()) {
    errors.push('Email is required')
  } else if (!isValidEmail(teacher.email)) {
    errors.push('Invalid email format')
  }

  if (teacher.phone && !isValidPhone(teacher.phone)) {
    errors.push('Invalid phone format')
  }

  if (teacher.status && !['active', 'inactive', 'on_leave'].includes(teacher.status)) {
    errors.push('Invalid status')
  }

  return errors
}

/**
 * Helper function to check teacher dependencies
 */
async function checkTeacherDependencies(
  teacherId: string
): Promise<{ hasDependencies: boolean; message: string }> {
  const supabase = createClient()

  // Check for teaching assignments
  const { count: assignmentCount } = await supabase
    .from('teaching_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', teacherId)

  // Check for qualifications
  const { count: qualificationCount } = await supabase
    .from('teacher_qualifications')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', teacherId)

  const dependencies = []
  if (assignmentCount) dependencies.push(`${assignmentCount} teaching assignments`)
  if (qualificationCount) dependencies.push(`${qualificationCount} qualifications`)

  return {
    hasDependencies: dependencies.length > 0,
    message: dependencies.length > 0
      ? `Teacher has active ${dependencies.join(', ')}`
      : ''
  }
}

/**
 * Helper function to validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Helper function to validate phone format
 */
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/
  return phoneRegex.test(phone)
}

export async function getTeacher(id: string): Promise<{ id: string; first_name: string; last_name: string; email: string; max_periods_per_week: number | null; school_id: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teachers')
    .select('id, first_name, last_name, email, max_periods_per_week, school_id')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch teacher: ${error.message}`);
  }

  return data;
}

export async function getTeacherWithQualifications(id: string): Promise<any> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id, first_name, last_name, email, max_periods_per_week, school_id,
      teacher_departments(
        id,
        teacher_id,
        department_id,
        is_primary,
        department:departments(id, name)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch teacher with qualifications: ${error.message}`);
  }

  return data;
}

export async function getTeacherSchedule(teacherId: string, termId?: string): Promise<any[]> {
  const supabase = createClient();
  
  try {
    let query = supabase
      .from('timetable_entries')
      .select(`
        id,
        date,
        time_slots (
          id,
          day_of_week,
          start_time,
          end_time,
          period_number
        ),
        teaching_assignments!inner (
          id,
          teacher_id,
          class_offerings (
            id,
            subjects (
              id,
              name,
              code
            ),
            classes (
              id,
              name,
              grade_id,
              section
            )
          )
        )
      `)
      .eq('teaching_assignments.teacher_id', teacherId);

    if (termId) {
      query = query.eq('teaching_assignments.class_offerings.term_id', termId);
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .order('time_slots.start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    return [];
  }
}

export async function addTeacherQualification(data: {
  teacherId: string;
  departmentId: string;
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('teacher_departments')
    .insert({
      teacher_id: data.teacherId,
      department_id: data.departmentId,
    });

  if (error) {
    throw new Error(`Failed to add teacher qualification: ${error.message}`);
  }
}

export async function removeTeacherQualification(data: {
  teacherId: string;
  departmentId: string;
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('teacher_departments')
    .delete()
    .eq('teacher_id', data.teacherId)
    .eq('department_id', data.departmentId);

  if (error) {
    throw new Error(`Failed to remove teacher qualification: ${error.message}`);
  }
}

export async function getTeacherConstraints(teacherId: string): Promise<any[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teacher_time_constraints')
    .select(`
      *,
      time_slot:time_slots(*)
    `)
    .eq('teacher_id', teacherId)
    .order('time_slot.day_of_week', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch teacher constraints: ${error.message}`);
  }

  return data || [];
}

export async function addTeacherConstraint(data: {
  teacherId: string;
  timeSlotId: string;
  constraintType: string;
  reason?: string;
  priority?: number;
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('teacher_time_constraints')
    .insert({
      teacher_id: data.teacherId,
      time_slot_id: data.timeSlotId,
      constraint_type: data.constraintType,
      reason: data.reason || null,
      priority: data.priority || null,
    });

  if (error) {
    throw new Error(`Failed to add teacher constraint: ${error.message}`);
  }
}

export async function removeTeacherConstraint(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('teacher_time_constraints')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to remove teacher constraint: ${error.message}`);
  }
} 