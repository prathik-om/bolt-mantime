import { createClient } from '@/utils/supabase/client';

export interface Department {
  id: string;
  name: string;
  code: string;
  school_id: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherDepartment {
  id: string;
  teacher_id: string;
  department_id: string;
  is_primary: boolean;
  created_at: string;
  teacher_name: string;
  department_name: string;
}

// Simple department CRUD operations
export async function getDepartments(schoolId: string): Promise<Department[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('school_id', schoolId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching departments:', error);
    throw new Error(`Failed to fetch departments: ${error.message}`);
  }

  return (data || []).map(dep => ({
    ...dep,
    code: dep.code ?? '',
    description: dep.description ?? undefined,
    created_at: dep.created_at ?? '',
    updated_at: dep.updated_at ?? ''
  }));
}

export async function getDepartmentById(departmentId: string): Promise<Department | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', departmentId)
    .single();

  if (error) {
    console.error('Error fetching department:', error);
    throw new Error(`Failed to fetch department: ${error.message}`);
  }

  if (!data) return null;

  return {
    ...data,
    code: data.code ?? '',
    description: data.description ?? undefined,
    created_at: data.created_at ?? '',
    updated_at: data.updated_at ?? ''
  };
}

export async function createDepartment(departmentData: {
  name: string;
  code: string;
  school_id: string;
  description?: string;
}): Promise<Department> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('departments')
    .insert(departmentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating department:', error);
    throw new Error(`Failed to create department: ${error.message}`);
  }

  return {
    ...data,
    code: data.code ?? '',
    description: data.description ?? undefined,
    created_at: data.created_at ?? '',
    updated_at: data.updated_at ?? ''
  };
}

export async function updateDepartment(
  departmentId: string,
  updates: Partial<{
    name: string;
    code: string;
    description: string;
  }>
): Promise<Department> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', departmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating department:', error);
    throw new Error(`Failed to update department: ${error.message}`);
  }

  return {
    ...data,
    code: data.code ?? '',
    description: data.description ?? undefined,
    created_at: data.created_at ?? '',
    updated_at: data.updated_at ?? ''
  };
}

export async function deleteDepartment(departmentId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', departmentId);

  if (error) {
    console.error('Error deleting department:', error);
    throw new Error(`Failed to delete department: ${error.message}`);
  }
}

// Teacher department assignments using the new database function
export async function getTeacherDepartmentSummary(teacherId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_teacher_department_summary', {
    p_teacher_id: teacherId
  });

  if (error) {
    console.error('Error fetching teacher department summary:', error);
    throw new Error(`Failed to fetch teacher department summary: ${error.message}`);
  }

  return data || [];
}

// Get teachers for a department
export async function getTeachersForDepartment(departmentId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('teacher_departments')
    .select(`
      id,
      teacher_id,
      department_id,
      is_primary,
      created_at,
      teachers!inner(
        first_name,
        last_name,
        email
      ),
      departments!inner(
        name,
        code
      )
    `)
    .eq('department_id', departmentId)
    .order('is_primary', { ascending: false })
    .order('teachers.first_name', { ascending: true });

  if (error) {
    console.error('Error fetching teachers for department:', error);
    throw new Error(`Failed to fetch teachers for department: ${error.message}`);
  }

  if (!data) return [];

  return data.map(td => ({
    id: td.id,
    teacher_id: td.teacher_id,
    department_id: td.department_id,
    is_primary: td.is_primary,
    created_at: td.created_at,
    teacher_name: `${td.teachers.first_name} ${td.teachers.last_name}`,
    department_name: td.departments.name
  }));
}

// Assign teacher to department
export async function assignTeacherToDepartment(
  teacherId: string,
  departmentId: string,
  isPrimary: boolean = false
) {
  const supabase = createClient();

  // If this is a primary assignment, remove primary flag from other departments for this teacher
  if (isPrimary) {
    await supabase
      .from('teacher_departments')
      .update({ is_primary: false })
      .eq('teacher_id', teacherId);
  }

  const { data, error } = await supabase
    .from('teacher_departments')
    .upsert({
      teacher_id: teacherId,
      department_id: departmentId,
      is_primary: isPrimary
    })
    .select()
    .single();

  if (error) {
    console.error('Error assigning teacher to department:', error);
    throw new Error(`Failed to assign teacher to department: ${error.message}`);
  }

  return data;
}

// Remove teacher from department
export async function removeTeacherFromDepartment(
  teacherId: string,
  departmentId: string
) {
  const supabase = createClient();

  const { error } = await supabase
    .from('teacher_departments')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('department_id', departmentId);

  if (error) {
    console.error('Error removing teacher from department:', error);
    throw new Error(`Failed to remove teacher from department: ${error.message}`);
  }
}

// Get all teacher department assignments for a school
export async function getTeacherDepartments(schoolId: string): Promise<TeacherDepartment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('teacher_departments')
    .select(`
      id,
      teacher_id,
      department_id,
      is_primary,
      created_at,
      teachers!inner(
        first_name,
        last_name,
        school_id
      ),
      departments!inner(
        name,
        school_id
      )
    `)
    .eq('teachers.school_id', schoolId)
    .eq('departments.school_id', schoolId)
    .order('teachers.first_name', { ascending: true });

  if (error) {
    console.error('Error fetching teacher departments:', error);
    throw new Error(`Failed to fetch teacher departments: ${error.message}`);
  }

  if (!data) return [];

  return data.map(td => ({
    id: td.id,
    teacher_id: td.teacher_id,
    department_id: td.department_id,
    is_primary: td.is_primary ?? false,
    created_at: td.created_at ?? '',
    teacher_name: `${td.teachers.first_name} ${td.teachers.last_name}`,
    department_name: td.departments.name
  }));
}

// Get courses for a department
export async function getCoursesForDepartment(departmentId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      code,
      description,
      grade_level,
      created_at
    `)
    .eq('department_id', departmentId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching courses for department:', error);
    throw new Error(`Failed to fetch courses for department: ${error.message}`);
  }

  return data || [];
}

// Get department statistics
export async function getDepartmentStats(schoolId: string) {
  const supabase = createClient();

  // Get departments with teacher and course counts
  const { data, error } = await supabase
    .from('departments')
    .select(`
      id,
      name,
      code,
      teacher_departments(count),
      courses(count)
    `)
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching department stats:', error);
    throw new Error(`Failed to fetch department stats: ${error.message}`);
  }

  return data?.map(dept => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    teacher_count: dept.teacher_departments?.[0]?.count || 0,
    course_count: dept.courses?.[0]?.count || 0
  })) || [];
} 