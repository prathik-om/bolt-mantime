import { createClient } from '@/utils/supabase/client';

export interface CurriculumValidationResult {
  is_valid: boolean;
  expected_hours: number;
  variance_hours: number;
  message: string;
}

export interface CurriculumConsistencyReport {
  class_name: string;
  course_name: string;
  periods_per_week: number;
  required_hours_per_term: number;
  expected_hours: number;
  variance_hours: number;
  status: string;
  recommendation: string;
}

export interface ClassCurriculumSummary {
  total_offerings: number;
  total_periods_per_week: number;
  total_hours_per_term: number;
  assigned_offerings: number;
  unassigned_offerings: number;
}

// Use the new database function for curriculum hours validation
export async function validateCurriculumHours(
  periodsPerWeek: number,
  requiredHoursPerTerm: number,
  periodDurationMinutes: number = 50,
  weeksPerTerm: number = 16
): Promise<CurriculumValidationResult> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('validate_curriculum_hours', {
    p_periods_per_week: periodsPerWeek,
    p_required_hours_per_term: requiredHoursPerTerm,
    p_period_duration_minutes: periodDurationMinutes,
    p_weeks_per_term: weeksPerTerm
  });

  if (error) {
    console.error('Error validating curriculum hours:', error);
    throw new Error(`Failed to validate curriculum hours: ${error.message}`);
  }

  const result = data?.[0];
  if (!result) {
    throw new Error('No validation result returned');
  }

  return {
    is_valid: result.is_valid,
    expected_hours: result.expected_hours,
    variance_hours: result.variance_hours,
    message: result.message
  };
}

// Use the new database function for curriculum consistency report
export async function getCurriculumConsistencyReport(schoolId?: string): Promise<CurriculumConsistencyReport[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_curriculum_consistency_report', {
    p_school_id: schoolId
  });

  if (error) {
    console.error('Error fetching curriculum consistency report:', error);
    throw new Error(`Failed to fetch curriculum consistency report: ${error.message}`);
  }

  return data || [];
}

// Use the new database function for class curriculum summary
export async function getClassCurriculumSummary(
  classId: string, 
  termId: string
): Promise<ClassCurriculumSummary | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_class_section_curriculum_summary', {
    p_class_section_id: classId,
    p_term_id: termId
  });

  if (error) {
    console.error('Error fetching class curriculum summary:', error);
    throw new Error(`Failed to fetch class curriculum summary: ${error.message}`);
  }

  const result = data?.[0];
  if (!result) {
    return null;
  }

  return {
    total_offerings: result.total_offerings,
    total_periods_per_week: result.total_periods_per_week,
    total_hours_per_term: result.total_hours_per_term,
    assigned_offerings: result.assigned_offerings,
    unassigned_offerings: result.unassigned_offerings
  };
}

// Validate class offering consistency
export async function validateClassOfferingConsistency(classOfferingId: string) {
  const supabase = createClient();

  // Get the class offering details
  const { data: offering, error: offeringError } = await supabase
    .from('class_offerings')
    .select(`
      id,
      periods_per_week,
      required_hours_per_term,
      classes!inner(
        name,
        grade_level
      ),
      courses!inner(
        name,
        code
      )
    `)
    .eq('id', classOfferingId)
    .single();

  if (offeringError) {
    console.error('Error fetching class offering:', offeringError);
    throw new Error(`Failed to fetch class offering: ${offeringError.message}`);
  }

  if (!offering) {
    throw new Error('Class offering not found');
  }

  // Validate the curriculum hours
  const validation = await validateCurriculumHours(
    offering.periods_per_week || 0,
    offering.required_hours_per_term || 0
  );

  return {
    offering_id: offering.id,
    class_name: offering.classes.name,
    course_name: offering.courses.name,
    periods_per_week: offering.periods_per_week,
    required_hours_per_term: offering.required_hours_per_term,
    validation
  };
}

// Validate term curriculum consistency
export async function validateTermCurriculum(termId: string) {
  const supabase = createClient();

  // Get all class offerings for the term
  const { data: offerings, error: offeringsError } = await supabase
    .from('class_offerings')
    .select(`
      id,
      periods_per_week,
      required_hours_per_term,
      classes!inner(
        name,
        grade_level
      ),
      courses!inner(
        name,
        code
      )
    `)
    .eq('term_id', termId);

  if (offeringsError) {
    console.error('Error fetching class offerings:', offeringsError);
    throw new Error(`Failed to fetch class offerings: ${offeringsError.message}`);
  }

  if (!offerings) {
    return [];
  }

  // Validate each offering
  const validations = await Promise.all(
    offerings.map(async (offering) => {
      const validation = await validateCurriculumHours(
        offering.periods_per_week || 0,
        offering.required_hours_per_term || 0
      );

      return {
        offering_id: offering.id,
        class_name: offering.classes.name,
        course_name: offering.courses.name,
        periods_per_week: offering.periods_per_week,
        required_hours_per_term: offering.required_hours_per_term,
        validation
      };
    })
  );

  return validations;
}

