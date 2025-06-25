import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

type AcademicYear = Database['public']['Tables']['academic_years']['Row'];
type AcademicYearInsert = Database['public']['Tables']['academic_years']['Insert'];
type AcademicYearUpdate = Database['public']['Tables']['academic_years']['Update'];

type Term = Database['public']['Tables']['terms']['Row'];
type TermInsert = Database['public']['Tables']['terms']['Insert'];
type TermUpdate = Database['public']['Tables']['terms']['Update'];

export interface AcademicYearWithTerms extends AcademicYear {
  terms: Term[];
}

export interface TermWithAcademicYear extends Term {
  academic_years: AcademicYear;
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

/**
 * Get all academic years with their terms for a school
 */
export async function getAcademicYearsWithTerms(schoolId: string): Promise<AcademicYearWithTerms[]> {
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

  if (error) {
    throw new Error(`Failed to fetch academic years: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single academic year with its terms
 */
export async function getAcademicYearWithTerms(academicYearId: string): Promise<AcademicYearWithTerms | null> {
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

  if (error) {
    throw new Error(`Failed to fetch academic year: ${error.message}`);
  }

  return data;
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
export async function getTermsByAcademicYear(academicYearId: string): Promise<Term[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .eq('academic_year_id', academicYearId)
    .order('start_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch terms: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new academic year
 */
export async function createAcademicYear(academicYearData: AcademicYearInsert): Promise<AcademicYear> {
  const supabase = createClient();
  
  // Validate dates
  const startDate = new Date(academicYearData.start_date);
  const endDate = new Date(academicYearData.end_date);
  
  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  const { data, error } = await supabase
    .from('academic_years')
    .insert(academicYearData)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('academic_years_school_name_unique')) {
        throw new Error(`An academic year with the name "${academicYearData.name}" already exists for this school`);
      }
      if (error.message.includes('academic_years_school_dates_unique')) {
        throw new Error('Academic year dates overlap with an existing academic year for this school');
      }
    }
    throw new Error(`Failed to create academic year: ${error.message}`);
  }

  return data;
}

/**
 * Update an academic year
 */
export async function updateAcademicYear(
  academicYearId: string, 
  updates: AcademicYearUpdate
): Promise<AcademicYear> {
  const supabase = createClient();
  
  // Validate dates if provided
  if (updates.start_date && updates.end_date) {
    const startDate = new Date(updates.start_date);
    const endDate = new Date(updates.end_date);
    
    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }
  }

  const { data, error } = await supabase
    .from('academic_years')
    .update(updates)
    .eq('id', academicYearId)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('academic_years_school_name_unique')) {
        throw new Error(`An academic year with the name "${updates.name}" already exists for this school`);
      }
      if (error.message.includes('academic_years_school_dates_unique')) {
        throw new Error('Academic year dates overlap with an existing academic year for this school');
      }
    }
    throw new Error(`Failed to update academic year: ${error.message}`);
  }

  return data;
}

/**
 * Delete an academic year and all its terms
 */
export async function deleteAcademicYear(academicYearId: string): Promise<void> {
  const supabase = createClient();
  
  // Check if there are any class offerings using terms from this academic year
  const { data: offerings } = await supabase
    .from('class_offerings')
    .select('id')
    .eq('terms.academic_year_id', academicYearId)
    .limit(1);

  if (offerings && offerings.length > 0) {
    throw new Error('Cannot delete academic year: it has class offerings associated with its terms');
  }

  // Delete terms first (cascade will handle this, but we'll be explicit)
  await supabase
    .from('terms')
    .delete()
    .eq('academic_year_id', academicYearId);

  // Delete academic year
  const { error } = await supabase
    .from('academic_years')
    .delete()
    .eq('id', academicYearId);

  if (error) {
    throw new Error(`Failed to delete academic year: ${error.message}`);
  }
}

/**
 * Create a new term
 */
export async function createTerm(termData: TermInsert): Promise<Term> {
  const supabase = createClient();
  
  // Validate dates
  const startDate = new Date(termData.start_date);
  const endDate = new Date(termData.end_date);
  
  if (endDate <= startDate) {
    throw new Error('Term end date must be after start date');
  }

  // Get academic year dates to validate term dates
  const { data: academicYear } = await supabase
    .from('academic_years')
    .select('start_date, end_date')
    .eq('id', termData.academic_year_id)
    .single();

  if (!academicYear) {
    throw new Error('Academic year not found');
  }

  const yearStart = new Date(academicYear.start_date);
  const yearEnd = new Date(academicYear.end_date);

  if (startDate < yearStart || endDate > yearEnd) {
    throw new Error('Term dates must be within the academic year dates');
  }

  const { data, error } = await supabase
    .from('terms')
    .insert(termData)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('terms_academic_year_name_unique')) {
        throw new Error(`A term with the name "${termData.name}" already exists in this academic year`);
      }
      if (error.message.includes('terms_academic_year_dates_unique')) {
        throw new Error('Term dates overlap with an existing term in this academic year');
      }
    }
    throw new Error(`Failed to create term: ${error.message}`);
  }

  return data;
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