import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

type TeacherDepartment = Database['public']['Tables']['teacher_departments']['Row'];
type TeacherDepartmentInsert = Database['public']['Tables']['teacher_departments']['Insert'];
type TeacherDepartmentUpdate = Database['public']['Tables']['teacher_departments']['Update'];

export interface TeacherWithDepartments {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school_id: string;
  max_periods_per_week: number | null;
  teacher_departments?: {
    id: string;
    department_id: string;
    is_primary: boolean | null;
    department: {
      id: string;
      name: string;
      code: string | null;
    };
  }[];
}

export interface DepartmentWithTeachers {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  school_id: string;
  created_at: string | null;
  updated_at: string | null;
  teacher_departments?: {
    id: string;
    teacher_id: string;
    is_primary: boolean | null;
    teacher: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  }[];
}

export interface TeacherQualification {
  course_id: string;
  course_name: string;
  course_code: string | null;
  department_id: string;
  department_name: string;
  grade_level: number;
  is_primary_department: boolean;
}

export interface TeacherDepartmentSummary {
  department_id: string;
  department_name: string;
  department_code: string | null;
  is_primary: boolean;
  course_count: number;
  courses: string[];
}

export interface TeacherWorkloadInfo {
  teacher_id: string;
  teacher_name: string;
  total_periods_per_week: number;
  max_periods_per_week: number;
  utilization_percentage: number;
  department_assignments: {
    department_id: string;
    department_name: string;
    is_primary: boolean;
    periods_per_week: number;
  }[];
}

/**
 * Get all teacher-department assignments for a school
 */
export async function getTeacherDepartments(schoolId: string): Promise<TeacherDepartment[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('teacher_departments')
    .select(`
      *,
      teacher:teachers!teacher_departments_teacher_id_fkey(school_id),
      department:departments!teacher_departments_department_id_fkey(school_id)
    `)
    .eq('teacher.school_id', schoolId)
    .eq('department.school_id', schoolId);

  if (error) {
    throw new Error(`Failed to fetch teacher departments: ${error.message}`);
  }

  return data || [];
}

/**
 * Get teachers with their department assignments
 */
export async function getTeachersWithDepartments(schoolId: string): Promise<TeacherWithDepartments[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      *,
      teacher_departments (
        id,
        department_id,
        is_primary,
        department:departments (
          id,
          name,
          code
        )
      )
    `)
    .eq('school_id', schoolId)
    .order('first_name');

  if (error) {
    throw new Error(`Failed to fetch teachers with departments: ${error.message}`);
  }

  return data || [];
}

/**
 * Get departments with their teacher assignments
 */
export async function getDepartmentsWithTeachers(schoolId: string): Promise<DepartmentWithTeachers[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('departments')
    .select(`
      *,
      teacher_departments (
        id,
        teacher_id,
        is_primary,
        teacher:teachers (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('school_id', schoolId)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch departments with teachers: ${error.message}`);
  }

  return data || [];
}

/**
 * Assign a teacher to a department
 */
export async function assignTeacherToDepartment(
  teacherId: string, 
  departmentId: string, 
  isPrimary: boolean = false
): Promise<TeacherDepartment> {
  const supabase = createClient();
  
  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('teacher_departments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('department_id', departmentId)
    .single();

  if (existing) {
    throw new Error('Teacher is already assigned to this department');
  }
  
  // If this is a primary assignment, unset other primary assignments for this teacher
  if (isPrimary) {
    await supabase
      .from('teacher_departments')
      .update({ is_primary: false })
      .eq('teacher_id', teacherId)
      .eq('is_primary', true);
  }
  
  const { data, error } = await supabase
    .from('teacher_departments')
    .insert({
      teacher_id: teacherId,
      department_id: departmentId,
      is_primary: isPrimary
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to assign teacher to department: ${error.message}`);
  }

  return data;
}

/**
 * Remove a teacher from a department
 */
export async function removeTeacherFromDepartment(
  teacherId: string, 
  departmentId: string
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('teacher_departments')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('department_id', departmentId);

  if (error) {
    throw new Error(`Failed to remove teacher from department: ${error.message}`);
  }
}

/**
 * Update teacher department assignment (e.g., change primary status)
 */
