import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

type Department = Database['public']['Tables']['departments']['Row'];
type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];

export interface DepartmentWithStats extends Department {
  teacher_count: number;
  course_count: number;
}

/**
 * Get all departments for a school
 */
export async function getDepartments(schoolId: string): Promise<Department[]> {
  const supabase = createClient();
  
  console.log("Getting departments for schoolId:", schoolId);
  
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('school_id', schoolId)
    .order('name', { ascending: true });

  if (error) {
    console.error("Error getting departments:", error);
    throw new Error(`Failed to fetch departments: ${error.message}`);
  }

  console.log("Basic departments query result:", data);
  return data || [];
}

/**
 * Get a single department by ID
 */
export async function getDepartment(id: string): Promise<Department | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch department: ${error.message}`);
  }

  return data;
}

/**
 * Create a new department
 */
export async function createDepartment(department: DepartmentInsert): Promise<Department> {
  const supabase = createClient();
  
  console.log("Creating department with data:", department);
  
  const { data, error } = await supabase
    .from('departments')
    .insert(department)
    .select()
    .single();

  if (error) {
    console.error("Error creating department:", error);
    throw new Error(`Failed to create department: ${error.message}`);
  }

  console.log("Department created successfully:", data);
  return data;
}

/**
 * Update an existing department
 */
export async function updateDepartment(id: string, updates: DepartmentUpdate): Promise<Department> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update department: ${error.message}`);
  }

  return data;
}

/**
 * Delete a department
 */
export async function deleteDepartment(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete department: ${error.message}`);
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
  const departments = await getDepartments(schoolId);
  
  return departments.map(dept => ({
    value: dept.id,
    label: dept.name,
  }));
}

/**
 * Bulk create departments from a list
 */
export async function bulkCreateDepartments(departments: Omit<DepartmentInsert, 'id' | 'created_at' | 'updated_at'>[]): Promise<Department[]> {
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