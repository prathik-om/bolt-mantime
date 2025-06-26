import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';
import { AcademicYear, Term } from '../types/database-helpers';
import { handleError } from '../utils/error-handling';

type AcademicYearInsert = Database['public']['Tables']['academic_years']['Insert'];
type AcademicYearUpdate = Database['public']['Tables']['academic_years']['Update'];

type TermInsert = Database['public']['Tables']['terms']['Insert'];
type TermUpdate = Database['public']['Tables']['terms']['Update'];

export interface AcademicYearWithTerms extends AcademicYear {
  terms: Term[];
}

export interface TermWithAcademicYear extends Term {
  academic_years: Pick<AcademicYear, 'id' | 'name' | 'school_id'>;
}

export interface AcademicCalendarSummary {
  academic_year_id: string;
  academic_year_name: string;
  term_count: number;
  total_weeks: number;
  total_teaching_days: number;
  holidays_count: number;
  class_offerings_count: number;
  teaching_assignments_count: number;
}

export interface TermSummary {
  term_id: string;
  term_name: string;
  academic_year_name: string;
  start_date: string;
  end_date: string;
  duration_weeks: number;
  period_duration_minutes: number;
  class_offerings_count: number;
  teaching_assignments_count: number;
  holidays_count: number;
}

interface AcademicYearValidation {
  isValid: boolean;
  message: string;
  details?: {
    duration_weeks?: number;
    term_count?: number;
    total_teaching_days?: number;
    holiday_count?: number;
  };
}

interface TermValidation {
  isValid: boolean;
  message: string;
  details?: {
    duration_weeks?: number;
    teaching_days?: number;
    holiday_count?: number;
    class_offerings_count?: number;
  };
}

/**
 * Get all academic years with their terms for a school
 */
export async function getAcademicYearsWithTerms(schoolId: string): Promise<{ data: AcademicYearWithTerms[] | null; error: string | null }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('academic_years')
      .select(`
        *,
        terms (
          id,
          name,
          start_date,
          end_date,
          academic_year_id,
          period_duration_minutes
        )
      `)
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get academic years with terms', error);
  }
}

/**
 * Get a single academic year with its terms
 */
export async function getAcademicYearWithTerms(academicYearId: string): Promise<{ data: AcademicYearWithTerms | null; error: string | null }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('academic_years')
      .select(`
        *,
        terms (
          id,
          name,
          start_date,
          end_date,
          academic_year_id,
          period_duration_minutes
        )
      `)
      .eq('id', academicYearId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get academic year with terms', error);
  }
}

/**
 * Get all terms for a school with their academic year information
 */
export async function getTermsWithAcademicYears(schoolId: string): Promise<TermWithAcademicYear[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('terms')
    .select(`
      *,
      academic_years!inner(
        id,
        name,
        school_id
      )
    `)
    .eq('academic_years.school_id', schoolId)
    .order('start_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch terms: ${error.message}`);
  }

  return data || [];
}

/**
 * Get terms for a specific academic year
 */
export async function getTermsByAcademicYear(academicYearId: string): Promise<{ data: Term[] | null; error: string | null }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('terms')
      .select('*')
      .eq('academic_year_id', academicYearId)
      .order('start_date', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to get terms by academic year', error);
  }
}

/**
 * Validate academic year data
 */
