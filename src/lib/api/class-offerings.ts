import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';
import { ClassOffering, Course, Class, Term, TeachingAssignment, Teacher } from '../types/database-helpers';
import { handleError } from '../utils/error-handling';

type ClassOfferingInsert = Database['public']['Tables']['class_offerings']['Insert'];
type ClassOfferingUpdate = Database['public']['Tables']['class_offerings']['Update'];

export interface ClassOfferingWithDetails extends ClassOffering {
  courses: (Course & {
    departments: {
      id: string;
      name: string;
      code: string;
    };
  }) | null;
  classes: Class | null;
  terms: (Term & {
    academic_years: {
      id: string;
      name: string;
      school_id: string;
    };
  }) | null;
  teaching_assignments: (TeachingAssignment & {
    teachers: Teacher;
  })[] | null;
}

export interface ClassOfferingValidation {
  isValid: boolean;
  message: string;
  details?: {
    periods_per_week?: number;
    required_hours_per_term?: number;
    expected_hours?: number;
    variance?: number;
    course_total_hours?: number;
    term_duration_weeks?: number;
  };
}

export interface CourseRequirementsSummary {
  course_id: string;
  course_name: string;
  course_code: string;
  total_hours_per_year: number | null;
  hours_distribution_type: string | null;
  term_hours: any;
  class_offerings: Array<{
    id: string;
    class_name: string;
    term_name: string;
    periods_per_week: number;
    required_hours_per_term: number | null;
    is_assigned: boolean;
  }>;
  total_periods_across_offerings: number;
  total_hours_across_offerings: number;
  consistency_score: number; // 0-100, higher is better
}

/**
 * Get all class offerings for a school with full details
 */
export async function getClassOfferings(schoolId: string): Promise<ClassOfferingWithDetails[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('class_offerings')
    .select(`
      *,
      courses!inner (
        *,
        departments (
          id,
          name,
          code
        )
      ),
      classes (
        id,
        name,
        grade_level,
        school_id
      ),
      terms (
        id,
        name,
        start_date,
        end_date,
        period_duration_minutes,
        academic_years (
          id,
          name,
          school_id
        )
      ),
      teaching_assignments (
        id,
        teachers (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('courses.school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch class offerings: ${error.message}`);
  }

  return data || [];
}

/**
 * Get class offerings for a specific term
 */
