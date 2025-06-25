import { createClient } from '@/utils/supabase/client'
import { Database } from '@/lib/database.types'
import { getTeachersForCourse } from './teacher-departments'

type ClassOffering = Database['public']['Tables']['class_offerings']['Row']
type ClassOfferingInsert = Database['public']['Tables']['class_offerings']['Insert']
type ClassOfferingUpdate = Database['public']['Tables']['class_offerings']['Update']
type TeacherWorkload = Database['public']['Tables']['teacher_workload']['Row']
type AITeacherAssignment = Database['public']['Tables']['ai_teacher_assignments']['Row']

export interface TeacherAssignment {
  id: string
  teacher_id: string
  teacher_name: string
  course_id: string
  course_name: string
  class_offering_id: string
  class_offering_name: string
  department_name: string
  academic_year: string
  term: string
  assignment_type: 'ai' | 'manual' | 'ai_suggested'
  hours_per_week: number
  max_hours_per_week: number
  max_courses_count: number
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded'
  utilization_percentage: number
}

export interface TeacherSuggestion {
  teacher_id: string
  teacher_name: string
  department_name: string
  current_hours_per_week: number
  max_hours_per_week: number
  current_courses_count: number
  max_courses_count: number
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded'
  match_score: number
  reasoning: string
  recommended: boolean
}

export interface AssignmentStats {
  assignmentTypes: Record<string, number>
  workloadDistribution: Record<string, number>
  totalAssignments: number
  totalTeachers: number
}

export interface WorkloadInsight {
  teacher_id: string
  teacher_name: string
  department_name: string
  current_hours_per_week: number
  max_hours_per_week: number
  current_courses_count: number
  max_courses_count: number
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded'
  available_hours: number
  utilization_percentage: number
  recommended_for_new_assignments: boolean
}

export interface TeacherWorkload {
  teacher_id: string
  teacher_name: string
  department_name: string
  current_hours_per_week: number
  max_hours_per_week: number
  current_courses_count: number
  max_courses_count: number
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded'
  utilization_percentage: number
  available_hours: number
  recommended_for_new_assignments: boolean
}

export async function getTeacherWorkloadInsights(
  schoolId: string,
  academicYearId: string,
  termId: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .rpc('get_teacher_workload_insights', {
      school_id: schoolId,
      academic_year_id: academicYearId,
      term_id: termId
    })

  if (error) {
    console.error('Error fetching teacher workload insights:', error)
    throw new Error('Failed to fetch teacher workload insights')
  }

  return data
}

