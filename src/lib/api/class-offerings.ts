import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

type ClassOffering = Database['public']['Tables']['class_offerings']['Row'];
type ClassOfferingInsert = Database['public']['Tables']['class_offerings']['Insert'];
type ClassOfferingUpdate = Database['public']['Tables']['class_offerings']['Update'];

type Course = Database['public']['Tables']['courses']['Row'];
type Term = Database['public']['Tables']['terms']['Row'];
type Class = Database['public']['Tables']['classes']['Row'];

export interface ClassOfferingWithDetails extends ClassOffering {
  courses: Course;
  classes: {
    id: string;
    name: string;
    grade_level: number;
    school_id: string;
  };
  terms: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    period_duration_minutes: number | null;
    academic_years: {
      id: string;
      name: string;
      school_id: string;
    };
  };
  teaching_assignments: Array<{
    id: string;
    teachers: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  }>;
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
 * Create a new class offering with auto-calculation
 */
export async function createClassOffering(offeringData: ClassOfferingInsert): Promise<ClassOffering> {
  const supabase = createClient();
  
  // Validate the offering data
  const validation = await validateClassOfferingData(offeringData);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  // Auto-calculate required hours if not provided
  const enhancedData = await enhanceClassOfferingData(offeringData);

  // Ensure all required fields are present
  const finalData = {
    ...offeringData,
    ...enhancedData
  } as ClassOfferingInsert;

  const { data, error } = await supabase
    .from('class_offerings')
    .insert(finalData)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('class_offerings_term_class_course_unique')) {
        throw new Error('This course is already offered for this class in this term');
      }
    }
    throw new Error(`Failed to create class offering: ${error.message}`);
  }

  return data;
}

/**
 * Update a class offering with auto-calculation
 */
export async function updateClassOffering(
  offeringId: string, 
  updates: ClassOfferingUpdate
): Promise<ClassOffering> {
  const supabase = createClient();
  
  // Validate the offering data
  const validation = await validateClassOfferingData(updates, offeringId);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  // Auto-calculate required hours if periods_per_week changed
  const enhancedUpdates = await enhanceClassOfferingData(updates);

  const { data, error } = await supabase
    .from('class_offerings')
    .update(enhancedUpdates)
    .eq('id', offeringId)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('class_offerings_term_class_course_unique')) {
        throw new Error('This course is already offered for this class in this term');
      }
    }
    throw new Error(`Failed to update class offering: ${error.message}`);
  }

  return data;
}

/**
 * Delete a class offering
 */
export async function deleteClassOffering(offeringId: string): Promise<void> {
  const supabase = createClient();
  
  // Check if this offering has teaching assignments
  const { data: assignments } = await supabase
    .from('teaching_assignments')
    .select('id')
    .eq('class_offering_id', offeringId)
    .limit(1);

  if (assignments && assignments.length > 0) {
    throw new Error('Cannot delete class offering: it has teaching assignments');
  }

  const { error } = await supabase
    .from('class_offerings')
    .delete()
    .eq('id', offeringId);

  if (error) {
    throw new Error(`Failed to delete class offering: ${error.message}`);
  }
}

/**
 * Validate class offering data
 */
export async function validateClassOfferingData(
  data: Partial<ClassOffering>,
  excludeId?: string
): Promise<ClassOfferingValidation> {
  const supabase = createClient();
  
  // Basic validation
  if (data.periods_per_week !== undefined && data.periods_per_week < 1) {
    return { isValid: false, message: 'Periods per week must be at least 1' };
  }

  if (data.required_hours_per_term !== undefined && data.required_hours_per_term !== null) {
    if (data.required_hours_per_term < 0) {
      return { isValid: false, message: 'Required hours per term cannot be negative' };
    }
  }

  // Check for duplicate class offering
  if (data.term_id && data.class_id && data.course_id) {
    let query = supabase
      .from('class_offerings')
      .select('id')
      .eq('term_id', data.term_id)
      .eq('class_id', data.class_id)
      .eq('course_id', data.course_id);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data: existing } = await query;
    
    if (existing && existing.length > 0) {
      return { isValid: false, message: 'This course is already offered for this class in this term' };
    }
  }

  // Validate grade level consistency
  if (data.class_id && data.course_id) {
    const { data: classData } = await supabase
      .from('classes')
      .select('grade_level')
      .eq('id', data.class_id)
      .single();

    const { data: courseData } = await supabase
      .from('courses')
      .select('grade_level')
      .eq('id', data.course_id)
      .single();

    if (classData && courseData && classData.grade_level !== courseData.grade_level) {
      return { 
        isValid: false, 
        message: `Grade level mismatch: class is grade ${classData.grade_level}, course is grade ${courseData.grade_level}` 
      };
    }
  }

  // Validate school consistency
  if (data.class_id && data.course_id) {
    const { data: classData } = await supabase
      .from('classes')
      .select('school_id')
      .eq('id', data.class_id)
      .single();

    const { data: courseData } = await supabase
      .from('courses')
      .select('school_id')
      .eq('id', data.course_id)
      .single();

    if (classData && courseData && classData.school_id !== courseData.school_id) {
      return { 
        isValid: false, 
        message: 'Class and course must belong to the same school' 
      };
    }
  }

  return { isValid: true, message: 'Class offering data is valid' };
}

/**
 * Enhance class offering data with auto-calculations
 */
export async function enhanceClassOfferingData(
  data: Partial<ClassOffering>
): Promise<Partial<ClassOffering>> {
  const supabase = createClient();
  
  // If we have periods_per_week but no required_hours_per_term, calculate it
  if (data.periods_per_week && data.periods_per_week > 0 && 
      (data.required_hours_per_term === null || data.required_hours_per_term === undefined) &&
      data.term_id) {
    
    // Get term information
    const { data: termData } = await supabase
      .from('terms')
      .select('period_duration_minutes, start_date, end_date')
      .eq('id', data.term_id)
      .single();

    if (termData && termData.period_duration_minutes) {
      // Calculate term duration in weeks
      const startDate = new Date(termData.start_date);
      const endDate = new Date(termData.end_date);
      const weeksInTerm = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
      
      // Calculate required hours per term
      const hoursPerWeek = (data.periods_per_week * termData.period_duration_minutes) / 60;
      const requiredHoursPerTerm = hoursPerWeek * weeksInTerm;
      
      return {
        ...data,
        required_hours_per_term: Math.round(requiredHoursPerTerm * 100) / 100 // Round to 2 decimal places
      };
    }
  }

  return data;
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