export async function getClassOfferingsByTerm(termId: string): Promise<ClassOfferingWithDetails[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('class_offerings')
    .select(`
      *,
      courses (
        *,
        departments (
          id,
          name,
          code
        )
      ),
      classes (
        id,
        name,
        grade_level,
        school_id
      ),
      terms!inner (
        id,
        name,
        start_date,
        end_date,
        period_duration_minutes,
        academic_years (
          id,
          name,
          school_id
        )
      ),
      teaching_assignments (
        id,
        teachers (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('term_id', termId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch class offerings: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single class offering with details
 */
export async function getClassOffering(offeringId: string): Promise<ClassOfferingWithDetails | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('class_offerings')
    .select(`
      *,
      courses (
        *,
        departments (
          id,
          name,
          code
        )
      ),
      classes (
        id,
        name,
        grade_level,
        school_id
      ),
      terms (
        id,
        name,
        start_date,
        end_date,
        period_duration_minutes,
        academic_years (
          id,
          name,
          school_id
        )
      ),
      teaching_assignments (
        id,
        teachers (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('id', offeringId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch class offering: ${error.message}`);
  }

  return data;
}

/**
 * Validate class offering data
 */
async function validateClassOffering(
  offering: Partial<ClassOffering>,
  schoolId: string
): Promise<ClassOfferingValidation> {
  try {
    const supabase = createClient();
    const errors: string[] = [];

    if (!offering.course_id) {
      errors.push('Course ID is required');
    }

    if (!offering.class_id) {
      errors.push('Class ID is required');
    }

    if (!offering.term_id) {
      errors.push('Term ID is required');
    }

    if (offering.periods_per_week === undefined || offering.periods_per_week === null) {
      errors.push('Periods per week is required');
    } else if (offering.periods_per_week < 1) {
      errors.push('Periods per week must be at least 1');
    }

    // Get course details
    const { data: course } = await supabase
      .from('courses')
      .select(`
        *,
        departments (
          id,
          name
        )
      `)
      .eq('id', offering.course_id)
      .single();

    if (!course) {
      errors.push('Course not found');
    } else {
      // Get term details
      const { data: term } = await supabase
        .from('terms')
        .select(`
          *,
          academic_years (
            id,
            name,
            school_id
          )
        `)
        .eq('id', offering.term_id)
        .single();

      if (!term) {
        errors.push('Term not found');
      } else {
        // Calculate term duration in weeks
        const startDate = new Date(term.start_date);
        const endDate = new Date(term.end_date);
        const termWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

        // Calculate expected hours based on periods per week and term duration
        const periodDurationHours = (term.period_duration_minutes || 50) / 60;
        const expectedHours = offering.periods_per_week * periodDurationHours * termWeeks;

        // Validate against course requirements
        if (course.total_hours_per_year) {
          const expectedTermHours = course.total_hours_per_year / 4; // Assuming 4 terms per year
          const variance = Math.abs(expectedHours - expectedTermHours);
          const variancePercentage = (variance / expectedTermHours) * 100;

          if (variancePercentage > 20) { // Allow 20% variance
            errors.push(`Hours allocation (${Math.round(expectedHours)}h) varies significantly from expected term hours (${Math.round(expectedTermHours)}h)`);
          }
        }

        // Get school constraints
        const { data: school } = await supabase
          .from('schools')
          .select('max_periods_per_day, sessions_per_day')
          .eq('id', schoolId)
          .single();

        if (school) {
          // Validate against school constraints
          if (offering.periods_per_week > (school.sessions_per_day * 5)) { // Assuming 5 school days
            errors.push(`Periods per week (${offering.periods_per_week}) exceeds maximum possible periods based on school schedule`);
          }
        }

        return {
          isValid: errors.length === 0,
          message: errors.join(', '),
          details: {
            periods_per_week: offering.periods_per_week,
            required_hours_per_term: offering.required_hours_per_term,
            expected_hours: Math.round(expectedHours),
            variance: Math.round(Math.abs(expectedHours - (course.total_hours_per_year ? course.total_hours_per_year / 4 : 0))),
            course_total_hours: course.total_hours_per_year,
            term_duration_weeks: termWeeks
          }
        };
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.join(', ')
    };
  } catch (error) {
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create a new class offering with validation
 */
export async function createClassOffering(
  offering: Omit<ClassOffering, 'id' | 'created_at'>
): Promise<{ data: ClassOffering | null; error: string | null }> {
  try {
    // Get school ID from course
    const supabase = createClient();
    const { data: course } = await supabase
      .from('courses')
      .select('school_id')
      .eq('id', offering.course_id)
      .single();

    if (!course) {
      return { data: null, error: 'Course not found' };
    }

    // Validate offering
    const validation = await validateClassOffering(offering, course.school_id);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const { data, error } = await supabase
      .from('class_offerings')
      .insert(offering)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create class offering', error);
  }
}

/**
 * Update a class offering
 */
export async function updateClassOffering(
  id: string,
  updates: Partial<ClassOffering>
): Promise<{ data: ClassOffering | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current offering
    const { data: currentOffering } = await supabase
      .from('class_offerings')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentOffering) {
      return { data: null, error: 'Class offering not found' };
    }

    const updatedOffering = { ...currentOffering, ...updates };

    // Validate updated offering data
    const validationErrors = await validateClassOffering(updatedOffering, currentOffering.school_id);
    if (validationErrors.length > 0) {
      return { data: null, error: validationErrors.join(', ') };
    }

    const { data, error } = await supabase
      .from('class_offerings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to update class offering', error);
  }
}

/**
 * Delete a class offering
 */
export async function deleteClassOffering(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Check for dependencies
    const dependencies = await checkClassOfferingDependencies(id);
    if (dependencies.hasDependencies) {
      return {
        success: false,
        error: `Cannot delete class offering: ${dependencies.message}`
      };
    }

    const { error } = await supabase
      .from('class_offerings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to delete class offering', error);
  }
}

/**
 * Helper function to check class offering dependencies
 */
async function checkClassOfferingDependencies(
  offeringId: string
): Promise<{ hasDependencies: boolean; message: string }> {
  const supabase = createClient();

  // Check for teaching assignments
  const { count: assignmentsCount } = await supabase
    .from('teaching_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('class_offering_id', offeringId);

  const dependencies = [];
  if (assignmentsCount) dependencies.push(`${assignmentsCount} teaching assignments`);

  return {
    hasDependencies: dependencies.length > 0,
    message: dependencies.length > 0
      ? `Class offering has active ${dependencies.join(', ')}`
      : ''
  };
}

/**
 * Get course requirements summary
 */
export async function getCourseRequirementsSummary(courseId: string): Promise<CourseRequirementsSummary> {
  const supabase = createClient();
  
  // Get course information
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) {
    throw new Error('Course not found');
  }

  // Get all class offerings for this course
  const { data: offerings } = await supabase
    .from('class_offerings')
    .select(`
      id,
      periods_per_week,
      required_hours_per_term,
      classes (
        name
      ),
      terms (
        name
      ),
      teaching_assignments (
        id
      )
    `)
    .eq('course_id', courseId);

  if (!offerings) {
    throw new Error('Failed to fetch class offerings');
  }

  const totalPeriods = offerings.reduce((sum, offering) => sum + offering.periods_per_week, 0);
  const totalHours = offerings.reduce((sum, offering) => sum + (offering.required_hours_per_term || 0), 0);

  // Calculate consistency score
  let consistencyScore = 100;
  
  if (course.hours_distribution_type === 'equal' && course.total_hours_per_year) {
    // Check if class offerings match expected distribution
    const expectedHoursPerTerm = course.total_hours_per_year / offerings.length;
    const variance = offerings.reduce((sum, offering) => {
      if (offering.required_hours_per_term) {
        return sum + Math.abs(offering.required_hours_per_term - expectedHoursPerTerm);
      }
      return sum;
    }, 0);
    
    consistencyScore = Math.max(0, 100 - (variance / course.total_hours_per_year) * 100);
  }

  return {
    course_id: course.id,
    course_name: course.name,
    course_code: course.code || '',
    total_hours_per_year: course.total_hours_per_year,
    hours_distribution_type: course.hours_distribution_type,
    term_hours: course.term_hours,
    class_offerings: offerings.map(offering => ({
      id: offering.id,
      class_name: offering.classes?.name || '',
      term_name: offering.terms?.name || '',
      periods_per_week: offering.periods_per_week,
      required_hours_per_term: offering.required_hours_per_term,
      is_assigned: offering.teaching_assignments && offering.teaching_assignments.length > 0,
    })),
    total_periods_across_offerings: totalPeriods,
    total_hours_across_offerings: totalHours,
    consistency_score: Math.round(consistencyScore),
  };
}

/**
 * Bulk create class offerings with auto-calculation
 */
export async function bulkCreateClassOfferings(
  offerings: Array<Omit<ClassOfferingInsert, 'id'>>
): Promise<ClassOffering[]> {
  const supabase = createClient();
  
  // Validate all offerings first
  for (const offering of offerings) {
    const validation = await validateClassOfferingData(offering);
    if (!validation.isValid) {
      throw new Error(`Invalid offering data: ${validation.message}`);
    }
  }

  // Enhance all offerings with auto-calculations
  const enhancedOfferings = await Promise.all(
    offerings.map(offering => enhanceClassOfferingData(offering))
  );

  // Ensure all required fields are present
  const finalOfferings = enhancedOfferings.map((enhanced, index) => ({
    ...offerings[index],
    ...enhanced
  })) as ClassOfferingInsert[];

  const { data, error } = await supabase
    .from('class_offerings')
    .insert(finalOfferings)
    .select();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      throw new Error('One or more class offerings already exist for the specified term, class, and course combinations');
    }
    throw new Error(`Failed to create class offerings: ${error.message}`);
  }

  return data || [];
}

/**
 * Get unassigned class offerings
 */
export async function getUnassignedClassOfferings(schoolId: string): Promise<ClassOfferingWithDetails[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('class_offerings')
    .select(`
      *,
      courses!inner (
        *,
        departments (
          id,
          name,
          code
        )
      ),
      classes (
        id,
        name,
        grade_level,
        school_id
      ),
      terms (
        id,
        name,
        start_date,
        end_date,
        period_duration_minutes,
        academic_years (
          id,
          name,
          school_id
        )
      ),
      teaching_assignments (
        id,
        teachers (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('courses.school_id', schoolId)
    .is('teaching_assignments.id', null);

  if (error) {
    throw new Error(`Failed to fetch unassigned class offerings: ${error.message}`);
  }

  return data || [];
}

/**
 * Validate period duration consistency for a school
 */
export async function validatePeriodDurationConsistency(schoolId: string): Promise<any[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('validate_period_duration_consistency', { school_id_param: schoolId });

  if (error) {
    throw new Error(`Failed to validate period duration consistency: ${error.message}`);
  }

  return data || [];
}

/**
 * Get available teaching time for OR-Tools
 */
export async function getAvailableTeachingTime(termId: string): Promise<any[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('get_available_teaching_time', { term_id_param: termId });

  if (error) {
    throw new Error(`Failed to get available teaching time: ${error.message}`);
  }

  return data || [];
}

/**
 * Validate teacher workload constraints
 */
export async function validateTeacherWorkloadConstraints(termId: string): Promise<any[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('validate_teacher_workload_constraints', { term_id_param: termId });

  if (error) {
    throw new Error(`Failed to validate teacher workload constraints: ${error.message}`);
  }

  return data || [];
} 