export async function suggestTeachersForCourse(
  courseId: string,
  classId: string,
  academicYearId: string,
  termId: string
) {
  const supabase = createClient()
  
  // Get qualified teachers for this course using the new department-based system
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

export async function createAITeacherAssignment(
  classOfferingId: string,
  suggestedTeacherId: string,
  confidenceScore: number,
  reasoning: string,
  alternativeTeachers?: string[],
  conflictsDetected?: string[]
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('ai_teacher_assignments')
    .insert({
      class_offering_id: classOfferingId,
      suggested_teacher_id: suggestedTeacherId,
      confidence_score: confidenceScore,
      reasoning,
      alternative_teachers: alternativeTeachers || [],
      conflicts_detected: conflictsDetected || []
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating AI teacher assignment:', error)
    throw new Error('Failed to create AI teacher assignment')
  }

  return data
}

export async function applyAITeacherAssignment(
  classOfferingId: string,
  teacherId: string,
  assignmentType: 'ai' | 'manual' | 'ai_suggested' = 'ai'
) {
  const supabase = createClient()
  
  const updateData: ClassOfferingUpdate = {
    assignment_type: assignmentType,
    assignment_date: new Date().toISOString()
  }

  if (assignmentType === 'ai') {
    updateData.ai_assigned_teacher_id = teacherId
    updateData.manual_assigned_teacher_id = null
  } else if (assignmentType === 'manual') {
    updateData.manual_assigned_teacher_id = teacherId
    updateData.ai_assigned_teacher_id = null
  } else {
    updateData.ai_assigned_teacher_id = teacherId
  }

  const { data, error } = await supabase
    .from('class_offerings')
    .update(updateData)
    .eq('id', classOfferingId)
    .select()
    .single()

  if (error) {
    console.error('Error applying teacher assignment:', error)
    throw new Error('Failed to apply teacher assignment')
  }

  // Mark AI assignment as applied
  if (assignmentType === 'ai' || assignmentType === 'ai_suggested') {
    await supabase
      .from('ai_teacher_assignments')
      .update({ is_applied: true })
      .eq('class_offering_id', classOfferingId)
      .eq('suggested_teacher_id', teacherId)
  }

  return data
}

export async function getTeacherAssignmentsByType(
  schoolId: string,
  assignmentType?: 'ai' | 'manual' | 'ai_suggested'
) {
  const supabase = createClient()
  
  let query = supabase
    .from('class_offerings')
    .select(`
      *,
      courses!inner(school_id, name, department_id),
      teachers(first_name, last_name, email),
      classes(name, grade_level),
      ai_teacher_assignments(*)
    `)
    .eq('courses.school_id', schoolId)

  if (assignmentType) {
    query = query.eq('assignment_type', assignmentType)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching teacher assignments:', error)
    throw new Error('Failed to fetch teacher assignments')
  }

  return data
}

export async function getTeacherWorkloadByTeacher(
  teacherId: string,
  academicYearId: string,
  termId: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('teacher_workload')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('academic_year_id', academicYearId)
    .eq('term_id', termId)
    .single()

  if (error) {
    console.error('Error fetching teacher workload:', error)
    throw new Error('Failed to fetch teacher workload')
  }

  return data
}

export async function updateTeacherWorkload(
  teacherId: string,
  academicYearId: string,
  termId: string,
  updates: Partial<TeacherWorkload>
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('teacher_workload')
    .update(updates)
    .eq('teacher_id', teacherId)
    .eq('academic_year_id', academicYearId)
    .eq('term_id', termId)
    .select()
    .single()

  if (error) {
    console.error('Error updating teacher workload:', error)
    throw new Error('Failed to update teacher workload')
  }

  return data
}

export async function getAITeacherAssignments(
  classOfferingId?: string
) {
  const supabase = createClient()
  
  let query = supabase
    .from('ai_teacher_assignments')
    .select(`
      *,
      class_offerings!inner(
        *,
        courses(name, department_id),
        classes(name, grade_level)
      ),
      teachers(first_name, last_name, email)
    `)

  if (classOfferingId) {
    query = query.eq('class_offering_id', classOfferingId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching AI teacher assignments:', error)
    throw new Error('Failed to fetch AI teacher assignments')
  }

  return data
}

export async function validateTeacherAssignment(
  teacherId: string,
  courseId: string,
  classId: string,
  academicYearId: string,
  termId: string
) {
  const supabase = createClient()
  
  // Check teacher workload
  const workload = await getTeacherWorkloadByTeacher(teacherId, academicYearId, termId)
  
  // Check for conflicts (same teacher, same time slot)
  const { data: conflicts, error: conflictsError } = await supabase
    .from('class_offerings')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('academic_year_id', academicYearId)
    .eq('term_id', termId)
    .neq('class_section_id', classId)

  if (conflictsError) {
    console.error('Error checking conflicts:', conflictsError)
    throw new Error('Failed to validate teacher assignment')
  }

  // Check teacher qualification using the new department-based system
  const { data: qualifiedTeachers, error: qualificationError } = await supabase
    .rpc('get_teachers_for_course', { p_course_id: courseId })

  if (qualificationError) {
    console.error('Error checking teacher qualification:', qualificationError)
    throw new Error('Failed to validate teacher assignment')
  }

  const isQualified = qualifiedTeachers?.some(t => t.teacher_id === teacherId) || false
  const teacherQualification = qualifiedTeachers?.find(t => t.teacher_id === teacherId)
  const isPrimaryDepartment = teacherQualification?.is_primary_department || false

  return {
    isValid: workload.workload_status !== 'overloaded' && conflicts.length === 0 && isQualified,
    workload: workload,
    conflicts: conflicts,
    isQualified,
    isPrimaryDepartment,
    departmentMatch: isQualified,
    warnings: [
      workload.workload_status === 'high' ? 'Teacher has high workload' : null,
      !isQualified ? 'Teacher is not qualified for this course' : null,
      !isPrimaryDepartment ? 'Teacher is not in the primary department for this course' : null,
      conflicts.length > 0 ? `${conflicts.length} potential conflicts detected` : null
    ].filter(Boolean)
  }
}

export async function getTeacherAssignmentStats(
  schoolId: string,
  academicYearId: string,
  termId: string
) {
  const supabase = createClient()
  
  // Get assignment type distribution
  const { data: assignmentTypes, error: typeError } = await supabase
    .from('class_offerings')
    .select('assignment_type')
    .eq('courses.school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .eq('term_id', termId)

  // Get workload distribution
  const { data: workload, error: workloadError } = await supabase
    .from('teacher_workload')
    .select('workload_status')
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .eq('term_id', termId)

  if (typeError || workloadError) {
    console.error('Error fetching assignment stats:', typeError || workloadError)
    throw new Error('Failed to fetch assignment statistics')
  }

  // Calculate statistics
  const assignmentStats = assignmentTypes?.reduce((acc, item) => {
    acc[item.assignment_type] = (acc[item.assignment_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const workloadStats = workload?.reduce((acc, item) => {
    acc[item.workload_status] = (acc[item.workload_status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return {
    assignmentTypes: assignmentStats,
    workloadDistribution: workloadStats,
    totalAssignments: assignmentTypes?.length || 0,
    totalTeachers: workload?.length || 0
  }
}

export async function bulkAssignTeachers(
  assignments: Array<{
    classOfferingId: string
    teacherId: string
    assignmentType: 'ai' | 'manual' | 'ai_suggested'
    notes?: string
  }>
) {
  const supabase = createClient()
  
  const results = []
  
  for (const assignment of assignments) {
    try {
      const result = await applyAITeacherAssignment(
        assignment.classOfferingId,
        assignment.teacherId,
        assignment.assignmentType
      )
      
      if (assignment.notes) {
        await supabase
          .from('class_offerings')
          .update({ assignment_notes: assignment.notes })
          .eq('id', assignment.classOfferingId)
      }
      
      results.push({ success: true, data: result })
    } catch (error) {
      results.push({ success: false, error: error.message })
    }
  }
  
  return results
}

// Get all teacher assignments for a school, academic year, and term
export async function getTeacherAssignments(
  schoolId: string,
  academicYear: string,
  term: string
): Promise<TeacherAssignment[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('teacher_assignments')
    .select(`
      id,
      teacher_id,
      teacher:teachers!teacher_assignments_teacher_id_fkey(
        first_name,
        last_name
      ),
      course_id,
      course:subjects!teacher_assignments_course_id_fkey(
        name,
        code
      ),
      class_offering_id,
      class_offering:class_offerings!teacher_assignments_class_offering_id_fkey(
        name
      ),
      department:departments!teacher_assignments_department_id_fkey(
        name
      ),
      academic_year,
      term,
      assignment_type,
      hours_per_week,
      max_hours_per_week,
      max_courses_count,
      notes,
      is_active,
      created_at,
      updated_at
    `)
    .eq('school_id', schoolId)
    .eq('academic_year', academicYear)
    .eq('term', term)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching teacher assignments:', error)
    throw error
  }

  // Transform the data to match the interface
  return (data || []).map((assignment: any) => ({
    id: assignment.id,
    teacher_id: assignment.teacher_id,
    teacher_name: `${assignment.teacher?.first_name || ''} ${assignment.teacher?.last_name || ''}`.trim(),
    course_id: assignment.course_id,
    course_name: assignment.course?.name || '',
    class_offering_id: assignment.class_offering_id,
    class_offering_name: assignment.class_offering?.name || '',
    department_name: assignment.department?.name || '',
    academic_year: assignment.academic_year,
    term: assignment.term,
    assignment_type: assignment.assignment_type,
    hours_per_week: assignment.hours_per_week,
    max_hours_per_week: assignment.max_hours_per_week,
    max_courses_count: assignment.max_courses_count,
    notes: assignment.notes,
    is_active: assignment.is_active,
    created_at: assignment.created_at,
    updated_at: assignment.updated_at,
    workload_status: calculateWorkloadStatus(assignment),
    utilization_percentage: calculateUtilization(assignment)
  }))
}

// Get a single teacher assignment by ID
export async function getTeacherAssignmentById(assignmentId: string): Promise<any> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('teacher_assignments')
    .select(`
      *,
      teacher:teachers!teacher_assignments_teacher_id_fkey(
        first_name,
        last_name,
        email
      ),
      course:subjects!teacher_assignments_course_id_fkey(
        name,
        code
      ),
      class_offering:class_offerings!teacher_assignments_class_offering_id_fkey(
        name
      ),
      department:departments!teacher_assignments_department_id_fkey(
        name
      )
    `)
    .eq('id', assignmentId)
    .single()

  if (error) {
    console.error('Error fetching teacher assignment:', error)
    throw error
  }

  return data
}

// Create a new teacher assignment
export async function createTeacherAssignment(assignmentData: any): Promise<any> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('teacher_assignments')
    .insert([assignmentData])
    .select()
    .single()

  if (error) {
    console.error('Error creating teacher assignment:', error)
    throw error
  }

  return data
}

// Update an existing teacher assignment
export async function updateTeacherAssignment(assignmentId: string, assignmentData: any): Promise<any> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('teacher_assignments')
    .update(assignmentData)
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating teacher assignment:', error)
    throw error
  }

  return data
}

// Delete a teacher assignment
export async function deleteTeacherAssignment(assignmentId: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('teacher_assignments')
    .delete()
    .eq('id', assignmentId)

  if (error) {
    console.error('Error deleting teacher assignment:', error)
    throw error
  }
}

// Get AI teacher suggestions for a course
export async function getAITeacherSuggestions(
  schoolId: string,
  courseId: string,
  academicYear: string,
  term: string
): Promise<TeacherSuggestion[]> {
  const supabase = createClient()
  
  // Get all teachers in the school
  const { data: teachers, error: teachersError } = await supabase
    .from('teachers')
    .select(`
      id,
      first_name,
      last_name,
      department:departments!teachers_department_id_fkey(
        name
      ),
      teacher_departments!teacher_departments_teacher_id_fkey(
        department:departments!teacher_departments_department_id_fkey(
          name
        )
      )
    `)
    .eq('school_id', schoolId)

  if (teachersError) {
    console.error('Error fetching teachers:', teachersError)
    throw teachersError
  }

  // Get course department
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('department_id')
    .eq('id', courseId)
    .single()

  if (courseError) {
    console.error('Error fetching course:', courseError)
    throw courseError
  }

  // Get current workload for each teacher
  const suggestions: TeacherSuggestion[] = []
  
  for (const teacher of teachers || []) {
    const workload = await getTeacherWorkload(schoolId, teacher.id, academicYear, term)
    
    // Calculate match score based on department alignment and workload
    const departmentMatch = teacher.teacher_departments?.some((td: any) => 
      td.department?.name === course.department_id
    ) ? 1 : 0.5
    
    const workloadScore = Math.max(0, 1 - (workload.utilization_percentage / 100))
    const matchScore = (departmentMatch * 0.6 + workloadScore * 0.4) * 100
    
    const reasoning = generateAISuggestionReasoning(teacher, workload, departmentMatch)
    const recommended = matchScore > 70 && workload.workload_status !== 'overloaded'
    
    suggestions.push({
      teacher_id: teacher.id,
      teacher_name: `${teacher.first_name} ${teacher.last_name}`,
      department_name: teacher.department?.name || 'No Department',
      current_hours_per_week: workload.current_hours_per_week,
      max_hours_per_week: workload.max_hours_per_week,
      current_courses_count: workload.current_courses_count,
      max_courses_count: workload.max_courses_count,
      workload_status: workload.workload_status,
      match_score: matchScore,
      reasoning,
      recommended
    })
  }

  // Sort by match score descending
  return suggestions.sort((a, b) => b.match_score - a.match_score)
}

// Get teacher workload information
export async function getTeacherWorkload(
  schoolId: string,
  teacherId: string,
  academicYear: string,
  term: string
): Promise<TeacherWorkload> {
  const supabase = createClient()
  
  // Get teacher's current assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from('teacher_assignments')
    .select('hours_per_week, max_hours_per_week, max_courses_count')
    .eq('teacher_id', teacherId)
    .eq('academic_year', academicYear)
    .eq('term', term)
    .eq('is_active', true)

  if (assignmentsError) {
    console.error('Error fetching teacher assignments:', assignmentsError)
    throw assignmentsError
  }

  // Get teacher's max limits
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select(`
      max_hours_per_week,
      max_courses_count,
      department:departments!teachers_department_id_fkey(
        name
      )
    `)
    .eq('id', teacherId)
    .single()

  if (teacherError) {
    console.error('Error fetching teacher:', teacherError)
    throw teacherError
  }

  const currentHours = (assignments || []).reduce((sum, a) => sum + (a.hours_per_week || 0), 0)
  const currentCourses = assignments?.length || 0
  const maxHours = teacher.max_hours_per_week || 20
  const maxCourses = teacher.max_courses_count || 5
  const utilization = maxHours > 0 ? (currentHours / maxHours) * 100 : 0
  const availableHours = Math.max(0, maxHours - currentHours)

  return {
    teacher_id: teacherId,
    teacher_name: '', // Will be filled by caller if needed
    department_name: teacher.department?.name || 'No Department',
    current_hours_per_week: currentHours,
    max_hours_per_week: maxHours,
    current_courses_count: currentCourses,
    max_courses_count: maxCourses,
    workload_status: calculateWorkloadStatusFromUtilization(utilization),
    utilization_percentage: utilization,
    available_hours: availableHours,
    recommended_for_new_assignments: utilization < 80 && currentCourses < maxCourses
  }
}

// Helper functions
function calculateWorkloadStatus(assignment: any): 'available' | 'moderate' | 'high' | 'overloaded' {
  const utilization = assignment.max_hours_per_week > 0 
    ? (assignment.hours_per_week / assignment.max_hours_per_week) * 100 
    : 0
  
  return calculateWorkloadStatusFromUtilization(utilization)
}

function calculateWorkloadStatusFromUtilization(utilization: number): 'available' | 'moderate' | 'high' | 'overloaded' {
  if (utilization < 60) return 'available'
  if (utilization < 80) return 'moderate'
  if (utilization < 100) return 'high'
  return 'overloaded'
}

function calculateUtilization(assignment: any): number {
  return assignment.max_hours_per_week > 0 
    ? (assignment.hours_per_week / assignment.max_hours_per_week) * 100 
    : 0
}

function generateAISuggestionReasoning(teacher: any, workload: TeacherWorkload, departmentMatch: number): string {
  const reasons = []
  
  if (departmentMatch === 1) {
    reasons.push('Perfect department alignment')
  } else {
    reasons.push('Partial department alignment')
  }
  
  if (workload.utilization_percentage < 60) {
    reasons.push('Low workload - highly available')
  } else if (workload.utilization_percentage < 80) {
    reasons.push('Moderate workload - good availability')
  } else {
    reasons.push('High workload - limited availability')
  }
  
  if (workload.current_courses_count < workload.max_courses_count) {
    reasons.push('Has capacity for additional courses')
  }
  
  return reasons.join('. ')
} 