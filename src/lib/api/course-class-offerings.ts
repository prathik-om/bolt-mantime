import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

type Course = Database['public']['Tables']['courses']['Row'] & {
  departments: {
    id: string;
    name: string;
  } | null;
  class_offerings: Array<{
    id: string;
    class_id: string;
    periods_per_week: number;
    required_hours_per_term: number | null;
    term_id: string;
    classes: {
      id: string;
      name: string;
      grade_level: number;
      school_id: string;
    } | null;
  }>;
};

type SchedulingData = {
  class_offering_id: string;
  course_id: string;
  course_name: string;
  course_code: string | null;
  department_id: string;
  department_name: string;
  class_id: string;
  class_name: string;
  grade_level: number;
  periods_per_week: number;
  required_hours_per_term: number | null;
  total_hours_per_year: number | null;
  term_id: string;
  term_name: string;
  academic_year_id: string;
};

export async function getCoursesWithClassOfferings(
  schoolId: string,
  filters?: {
    termId?: string;
    departmentId?: string;
    gradeLevel?: number;
    classId?: string;
  }
): Promise<Course[]> {
  const supabase = createClient();
  let query = supabase
    .from('courses')
    .select(`
      *,
      departments (*),
      class_offerings (
        id,
        class_id,
        periods_per_week,
        required_hours_per_term,
        term_id,
        classes (
          id,
          name,
          grade_level,
          school_id
        )
      )
    `)
    .eq('school_id', schoolId)
    .order('name', { ascending: true });

  if (filters?.departmentId) {
    query = query.eq('department_id', filters.departmentId);
  }
  if (filters?.gradeLevel) {
    query = query.eq('grade_level', filters.gradeLevel);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching courses with class offerings:', error);
    throw new Error('Failed to fetch courses with class offerings');
  }

  // Optionally filter class_offerings by term or class
  if (filters?.termId || filters?.classId) {
    return (data || []).map(course => ({
      ...course,
      class_offerings: (course.class_offerings || []).filter(offering => {
        if (filters.termId && offering.term_id !== filters.termId) return false;
        if (filters.classId && offering.class_id !== filters.classId) return false;
        return true;
      })
    }));
  }

  return data || [];
}

export async function getSchedulingDataForAI(
  schoolId: string,
  filters?: {
    termId?: string;
    departmentId?: string;
    gradeLevel?: number;
    classId?: string;
  }
): Promise<SchedulingData[]> {
  const courses = await getCoursesWithClassOfferings(schoolId, filters);
  const result: SchedulingData[] = [];
  for (const course of courses) {
    for (const offering of course.class_offerings) {
      if (!offering.classes || !course.departments) continue;
      if (filters?.gradeLevel && offering.classes.grade_level !== filters.gradeLevel) continue;
      result.push({
        class_offering_id: offering.id,
        course_id: course.id,
        course_name: course.name,
        course_code: course.code || null,
        department_id: course.department_id,
        department_name: course.departments.name,
        class_id: offering.class_id,
        class_name: offering.classes.name,
        grade_level: offering.classes.grade_level,
        periods_per_week: offering.periods_per_week,
        required_hours_per_term: offering.required_hours_per_term,
        total_hours_per_year: course.total_hours_per_year,
        term_id: offering.term_id,
        term_name: "Default Term",
        academic_year_id: "default",
      });
    }
  }
  return result;
}

export async function assignCourseToClasses(
  courseId: string,
  classOfferings: Array<{
    class_id: string;
    periods_per_week: number;
    required_hours_per_term: number | null;
  }>
) {
  const supabase = createClient();
  // Get a valid term_id (use the first available term)
  const { data: terms, error: termsError } = await supabase
    .from('terms')
    .select('id')
    .limit(1);
  if (termsError) {
    console.error('Error fetching terms:', termsError);
    throw new Error('Failed to fetch terms');
  }
  if (!terms || terms.length === 0) {
    throw new Error('No terms available. Please create at least one term first.');
  }
  const termId = terms[0].id;
  // Delete existing class offerings for this course
  const { error: deleteError } = await supabase
    .from('class_offerings')
    .delete()
    .eq('course_id', courseId);
  if (deleteError) {
    console.error('Error deleting existing class offerings:', deleteError);
    throw new Error('Failed to delete existing class offerings');
  }
  // Insert new class offerings (atomic batch)
  if (classOfferings.length > 0) {
    const insertData = classOfferings.map(offering => ({
      course_id: courseId,
      class_id: offering.class_id,
      periods_per_week: offering.periods_per_week,
      required_hours_per_term: offering.required_hours_per_term,
      term_id: termId,
    }));
    const { error: insertError } = await supabase
      .from('class_offerings')
      .insert(insertData);
    if (insertError) {
      console.error('Error inserting class offerings:', insertError);
      throw new Error('Failed to insert class offerings');
    }
  }
}

export async function getCoursesForGrade(
  schoolId: string,
  gradeLevel: number,
  classId?: string
) {
  const supabase = createClient();
  let query = supabase
    .from('courses')
    .select(`
      *,
      departments (*)
    `)
    .eq('school_id', schoolId)
    .eq('grade_level', gradeLevel);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching courses for grade:', error);
    throw new Error('Failed to fetch courses for grade');
  }
  return data || [];
} 