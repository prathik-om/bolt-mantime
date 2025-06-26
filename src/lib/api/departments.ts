import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';
import { Department, Teacher } from '../types/database-helpers';
import { handleError } from '../utils/error-handling';

type DepartmentType = Database['public']['Tables']['departments']['Row'];
type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];

export interface DepartmentWithStats extends DepartmentType {
  teacher_count: number;
  course_count: number;
}

export interface DepartmentWithTeachers extends DepartmentType {
  teachers: Teacher[];
}

/**
 * Get all departments for a school
 */
export async function getDepartments(schoolId: string): Promise<{ data: DepartmentType[] | null; error: string | null }> {
  try {
    const supabase = createClient();
    
    console.log("Getting departments for schoolId:", schoolId);
    
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (error) throw error;

    console.log("Basic departments query result:", data);
    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get departments', error);
  }
}

/**
 * Get a single department by ID
 */
export async function getDepartment(id: string): Promise<{ data: DepartmentType | null; error: string | null }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get department', error);
  }
}

/**
 * Create a new department
 */
export async function createDepartment(
  department: Omit<DepartmentType, 'id' | 'created_at'>
): Promise<{ data: DepartmentType | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Validate department data
    const validationErrors = await validateDepartment(department);
    if (validationErrors.length > 0) {
      return { data: null, error: validationErrors.join(', ') };
    }

    // Check for duplicate department name in the same school
    const { data: existingDepartment } = await supabase
      .from('departments')
      .select('id')
      .eq('school_id', department.school_id)
      .ilike('name', department.name)
      .maybeSingle();

    if (existingDepartment) {
      return { data: null, error: 'A department with this name already exists in the school' };
    }

    const { data, error } = await supabase
      .from('departments')
      .insert(department)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create department', error);
  }
}

/**
 * Update an existing department
 */
export async function updateDepartment(
  id: string,
  updates: Partial<DepartmentType>
): Promise<{ data: DepartmentType | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current department
    const { data: currentDepartment } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentDepartment) {
      return { data: null, error: 'Department not found' };
    }

    const updatedDepartment = { ...currentDepartment, ...updates };

    // Validate updated department data
    const validationErrors = await validateDepartment(updatedDepartment);
    if (validationErrors.length > 0) {
      return { data: null, error: validationErrors.join(', ') };
    }

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== currentDepartment.name) {
      const { data: existingDepartment } = await supabase
        .from('departments')
        .select('id')
        .eq('school_id', currentDepartment.school_id)
        .ilike('name', updates.name)
        .neq('id', id)
        .maybeSingle();

      if (existingDepartment) {
        return { data: null, error: 'A department with this name already exists in the school' };
      }
    }

    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to update department', error);
  }
}

/**
 * Delete a department
 */
export async function deleteDepartment(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Check for dependencies
    const dependencies = await checkDepartmentDependencies(id);
    if (dependencies.hasDependencies) {
      return {
        success: false,
        error: `Cannot delete department: ${dependencies.message}`
      };
    }

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to delete department', error);
  }
}

/**
 * Get departments with statistics (teacher and course counts)
 */