async function validateAcademicYear(
  year: Partial<AcademicYear>
): Promise<AcademicYearValidation> {
  try {
    const errors: string[] = [];
    const supabase = createClient();

    if (!year.name?.trim()) {
      errors.push('Academic year name is required');
    }

    if (!year.start_date) {
      errors.push('Start date is required');
    }

    if (!year.end_date) {
      errors.push('End date is required');
    }

    if (year.start_date && year.end_date) {
      const start = new Date(year.start_date);
      const end = new Date(year.end_date);

      if (isNaN(start.getTime())) {
        errors.push('Invalid start date format');
      }

      if (isNaN(end.getTime())) {
        errors.push('Invalid end date format');
      }

      if (end <= start) {
        errors.push('End date must be after start date');
      }

      // Calculate duration
      const durationWeeks = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      
      if (durationWeeks < 30) {
        errors.push('Academic year must be at least 30 weeks');
      }

      if (durationWeeks > 52) {
        errors.push('Academic year cannot exceed 52 weeks');
      }

      // Check for overlapping academic years
      if (year.school_id) {
        const { data: existingYears } = await supabase
          .from('academic_years')
          .select('*')
          .eq('school_id', year.school_id)
          .neq('id', year.id || '')
          .or(`start_date.lte.${year.end_date},end_date.gte.${year.start_date}`);

        if (existingYears && existingYears.length > 0) {
          errors.push('Academic year dates overlap with existing academic years');
        }
      }

      // Get holidays count
      let holidayCount = 0;
      if (year.id) {
        const { count } = await supabase
          .from('holidays')
          .select('*', { count: 'exact', head: true })
          .eq('academic_year_id', year.id);
        holidayCount = count || 0;
      }

      // Get term count
      let termCount = 0;
      if (year.id) {
        const { count } = await supabase
          .from('terms')
          .select('*', { count: 'exact', head: true })
          .eq('academic_year_id', year.id);
        termCount = count || 0;
      }

      return {
        isValid: errors.length === 0,
        message: errors.join(', '),
        details: {
          duration_weeks: durationWeeks,
          term_count: termCount,
          total_teaching_days: durationWeeks * 5 - holidayCount, // Assuming 5-day weeks
          holiday_count: holidayCount
        }
      };
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
 * Validate term data
 */
async function validateTerm(term: Partial<Term>): Promise<TermValidation> {
  try {
    const errors: string[] = [];
    const supabase = createClient();

    if (!term.name?.trim()) {
      errors.push('Term name is required');
    }

    if (!term.start_date) {
      errors.push('Start date is required');
    }

    if (!term.end_date) {
      errors.push('End date is required');
    }

    if (!term.academic_year_id) {
      errors.push('Academic year is required');
    }

    if (term.period_duration_minutes !== undefined) {
      if (term.period_duration_minutes < 30) {
        errors.push('Period duration must be at least 30 minutes');
      }
      if (term.period_duration_minutes > 120) {
        errors.push('Period duration cannot exceed 120 minutes');
      }
    }

    if (term.start_date && term.end_date) {
      const start = new Date(term.start_date);
      const end = new Date(term.end_date);

      if (isNaN(start.getTime())) {
        errors.push('Invalid start date format');
      }

      if (isNaN(end.getTime())) {
        errors.push('Invalid end date format');
      }

      if (end <= start) {
        errors.push('End date must be after start date');
      }

      // Calculate duration
      const durationWeeks = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      
      if (durationWeeks < 6) {
        errors.push('Term must be at least 6 weeks');
      }

      if (durationWeeks > 16) {
        errors.push('Term cannot exceed 16 weeks');
      }

      // Check if term dates are within academic year
      if (term.academic_year_id) {
        const { data: academicYear } = await supabase
          .from('academic_years')
          .select('start_date, end_date')
          .eq('id', term.academic_year_id)
          .single();

        if (academicYear) {
          const academicYearStart = new Date(academicYear.start_date);
          const academicYearEnd = new Date(academicYear.end_date);

          if (start < academicYearStart) {
            errors.push('Term cannot start before academic year');
          }

          if (end > academicYearEnd) {
            errors.push('Term cannot end after academic year');
          }
        }
      }

      // Check for overlapping terms in the same academic year
      if (term.academic_year_id) {
        const { data: existingTerms } = await supabase
          .from('terms')
          .select('*')
          .eq('academic_year_id', term.academic_year_id)
          .neq('id', term.id || '')
          .or(`start_date.lte.${term.end_date},end_date.gte.${term.start_date}`);

        if (existingTerms && existingTerms.length > 0) {
          errors.push('Term dates overlap with existing terms');
        }
      }

      // Get holidays count
      let holidayCount = 0;
      if (term.id) {
        const { count } = await supabase
          .from('holidays')
          .select('*', { count: 'exact', head: true })
          .eq('term_id', term.id);
        holidayCount = count || 0;
      }

      // Get class offerings count
      let classOfferingsCount = 0;
      if (term.id) {
        const { count } = await supabase
          .from('class_offerings')
          .select('*', { count: 'exact', head: true })
          .eq('term_id', term.id);
        classOfferingsCount = count || 0;
      }

      return {
        isValid: errors.length === 0,
        message: errors.join(', '),
        details: {
          duration_weeks: durationWeeks,
          teaching_days: durationWeeks * 5 - holidayCount, // Assuming 5-day weeks
          holiday_count: holidayCount,
          class_offerings_count: classOfferingsCount
        }
      };
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
 * Create a new academic year with validation
 */
export async function createAcademicYear(
  year: Omit<AcademicYear, 'id' | 'created_at'>
): Promise<{ data: AcademicYear | null; error: string | null }> {
  try {
    // Validate year
    const validation = await validateAcademicYear(year);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('academic_years')
      .insert(year)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create academic year', error);
  }
}

/**
 * Update an academic year
 */
export async function updateAcademicYear(
  id: string,
  updates: Partial<AcademicYear>
): Promise<{ data: AcademicYear | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current academic year
    const { data: currentYear } = await supabase
      .from('academic_years')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentYear) {
      return { data: null, error: 'Academic year not found' };
    }

    // Validate dates if they're being updated
    if (updates.start_date && !isValidDate(updates.start_date)) {
      return { data: null, error: 'Invalid start date format' };
    }
    if (updates.end_date && !isValidDate(updates.end_date)) {
      return { data: null, error: 'Invalid end date format' };
    }

    // Check if dates are in correct order
    const startDate = updates.start_date || currentYear.start_date;
    const endDate = updates.end_date || currentYear.end_date;
    if (new Date(startDate) >= new Date(endDate)) {
      return { data: null, error: 'End date must be after start date' };
    }

    // Check for overlapping academic years if dates are being updated
    if (updates.start_date || updates.end_date) {
      const { data: existingYears } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', currentYear.school_id)
        .neq('id', id)
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (existingYears && existingYears.length > 0) {
        return { data: null, error: 'Academic year overlaps with existing academic years' };
      }
    }

    const { data, error } = await supabase
      .from('academic_years')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to update academic year', error);
  }
}

/**
 * Delete an academic year
 */
export async function deleteAcademicYear(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Check for dependencies
    const dependencies = await checkAcademicYearDependencies(id);
    if (dependencies.hasDependencies) {
      return {
        success: false,
        error: `Cannot delete academic year: ${dependencies.message}`
      };
    }

    const { error } = await supabase
      .from('academic_years')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return handleError('Failed to delete academic year', error);
  }
}

/**
 * Create a new term with validation
 */
export async function createTerm(
  term: Omit<Term, 'id' | 'created_at'>
): Promise<{ data: Term | null; error: string | null }> {
  try {
    // Validate term
    const validation = await validateTerm(term);
    if (!validation.isValid) {
      return { data: null, error: validation.message };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('terms')
      .insert(term)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return handleError('Failed to create term', error);
  }
}

/**
 * Update a term
 */
export async function updateTerm(termId: string, updates: TermUpdate): Promise<Term> {
  const supabase = createClient();
  
  // Validate dates if provided
  if (updates.start_date && updates.end_date) {
    const startDate = new Date(updates.start_date);
    const endDate = new Date(updates.end_date);
    
    if (endDate <= startDate) {
      throw new Error('Term end date must be after start date');
    }
  }

  const { data, error } = await supabase
    .from('terms')
    .update(updates)
    .eq('id', termId)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('terms_academic_year_name_unique')) {
        throw new Error(`A term with the name "${updates.name}" already exists in this academic year`);
      }
      if (error.message.includes('terms_academic_year_dates_unique')) {
        throw new Error('Term dates overlap with an existing term in this academic year');
      }
    }
    throw new Error(`Failed to update term: ${error.message}`);
  }

  return data;
}

/**
 * Delete a term
 */
export async function deleteTerm(termId: string): Promise<void> {
  const supabase = createClient();
  
  // Check if there are any class offerings using this term
  const { data: offerings } = await supabase
    .from('class_offerings')
    .select('id')
    .eq('term_id', termId)
    .limit(1);

  if (offerings && offerings.length > 0) {
    throw new Error('Cannot delete term: it has class offerings associated with it');
  }

  const { error } = await supabase
    .from('terms')
    .delete()
    .eq('id', termId);

  if (error) {
    throw new Error(`Failed to delete term: ${error.message}`);
  }
}

/**
 * Get academic calendar summary for a school
 */
export async function getAcademicCalendarSummary(schoolId: string): Promise<AcademicCalendarSummary[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('academic_years')
    .select(`
      id,
      name,
      terms (
        id,
        start_date,
        end_date
      )
    `)
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch academic calendar summary: ${error.message}`);
  }

  // Transform data to include calculated fields
  return (data || []).map(year => {
    const termCount = year.terms?.length || 0;
    let totalWeeks = 0;
    let totalTeachingDays = 0;

    year.terms?.forEach(term => {
      const startDate = new Date(term.start_date);
      const endDate = new Date(term.end_date);
      const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      totalWeeks += weeks;
      totalTeachingDays += weeks * 5; // Assuming 5 teaching days per week
    });

    return {
      academic_year_id: year.id,
      academic_year_name: year.name,
      term_count: termCount,
      total_weeks: totalWeeks,
      total_teaching_days: totalTeachingDays,
      holidays_count: 0, // Would need to be calculated from holidays table
      class_offerings_count: 0, // Would need to be calculated from class_offerings table
      teaching_assignments_count: 0, // Would need to be calculated from teaching_assignments table
    };
  });
}

/**
 * Get term summary with statistics
 */
export async function getTermSummary(termId: string): Promise<TermSummary | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('terms')
    .select(`
      *,
      academic_years (
        name
      )
    `)
    .eq('id', termId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch term summary: ${error.message}`);
  }

  if (!data) return null;

  // Calculate duration in weeks
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  const durationWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

  // Get counts (these would be more efficient with proper joins, but keeping it simple for now)
  const { count: offeringsCount } = await supabase
    .from('class_offerings')
    .select('*', { count: 'exact', head: true })
    .eq('term_id', termId);

  const { count: assignmentsCount } = await supabase
    .from('teaching_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('class_offerings.term_id', termId);

  const { count: holidaysCount } = await supabase
    .from('holidays')
    .select('*', { count: 'exact', head: true })
    .eq('term_id', termId);

  return {
    term_id: data.id,
    term_name: data.name,
    academic_year_name: data.academic_years.name,
    start_date: data.start_date,
    end_date: data.end_date,
    duration_weeks: durationWeeks,
    period_duration_minutes: data.period_duration_minutes || 50,
    class_offerings_count: offeringsCount || 0,
    teaching_assignments_count: assignmentsCount || 0,
    holidays_count: holidaysCount || 0,
  };
}

