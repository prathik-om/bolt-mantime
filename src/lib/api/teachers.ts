import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/lib/database.types'

type Teacher = Database['public']['Tables']['teachers']['Row']
type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
type TeacherUpdate = Database['public']['Tables']['teachers']['Update']

export async function getTeachers(schoolId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      *,
      teacher_qualifications (
        department_id,
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

export async function createTeacher(teacher: TeacherInsert) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teachers')
    .insert(teacher)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTeacher(id: string, updates: TeacherUpdate) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teachers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTeacher(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('teachers')
    .delete()
    .eq('id', id)

  if (error) throw error
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
      qualifications:teacher_qualifications(
        id,
        teacher_id,
        department_id,
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
  // This function would need to be updated based on your new schema
  // Since timetable_entries table doesn't exist in the new schema
  return [];
}

export async function addTeacherQualification(data: {
  teacherId: string;
  departmentId: string;
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('teacher_qualifications')
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
    .from('teacher_qualifications')
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
    .from('teacher_constraints')
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
    .from('teacher_constraints')
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
    .from('teacher_constraints')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to remove teacher constraint: ${error.message}`);
  }
} 