export async function getDepartmentsWithStats(schoolId: string): Promise<DepartmentWithStats[]> {
  const supabase = createClient();
  
  // Debug: Check current user and profile
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log("Current user:", user);
  console.log("User error:", userError);
  
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log("User profile:", profile);
    console.log("Profile error:", profileError);
  }
  
  // Get departments (from departments table)
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*')
    .eq('school_id', schoolId)
    .order('name', { ascending: true });

  if (deptError) {
    console.error("Error fetching departments:", deptError);
    throw new Error(`Failed to fetch departments: ${deptError.message}`);
  }

  console.log("Fetched departments:", departments);

  if (!departments || departments.length === 0) {
    return [];
  }

  const departmentIds = departments.map(d => d.id);

  // Get teacher counts per department from teacher_departments table
  let teacherCounts: { department_id: string; count: number }[] = [];
  try {
    const { data: teacherData, error: teacherError } = await supabase
      .from('teacher_departments')
      .select('department_id')
      .in('department_id', departmentIds);

    if (teacherError) {
      console.warn('Error fetching teacher counts:', teacherError.message);
    } else if (teacherData) {
      // Count teachers per department
      const teacherCountMap = new Map<string, number>();
      teacherData.forEach(td => {
        teacherCountMap.set(td.department_id, (teacherCountMap.get(td.department_id) || 0) + 1);
      });
      teacherCounts = Array.from(teacherCountMap.entries()).map(([department_id, count]) => ({
        department_id,
        count
      }));
    }
  } catch (error) {
    console.warn('Failed to fetch teacher counts:', error);
  }

  // Get subject counts per department (courses.department_id -> departments.id)
  let subjectCounts: { department_id: string; count: number }[] = [];
  try {
    const { data: subjectData, error: subjectError } = await supabase
      .from('courses')
      .select('department_id')
      .in('department_id', departmentIds)
      .not('department_id', 'is', null);

    if (subjectError) {
      console.warn('Error fetching subject counts:', subjectError.message);
    } else if (subjectData) {
      // Count subjects per department
      const subjectCountMap = new Map<string, number>();
      subjectData.forEach(course => {
        if (course.department_id) {
          subjectCountMap.set(course.department_id, (subjectCountMap.get(course.department_id) || 0) + 1);
        }
      });
      subjectCounts = Array.from(subjectCountMap.entries()).map(([department_id, count]) => ({
        department_id,
        count
      }));
    }
  } catch (error) {
    console.warn('Failed to fetch subject counts:', error);
  }

  // Create maps for easy lookup
  const teacherCountMap = new Map(
    teacherCounts.map(tc => [tc.department_id, tc.count])
  );
  const subjectCountMap = new Map(
    subjectCounts.map(sc => [sc.department_id, sc.count])
  );

  // Combine departments with their stats
  const departmentsWithStats = departments.map(dept => ({
    ...dept,
    teacher_count: teacherCountMap.get(dept.id) || 0,
    course_count: subjectCountMap.get(dept.id) || 0
  }));

  console.log("Final departments with stats:", departmentsWithStats);
  return departmentsWithStats;
}

/**
 * Check if a department name already exists in the school
 */
export async function checkDepartmentNameExists(name: string, schoolId: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient();
  
  let query = supabase
    .from('departments')
    .select('id')
    .eq('name', name.trim())
    .eq('school_id', schoolId);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to check department name: ${error.message}`);
  }

  return (data?.length || 0) > 0;
}

/**
 * Get departments for dropdown/select components
 */
export async function getDepartmentsForSelect(schoolId: string): Promise<{ value: string; label: string }[]> {
  const { data, error } = await getDepartments(schoolId);
  
  if (error) throw error;
  
  return data?.map(dept => ({
    value: dept.id,
    label: dept.name,
  })) || [];
}

/**
 * Bulk create departments from a list
 */
export async function bulkCreateDepartments(departments: Omit<DepartmentInsert, 'id' | 'created_at' | 'updated_at'>[]): Promise<DepartmentType[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('departments')
    .insert(departments)
    .select();

  if (error) {
    throw new Error(`Failed to bulk create departments: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a department with its teachers
 */
export async function getDepartmentWithTeachers(
  id: string
): Promise<{ data: DepartmentWithTeachers | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('departments')
      .select(`
        *,
        teachers (
          id,
          first_name,
          last_name,
          email,
          department_id
        ),
        teacher_count:teachers(count)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get department with teachers', error);
  }
}

/**
 * Helper function to validate department data
 */
async function validateDepartment(department: Partial<DepartmentType>): Promise<string[]> {
  const errors: string[] = [];
  const supabase = createClient();

  if (!department.school_id) {
    errors.push('School ID is required');
  } else {
    // Check if school exists
    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('id', department.school_id)
      .single();

    if (!school) {
      errors.push('Invalid school');
    }
  }

  if (!department.name?.trim()) {
    errors.push('Department name is required');
  } else if (department.name.length > 100) {
    errors.push('Department name cannot exceed 100 characters');
  }

  if (department.description && department.description.length > 500) {
    errors.push('Department description cannot exceed 500 characters');
  }

  return errors;
}

/**
 * Helper function to check department dependencies
 */
async function checkDepartmentDependencies(
  departmentId: string
): Promise<{ hasDependencies: boolean; message: string }> {
  const supabase = createClient();

  // Check for teachers in the department
  const { count: teacherCount } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', departmentId);

  // Check for teaching assignments
  const { count: assignmentCount } = await supabase
    .from('teaching_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teachers.department_id', departmentId);

  const dependencies = [];
  if (teacherCount) dependencies.push(`${teacherCount} teachers`);
  if (assignmentCount) dependencies.push(`${assignmentCount} teaching assignments`);

  return {
    hasDependencies: dependencies.length > 0,
    message: dependencies.length > 0
      ? `Department has active ${dependencies.join(', ')}`
      : ''
  };
} 