/**
 * Validate academic year dates
 */
export async function validateAcademicYearDates(
  schoolId: string,
  startDate: string,
  endDate: string,
  excludeId?: string
): Promise<{ isValid: boolean; message: string }> {
  const supabase = createClient();
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end <= start) {
    return { isValid: false, message: 'End date must be after start date' };
  }

  // Check for overlapping academic years
  let query = supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: overlapping } = await query;

  if (overlapping && overlapping.length > 0) {
    return { isValid: false, message: 'Academic year dates overlap with existing academic year' };
  }

  return { isValid: true, message: 'Academic year dates are valid' };
}

/**
 * Validate term dates
 */
export async function validateTermDates(
  academicYearId: string,
  startDate: string,
  endDate: string,
  excludeId?: string
): Promise<{ isValid: boolean; message: string }> {
  const supabase = createClient();
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end <= start) {
    return { isValid: false, message: 'Term end date must be after start date' };
  }

  // Get academic year dates
  const { data: academicYear } = await supabase
    .from('academic_years')
    .select('start_date, end_date')
    .eq('id', academicYearId)
    .single();

  if (!academicYear) {
    return { isValid: false, message: 'Academic year not found' };
  }

  const yearStart = new Date(academicYear.start_date);
  const yearEnd = new Date(academicYear.end_date);

  if (start < yearStart || end > yearEnd) {
    return { isValid: false, message: 'Term dates must be within the academic year dates' };
  }

  // Check for overlapping terms
  let query = supabase
    .from('terms')
    .select('id')
    .eq('academic_year_id', academicYearId)
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: overlapping } = await query;

  if (overlapping && overlapping.length > 0) {
    return { isValid: false, message: 'Term dates overlap with existing term in this academic year' };
  }

  return { isValid: true, message: 'Term dates are valid' };
}