export async function updateTeacherDepartment(
  teacherId: string, 
  departmentId: string,
  updates: Partial<TeacherDepartmentUpdate>
): Promise<TeacherDepartment> {
  const supabase = createClient();
  
  // If setting as primary, unset other primary assignments
  if (updates.is_primary) {
    await supabase
      .from('teacher_departments')
      .update({ is_primary: false })
      .eq('teacher_id', teacherId)
      .eq('is_primary', true);
  }
  
  const { data, error } = await supabase
    .from('teacher_departments')
    .update(updates)
    .eq('teacher_id', teacherId)
    .eq('department_id', departmentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update teacher department: ${error.message}`);
  }

  return data;
}

/**
 * Get teacher qualifications (courses they can teach based on department assignments)
 */
export async function getTeacherQualifications(teacherId: string): Promise<TeacherQualification[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('get_teacher_qualifications', { p_teacher_id: teacherId });

  if (error) {
    throw new Error(`Failed to fetch teacher qualifications: ${error.message}`);
  }

  return data || [];
}

/**
 * Get teachers qualified for a specific course
 */
export async function getTeachersForCourse(courseId: string): Promise<any[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('get_teachers_for_course', { p_course_id: courseId });

  if (error) {
    throw new Error(`Failed to fetch teachers for course: ${error.message}`);
  }

  return data || [];
}

/**
 * Get teacher department summary with course counts
 */
export async function getTeacherDepartmentSummary(teacherId: string): Promise<TeacherDepartmentSummary[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('get_teacher_department_summary', { p_teacher_id: teacherId });

  if (error) {
    throw new Error(`Failed to fetch teacher department summary: ${error.message}`);
  }

  return data || [];
}

/**
 * Get teacher workload information including department assignments
 */
export async function getTeacherWorkloadInfo(teacherId: string, termId: string): Promise<TeacherWorkloadInfo> {
  const supabase = createClient();
  
  // Get teacher info
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id, first_name, last_name, max_periods_per_week')
    .eq('id', teacherId)
    .single();

  if (teacherError) {
    throw new Error(`Failed to fetch teacher info: ${teacherError.message}`);
  }

  // Get current teaching assignments for the term
  const { data: assignments, error: assignmentsError } = await supabase
    .from('teaching_assignments')
    .select(`
      class_offering:class_offerings!inner(
        periods_per_week,
        term_id
      )
    `)
    .eq('teacher_id', teacherId)
    .eq('class_offering.term_id', termId);

  if (assignmentsError) {
    throw new Error(`Failed to fetch teaching assignments: ${assignmentsError.message}`);
  }

  // Get department assignments
  const { data: deptAssignments, error: deptError } = await supabase
    .from('teacher_departments')
    .select(`
      department_id,
      is_primary,
      department:departments(name)
    `)
    .eq('teacher_id', teacherId);

  if (deptError) {
    throw new Error(`Failed to fetch department assignments: ${deptError.message}`);
  }

  const totalPeriods = (assignments || []).reduce((sum, assignment) => 
    sum + (assignment.class_offering.periods_per_week || 0), 0
  );

  const maxPeriods = teacher.max_periods_per_week || 20;
  const utilizationPercentage = maxPeriods > 0 ? (totalPeriods / maxPeriods) * 100 : 0;

  return {
    teacher_id: teacher.id,
    teacher_name: `${teacher.first_name} ${teacher.last_name}`,
    total_periods_per_week: totalPeriods,
    max_periods_per_week: maxPeriods,
    utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
    department_assignments: (deptAssignments || []).map(da => ({
      department_id: da.department_id,
      department_name: da.department.name,
      is_primary: da.is_primary || false,
      periods_per_week: 0 // This would need to be calculated based on actual assignments
    }))
  };
}

/**
 * Bulk assign a teacher to multiple departments
 */
export async function bulkAssignTeacherToDepartments(
  teacherId: string, 
  departmentIds: string[], 
  primaryDepartmentId?: string
): Promise<TeacherDepartment[]> {
  const supabase = createClient();
  
  // Remove existing assignments
  await supabase
    .from('teacher_departments')
    .delete()
    .eq('teacher_id', teacherId);
  
  // Create new assignments
  const assignments = departmentIds.map(deptId => ({
    teacher_id: teacherId,
    department_id: deptId,
    is_primary: deptId === primaryDepartmentId
  }));
  
  const { data, error } = await supabase
    .from('teacher_departments')
    .insert(assignments)
    .select();

  if (error) {
    throw new Error(`Failed to bulk assign teacher to departments: ${error.message}`);
  }

  return data || [];
}

/**
 * Get teachers by department
 */
export async function getTeachersByDepartment(departmentId: string): Promise<TeacherWithDepartments[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('teacher_departments')
    .select(`
      teacher:teachers(
        id,
        first_name,
        last_name,
        email,
        school_id,
        max_periods_per_week,
        teacher_departments(
          id,
          department_id,
          is_primary,
          department:departments(
            id,
            name,
            code
          )
        )
      )
    `)
    .eq('department_id', departmentId);

  if (error) {
    throw new Error(`Failed to fetch teachers by department: ${error.message}`);
  }

  return (data || []).map(item => item.teacher);
}

/**
 * Validate teacher department assignment
 */
export async function validateTeacherDepartmentAssignment(
  teacherId: string, 
  departmentId: string
): Promise<{ isValid: boolean; message: string }> {
  const supabase = createClient();
  
  // Check if teacher exists
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id, school_id')
    .eq('id', teacherId)
    .single();

  if (teacherError || !teacher) {
    return { isValid: false, message: 'Teacher not found' };
  }

  // Check if department exists and belongs to same school
  const { data: department, error: deptError } = await supabase
    .from('departments')
    .select('id, school_id')
    .eq('id', departmentId)
    .single();

  if (deptError || !department) {
    return { isValid: false, message: 'Department not found' };
  }

  if (teacher.school_id !== department.school_id) {
    return { isValid: false, message: 'Teacher and department must belong to the same school' };
  }

  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('teacher_departments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('department_id', departmentId)
    .single();

  if (existing) {
    return { isValid: false, message: 'Teacher is already assigned to this department' };
  }

  return { isValid: true, message: 'Assignment is valid' };
} 