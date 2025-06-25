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
  status: 'CONSISTENT' | 'INCONSISTENT';
  recommendation: string;
}

/**
 * Validates that periods_per_week and required_hours_per_term are consistent
 */
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
    throw new Error(`Validation failed: ${error.message}`);
  }

  return data[0];
}

/**
 * Gets a comprehensive report of curriculum consistency across all offerings
 */
export async function getCurriculumConsistencyReport(
  schoolId?: string
): Promise<CurriculumConsistencyReport[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_curriculum_consistency_report', {
    p_school_id: schoolId
  });

  if (error) {
    throw new Error(`Report generation failed: ${error.message}`);
  }

  // Map status to the correct union type
  const mappedData = (data || []).map((item) => ({
    ...item,
    status: item.status === 'CONSISTENT' ? 'CONSISTENT' : 'INCONSISTENT',
  })) as CurriculumConsistencyReport[];

  return mappedData;
}

/**
 * Calculates expected hours from periods (client-side validation)
 */
export function calculateExpectedHours(
  periodsPerWeek: number,
  weeksPerTerm: number = 16,
  periodDurationMinutes: number = 50
): number {
  return (periodsPerWeek * weeksPerTerm * periodDurationMinutes) / 60.0;
}

/**
 * Calculates recommended periods per week from required hours
 */
export function calculateRecommendedPeriods(
  requiredHoursPerTerm: number,
  weeksPerTerm: number = 16,
  periodDurationMinutes: number = 50
): number {
  return Math.round((requiredHoursPerTerm * 60.0) / (weeksPerTerm * periodDurationMinutes));
}

/**
 * Validates curriculum consistency with helpful messages
 */
export function validateCurriculumConsistency(
  periodsPerWeek: number,
  requiredHoursPerTerm: number,
  periodDurationMinutes: number = 50,
  weeksPerTerm: number = 16,
  tolerance: number = 5.0
): {
  isValid: boolean;
  expectedHours: number;
  variance: number;
  message: string;
  recommendation?: string;
} {
  const expectedHours = calculateExpectedHours(periodsPerWeek, weeksPerTerm, periodDurationMinutes);
  const variance = expectedHours - requiredHoursPerTerm;
  const isValid = Math.abs(variance) <= tolerance;

  let message = isValid 
    ? 'Hours and periods are consistent' 
    : `Warning: Expected ${expectedHours.toFixed(1)} hours but required ${requiredHoursPerTerm} hours (variance: ${variance.toFixed(1)})`;

  let recommendation: string | undefined;
  if (!isValid) {
    if (variance > 0) {
      // Expected hours > required hours - suggest increasing required hours
      recommendation = `Consider increasing required_hours_per_term to ${expectedHours.toFixed(1)}`;
    } else {
      // Expected hours < required hours - suggest increasing periods
      const recommendedPeriods = calculateRecommendedPeriods(requiredHoursPerTerm, weeksPerTerm, periodDurationMinutes);
      recommendation = `Consider increasing periods_per_week to ${recommendedPeriods}`;
    }
  }

  return {
    isValid,
    expectedHours,
    variance,
    message,
    recommendation
  };
} 