/**
 * Get current academic year and term
 */
export async function getCurrentAcademicPeriod(schoolId: string): Promise<{
  academicYear: AcademicYear | null;
  term: Term | null;
} | null> {
  const supabase = createClient();
  
  const today = new Date().toISOString().split('T')[0];
  
  // Find current academic year
  const { data: academicYear } = await supabase
    .from('academic_years')
    .select('*')
    .eq('school_id', schoolId)
    .lte('start_date', today)
    .gte('end_date', today)
    .single();

  if (!academicYear) {
    return { academicYear: null, term: null };
  }

  // Find current term
  const { data: term } = await supabase
    .from('terms')
    .select('*')
    .eq('academic_year_id', academicYear.id)
    .lte('start_date', today)
    .gte('end_date', today)
    .single();

  return {
    academicYear,
    term: term || null,
  };
}

/**
 * Helper function to validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Helper function to check academic year dependencies
 */
async function checkAcademicYearDependencies(
  academicYearId: string
): Promise<{ hasDependencies: boolean; message: string }> {
  const supabase = createClient();

  // Check for various dependencies
  const [
    { count: termsCount },
    { count: holidaysCount },
    { count: classOfferingsCount }
  ] = await Promise.all([
    supabase.from('terms').select('*', { count: 'exact', head: true }).eq('academic_year_id', academicYearId),
    supabase.from('holidays').select('*', { count: 'exact', head: true }).eq('academic_year_id', academicYearId),
    supabase.from('class_offerings').select('*', { count: 'exact', head: true }).eq('academic_year_id', academicYearId)
  ]);

  const dependencies = [];
  if (termsCount) dependencies.push(`${termsCount} terms`);
  if (holidaysCount) dependencies.push(`${holidaysCount} holidays`);
  if (classOfferingsCount) dependencies.push(`${classOfferingsCount} class offerings`);

  return {
    hasDependencies: dependencies.length > 0,
    message: dependencies.length > 0
      ? `Academic year has active ${dependencies.join(', ')}`
      : ''
  };
} 