// Get curriculum statistics for a school
export async function getCurriculumStats(schoolId: string) {
  const supabase = createClient();

  // Get consistency report
  const consistencyReport = await getCurriculumConsistencyReport(schoolId);
  
  // Calculate statistics
  const totalOfferings = consistencyReport.length;
  const validOfferings = consistencyReport.filter(item => item.status === 'valid').length;
  const invalidOfferings = totalOfferings - validOfferings;
  
  const averageVariance = consistencyReport.length > 0 
    ? consistencyReport.reduce((sum, item) => sum + Math.abs(item.variance_hours), 0) / consistencyReport.length
    : 0;

  return {
    total_offerings: totalOfferings,
    valid_offerings: validOfferings,
    invalid_offerings: invalidOfferings,
    validity_percentage: totalOfferings > 0 ? (validOfferings / totalOfferings) * 100 : 0,
    average_variance_hours: averageVariance,
    consistency_report: consistencyReport
  };
}

// Validate teacher workload for curriculum
export async function validateTeacherWorkloadForCurriculum(
  teacherId: string,
  termId: string,
  additionalPeriodsPerWeek: number = 0
) {
  const supabase = createClient();

  // Get current teacher assignments for the term
  const { data: assignments, error: assignmentsError } = await supabase
    .from('teaching_assignments')
    .select(`
      class_offerings!inner(
        periods_per_week,
        term_id
      )
    `)
    .eq('teacher_id', teacherId)
    .eq('class_offerings.term_id', termId);

  if (assignmentsError) {
    console.error('Error fetching teacher assignments:', assignmentsError);
    throw new Error(`Failed to fetch teacher assignments: ${assignmentsError.message}`);
  }

  // Calculate current workload
  const currentPeriodsPerWeek = assignments?.reduce((total, assignment) => 
    total + (assignment.class_offerings.periods_per_week || 0), 0) || 0;
  
  const totalPeriodsPerWeek = currentPeriodsPerWeek + additionalPeriodsPerWeek;
  const maxPeriodsPerWeek = 20; // Default max periods per week

  return {
    teacher_id: teacherId,
    current_periods_per_week: currentPeriodsPerWeek,
    additional_periods_per_week: additionalPeriodsPerWeek,
    total_periods_per_week: totalPeriodsPerWeek,
    max_periods_per_week: maxPeriodsPerWeek,
    is_within_limit: totalPeriodsPerWeek <= maxPeriodsPerWeek,
    available_periods: Math.max(0, maxPeriodsPerWeek - totalPeriodsPerWeek),
    utilization_percentage: maxPeriodsPerWeek > 0 ? (totalPeriodsPerWeek / maxPeriodsPerWeek) * 100 : 0
  };
}

// Validate room availability for curriculum
export async function validateRoomAvailabilityForCurriculum(
  roomId: string,
  termId: string,
  dayOfWeek: number,
  timeSlotId: string
) {
  const supabase = createClient();

  // Check for existing scheduled lessons in this room at this time
  const { data: conflicts, error: conflictsError } = await supabase
    .from('scheduled_lessons')
    .select(`
      id,
      date,
      timeslot_id,
      teaching_assignments!inner(
        class_offerings!inner(
          term_id
        )
      )
    `)
    .eq('timeslot_id', timeSlotId)
    .eq('teaching_assignments.class_offerings.term_id', termId);

  if (conflictsError) {
    console.error('Error checking room conflicts:', conflictsError);
    throw new Error(`Failed to check room conflicts: ${conflictsError.message}`);
  }

  // Filter conflicts for the specific day of week
  const dayConflicts = conflicts?.filter(conflict => {
    const conflictDate = new Date(conflict.date);
    const conflictDayOfWeek = conflictDate.getDay();
    // Convert Sunday=0 to Monday=1 format
    const normalizedConflictDay = conflictDayOfWeek === 0 ? 7 : conflictDayOfWeek;
    return normalizedConflictDay === dayOfWeek;
  }) || [];

  return {
    room_id: roomId,
    term_id: termId,
    day_of_week: dayOfWeek,
    time_slot_id: timeSlotId,
    has_conflicts: dayConflicts.length > 0,
    conflict_count: dayConflicts.length,
    conflicts: dayConflicts
  };
} 