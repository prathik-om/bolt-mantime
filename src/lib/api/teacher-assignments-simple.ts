import { createClient } from '@/utils/supabase/client';
import { getTeachersForCourse, getTeacherQualifications } from './timetables-simple';

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  course_id: string;
  course_name: string;
  class_offering_id: string;
  class_offering_name: string;
  department_name: string;
  academic_year: string;
  term: string;
  assignment_type: 'ai' | 'manual' | 'ai_suggested';
  hours_per_week: number;
  max_hours_per_week: number;
  max_courses_count: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded';
  utilization_percentage: number;
}

export interface TeacherSuggestion {
  teacher_id: string;
  teacher_name: string;
  department_name: string;
  current_hours_per_week: number;
  max_hours_per_week: number;
  current_courses_count: number;
  max_courses_count: number;
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded';
  match_score: number;
  reasoning: string;
  recommended: boolean;
}

export interface TeacherWorkload {
  teacher_id: string;
  teacher_name: string;
  department_name: string;
  current_hours_per_week: number;
  max_hours_per_week: number;
  current_courses_count: number;
  max_courses_count: number;
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded';
  utilization_percentage: number;
  available_hours: number;
  recommended_for_new_assignments: boolean;
}

// Use the new database function for teacher qualifications
export async function suggestTeachersForCourse(
  courseId: string,
  classId: string,
  academicYearId: string,
  termId: string
): Promise<TeacherSuggestion[]> {
  const supabase = createClient();
  
  // Get qualified teachers for this course using the new database function
  const qualifiedTeachers = await getTeachersForCourse(courseId);
  
  if (qualifiedTeachers.length === 0) {
    return [];
  }

  // Get current workload for qualified teachers
  const teacherIds = qualifiedTeachers.map(t => t.teacher_id);
  
  const { data: currentAssignments, error: assignmentsError } = await supabase
    .from('teaching_assignments')
    .select(`
      teacher_id,
      class_offering:class_offerings!inner(
        periods_per_week,
        term_id
      )
    `)
    .in('teacher_id', teacherIds)
    .eq('class_offering.term_id', termId);

  if (assignmentsError) {
    console.error('Error fetching current assignments:', assignmentsError);
    throw new Error('Failed to fetch current assignments');
  }

  // Calculate workload for each qualified teacher
  const teacherWorkloads = qualifiedTeachers.map(teacher => {
    const currentHours = currentAssignments
      ?.filter(assignment => assignment.teacher_id === teacher.teacher_id)
      ?.reduce((total, assignment) => total + (assignment.class_offering.periods_per_week || 0), 0) || 0;

    const maxHours = 20; // Default max hours per week
    const utilization = maxHours > 0 ? (currentHours / maxHours) * 100 : 0;
    const workloadStatus = calculateWorkloadStatusFromUtilization(utilization);

    return {
      teacher_id: teacher.teacher_id,
      teacher_name: teacher.teacher_name,
      department_name: teacher.department_name,
      current_hours_per_week: currentHours,
      max_hours_per_week: maxHours,
      current_courses_count: currentAssignments?.filter(a => a.teacher_id === teacher.teacher_id).length || 0,
      max_courses_count: 5, // Default max courses
      workload_status: workloadStatus,
      utilization_percentage: utilization,
      match_score: teacher.is_primary_department ? 100 : 80, // Primary department teachers get higher score
      reasoning: generateAISuggestionReasoning(teacher, { 
        teacher_id: teacher.teacher_id,
        teacher_name: teacher.teacher_name,
        department_name: teacher.department_name,
        current_hours_per_week: currentHours,
        max_hours_per_week: maxHours,
        current_courses_count: currentAssignments?.filter(a => a.teacher_id === teacher.teacher_id).length || 0,
        max_courses_count: 5,
        workload_status: workloadStatus,
        utilization_percentage: utilization,
        available_hours: maxHours - currentHours,
        recommended_for_new_assignments: utilization < 80
      }, teacher.is_primary_department ? 1.0 : 0.8),
      recommended: utilization < 80
    };
  });

  // Sort by match score and workload
  return teacherWorkloads.sort((a, b) => {
    if (a.recommended !== b.recommended) return b.recommended ? 1 : -1;
    return b.match_score - a.match_score;
  });
}

// Simplified teacher assignment creation
export async function createTeacherAssignment(assignmentData: {
  teacher_id: string;
  class_offering_id: string;
  assignment_type?: 'ai' | 'manual' | 'ai_suggested';
  notes?: string;
}) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('teaching_assignments')
    .insert({
      teacher_id: assignmentData.teacher_id,
      class_offering_id: assignmentData.class_offering_id,
      assignment_type: assignmentData.assignment_type || 'manual',
      notes: assignmentData.notes
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating teacher assignment:', error);
    throw new Error(`Failed to create teacher assignment: ${error.message}`);
  }

  return data;
}

// Simplified teacher assignment update
export async function updateTeacherAssignment(
  assignmentId: string, 
  updates: Partial<{
    teacher_id: string;
    assignment_type: 'ai' | 'manual' | 'ai_suggested';
    notes: string;
  }>
) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('teaching_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating teacher assignment:', error);
    throw new Error(`Failed to update teacher assignment: ${error.message}`);
  }

  return data;
}

// Simplified teacher assignment deletion
export async function deleteTeacherAssignment(assignmentId: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('teaching_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error deleting teacher assignment:', error);
    throw new Error(`Failed to delete teacher assignment: ${error.message}`);
  }
}

// Get teacher assignments with simplified query
export async function getTeacherAssignments(
  schoolId: string,
  academicYearId: string,
  termId: string
): Promise<TeacherAssignment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('teaching_assignments')
    .select(`
      id,
      teacher_id,
      assignment_type,
      notes,
      created_at,
      updated_at,
      teachers!inner(
        first_name,
        last_name,
        email
      ),
      class_offerings!inner(
        periods_per_week,
        courses!inner(
          name,
          code,
          departments!inner(name)
        ),
        classes!inner(
          name,
          grade_level
        ),
        terms!inner(
          name,
          academic_years!inner(name)
        )
      )
    `)
    .eq('class_offerings.terms.academic_years.school_id', schoolId)
    .eq('class_offerings.term_id', termId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching teacher assignments:', error);
    throw new Error(`Failed to fetch teacher assignments: ${error.message}`);
  }

  if (!data) return [];

  return data.map(assignment => ({
    id: assignment.id,
    teacher_id: assignment.teacher_id,
    teacher_name: `${assignment.teachers.first_name} ${assignment.teachers.last_name}`,
    course_id: assignment.class_offerings.courses.id,
    course_name: assignment.class_offerings.courses.name,
    class_offering_id: assignment.class_offerings.id,
    class_offering_name: `${assignment.class_offerings.classes.name} - ${assignment.class_offerings.courses.name}`,
    department_name: assignment.class_offerings.courses.departments.name,
    academic_year: assignment.class_offerings.terms.academic_years.name,
    term: assignment.class_offerings.terms.name,
    assignment_type: assignment.assignment_type as 'ai' | 'manual' | 'ai_suggested',
    hours_per_week: assignment.class_offerings.periods_per_week || 0,
    max_hours_per_week: 20, // Default
    max_courses_count: 5, // Default
    notes: assignment.notes,
    is_active: true,
    created_at: assignment.created_at,
    updated_at: assignment.updated_at,
    workload_status: calculateWorkloadStatusFromUtilization(0), // Calculate based on actual workload
    utilization_percentage: 0 // Calculate based on actual workload
  }));
}

// Get teacher workload using the new database function
export async function getTeacherWorkload(
  teacherId: string,
  academicYearId: string,
  termId: string
): Promise<TeacherWorkload> {
  const supabase = createClient();

  // Get teacher qualifications using the new function
  const qualifications = await getTeacherQualifications(teacherId);
  
  // Get current assignments
  const { data: assignments, error } = await supabase
    .from('teaching_assignments')
    .select(`
      class_offerings!inner(
        periods_per_week,
        term_id,
        courses!inner(
          name,
          departments!inner(name)
        )
      )
    `)
    .eq('teacher_id', teacherId)
    .eq('class_offerings.term_id', termId);

  if (error) {
    console.error('Error fetching teacher workload:', error);
    throw new Error(`Failed to fetch teacher workload: ${error.message}`);
  }

  const currentHours = assignments?.reduce((total, assignment) => 
    total + (assignment.class_offerings.periods_per_week || 0), 0) || 0;
  
  const maxHours = 20; // Default max hours per week
  const utilization = maxHours > 0 ? (currentHours / maxHours) * 100 : 0;
  const workloadStatus = calculateWorkloadStatusFromUtilization(utilization);

  return {
    teacher_id: teacherId,
    teacher_name: '', // Would need to fetch separately
    department_name: qualifications[0]?.department_name || 'Unknown',
    current_hours_per_week: currentHours,
    max_hours_per_week: maxHours,
    current_courses_count: assignments?.length || 0,
    max_courses_count: 5,
    workload_status,
    utilization_percentage: utilization,
    available_hours: maxHours - currentHours,
    recommended_for_new_assignments: utilization < 80
  };
}

// Validate teacher assignment using the new database function
export async function validateTeacherAssignment(
  teacherId: string,
  courseId: string,
  classId: string,
  academicYearId: string,
  termId: string
) {
  const supabase = createClient();
  
  // Check if teacher is qualified for this course
  const qualifications = await getTeacherQualifications(teacherId);
  const isQualified = qualifications.some(q => q.course_id === courseId);
  
  if (!isQualified) {
    return {
      isValid: false,
      errors: ['Teacher is not qualified for this course'],
      warnings: []
    };
  }

  // Check for conflicts
  const { data: conflicts, error } = await supabase
    .from('teaching_assignments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('class_offerings.class_section_id', classId)
    .eq('class_offerings.term_id', termId);

  if (error) {
    console.error('Error checking for conflicts:', error);
    throw new Error(`Failed to check for conflicts: ${error.message}`);
  }

  if (conflicts && conflicts.length > 0) {
    return {
      isValid: false,
      errors: ['Teacher already has an assignment for this class in this term'],
      warnings: []
    };
  }

  return {
    isValid: true,
    errors: [],
    warnings: []
  };
}

// Utility functions
function calculateWorkloadStatusFromUtilization(utilization: number): 'available' | 'moderate' | 'high' | 'overloaded' {
  if (utilization < 60) return 'available';
  if (utilization < 80) return 'moderate';
  if (utilization < 100) return 'high';
  return 'overloaded';
}

function generateAISuggestionReasoning(teacher: any, workload: TeacherWorkload, departmentMatch: number): string {
  const reasons = [];
  
  if (departmentMatch === 1.0) {
    reasons.push('Primary department teacher');
  } else {
    reasons.push('Secondary department teacher');
  }
  
  if (workload.utilization_percentage < 60) {
    reasons.push('Low workload - highly available');
  } else if (workload.utilization_percentage < 80) {
    reasons.push('Moderate workload - good availability');
  } else {
    reasons.push('High workload - limited availability');
  }
  
  if (workload.current_courses_count < 3) {
    reasons.push('Few current assignments');
  }
  
  return reasons.join('. ');
} 