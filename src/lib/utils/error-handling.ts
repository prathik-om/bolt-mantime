import { handleDatabaseError, getErrorType, getErrorSuggestion } from '@/utils/supabase/error-handler';

// Enhanced error mapping for new constraints
export const mapConstraintError = (error: any): string => {
  const code = error?.code;
  const message = error?.message || '';

  // Foreign Key Violations (23503)
  if (code === '23503') {
    if (message.includes('term_id')) {
      return 'The selected term no longer exists. Please refresh and try again.';
    }
    if (message.includes('school_id')) {
      return 'The selected school no longer exists. Please refresh and try again.';
    }
    if (message.includes('academic_year_id')) {
      return 'The selected academic year no longer exists. Please refresh and try again.';
    }
    if (message.includes('department_id')) {
      return 'The selected department no longer exists. Please refresh and try again.';
    }
    if (message.includes('teacher_id')) {
      return 'The selected teacher no longer exists. Please refresh and try again.';
    }
    if (message.includes('course_id')) {
      return 'The selected course no longer exists. Please refresh and try again.';
    }
    if (message.includes('class_id')) {
      return 'The selected class no longer exists. Please refresh and try again.';
    }
    if (message.includes('teaching_assignment_id')) {
      return 'The selected teaching assignment no longer exists. Please refresh and try again.';
    }
    if (message.includes('time_slot_id')) {
      return 'The selected time slot no longer exists. Please refresh and try again.';
    }
    return 'A referenced item no longer exists. Please refresh and try again.';
  }

  // Unique Constraint Violations (23505)
  if (code === '23505') {
    if (message.includes('schools_school_id_name_key')) {
      return 'A school with this name already exists.';
    }
    if (message.includes('academic_years_school_id_name_key')) {
      return 'An academic year with this name already exists in your school.';
    }
    if (message.includes('academic_years_school_dates_unique')) {
      return 'Academic year dates overlap with an existing academic year for this school.';
    }
    if (message.includes('classes_school_id_grade_level_name_key')) {
      return 'A class with this name already exists in this grade level.';
    }
    if (message.includes('departments_school_id_name_key')) {
      return 'A department with this name already exists in your school.';
    }
    if (message.includes('departments_school_id_code_key')) {
      return 'A department with this code already exists in your school.';
    }
    if (message.includes('courses_school_id_name_key')) {
      return 'A course with this name already exists in your school.';
    }
    if (message.includes('courses_school_id_code_key')) {
      return 'A course with this code already exists in your school.';
    }
    if (message.includes('teachers_school_id_email_key')) {
      return 'A teacher with this email already exists in your school.';
    }
    if (message.includes('rooms_school_id_name_key')) {
      return 'A room with this name already exists in your school.';
    }
    if (message.includes('time_slots_school_id_day_of_week_start_time_key')) {
      return 'A time slot already exists for this day and start time.';
    }
    if (message.includes('teacher_departments_teacher_department_unique')) {
      return 'This teacher is already assigned to this department.';
    }
    if (message.includes('class_offerings_course_id_class_id_term_id_key')) {
      return 'This course is already offered to this class in this term.';
    }
    if (message.includes('teaching_assignments_class_offering_id_teacher_id_key')) {
      return 'This teacher is already assigned to teach this class offering.';
    }
    if (message.includes('terms_academic_year_name_unique')) {
      return 'A term with this name already exists in this academic year.';
    }
    if (message.includes('terms_academic_year_dates_unique')) {
      return 'Term dates overlap with an existing term in this academic year.';
    }
    if (message.includes('holidays_date_key')) {
      return 'A holiday already exists on this date.';
    }
    if (message.includes('breaks_term_id_date_key')) {
      return 'A break already exists on this date for this term.';
    }
    return 'This item already exists. Please use a different value.';
  }

  // Check Constraint Violations (23514)
  if (code === '23514') {
    if (message.includes('academic_years_date_check')) {
      return 'Academic year end date must be after start date.';
    }
    if (message.includes('terms_date_check')) {
      return 'Term end date must be after start date.';
    }
    if (message.includes('time_slots_time_check')) {
      return 'Time slot end time must be after start time.';
    }
    if (message.includes('time_slots_day_of_week_check')) {
      return 'Day of week must be between 1 (Monday) and 7 (Sunday).';
    }
    if (message.includes('terms_period_duration_check')) {
      return 'Period duration must be between 30 and 120 minutes.';
    }
    if (message.includes('courses_grade_level_check')) {
      return 'Grade level must be between 1 and 12.';
    }
    if (message.includes('classes_grade_level_check')) {
      return 'Grade level must be between 1 and 12.';
    }
    if (message.includes('teachers_grade_level_check')) {
      return 'Grade level must be between 1 and 12.';
    }
    if (message.includes('class_offerings_periods_per_week_check')) {
      return 'Periods per week must be between 1 and 20.';
    }
    if (message.includes('class_offerings_required_hours_check')) {
      return 'Required hours per term must be positive.';
    }
    if (message.includes('teaching_assignments_hours_per_week_check')) {
      return 'Hours per week must be between 1 and 40.';
    }
    if (message.includes('working_days_config_periods_per_day_check')) {
      return 'Periods per day must be between 1 and 10.';
    }
    if (message.includes('working_days_config_period_duration_check')) {
      return 'Period duration must be between 15 and 120 minutes.';
    }
    if (message.includes('working_days_config_hours_per_day_check')) {
      return 'Hours per day must be between 1 and 12.';
    }
    if (message.includes('working_days_config_working_days_check')) {
      return 'Working days per week must be between 1 and 7.';
    }
    return 'The provided data does not meet the required constraints.';
  }

  // Custom Validation Errors (P0001)
  if (code === 'P0001') {
    if (message.includes('Time slot overlaps')) {
      return 'This time slot overlaps with an existing slot. Please choose a different time.';
    }
    if (message.includes('Term dates must fall within the academic year')) {
      return 'Term dates must fall within the academic year dates.';
    }
    if (message.includes('Holiday date must fall within the term dates')) {
      return 'Holiday date must fall within the term dates.';
    }
    if (message.includes('Break date must fall within the term dates')) {
      return 'Break date must fall within the term dates.';
    }
    if (message.includes('Teacher workload exceeds maximum')) {
      return 'This assignment would exceed the teacher\'s maximum workload. Please reduce hours or assign to another teacher.';
    }
    if (message.includes('Class offering hours mismatch')) {
      return 'The total teaching hours do not match the class offering requirements.';
    }
    if (message.includes('Grade level mismatch')) {
      return 'The grade levels of the class and course do not match.';
    }
    if (message.includes('School consistency check failed')) {
      return 'All items must belong to the same school.';
    }
    if (message.includes('Periods per week validation failed')) {
      return 'The periods per week must be consistent with the course requirements.';
    }
    if (message.includes('Working days configuration invalid')) {
      return 'The working days configuration is invalid. Please check your settings.';
    }
    return message;
  }

  return handleDatabaseError(error);
};

// Form validation helpers
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateLength = (value: string, fieldName: string, min: number, max: number): string | null => {
  if (value && (value.length < min || value.length > max)) {
    return `${fieldName} must be between ${min} and ${max} characters`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validateDateRange = (startDate: string, endDate: string): string | null => {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return 'End date must be after start date';
    }
  }
  return null;
};

export const validateNumberRange = (value: number, fieldName: string, min: number, max: number): string | null => {
  if (value < min || value > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  return null;
};

export const validatePositiveNumber = (value: number, fieldName: string): string | null => {
  if (value <= 0) {
    return `${fieldName} must be greater than 0`;
  }
  return null;
};

export const validateGradeLevel = (gradeLevel: number): string | null => {
  return validateNumberRange(gradeLevel, 'Grade level', 1, 12);
};

export const validatePeriodsPerWeek = (periods: number): string | null => {
  return validateNumberRange(periods, 'Periods per week', 1, 20);
};

export const validatePeriodDuration = (duration: number): string | null => {
  return validateNumberRange(duration, 'Period duration', 15, 120);
};

export const validateHoursPerWeek = (hours: number): string | null => {
  return validateNumberRange(hours, 'Hours per week', 1, 40);
};

// Enhanced error display with suggestions
export const displayError = (error: any, toast: any): void => {
  const userMessage = mapConstraintError(error);
  const suggestion = getErrorSuggestion(error);
  const errorType = getErrorType(error);
  
  let fullMessage = userMessage;
  if (suggestion) {
    fullMessage += ` ${suggestion}`;
  }
  
  // Use different toast styles based on error type
  switch (errorType) {
    case 'validation':
      toast.error(fullMessage, {
        description: 'Please check your input and try again.',
        duration: 5000,
      });
      break;
    
    case 'unique':
      toast.error(fullMessage, {
        description: 'Please use a different value for this field.',
        duration: 4000,
      });
      break;
    
    case 'foreign_key':
      toast.error(fullMessage, {
        description: 'The referenced item may have been deleted. Please refresh the page.',
        duration: 6000,
      });
      break;
    
    default:
      toast.error(fullMessage, {
        duration: 4000,
      });
  }
};

// Field-specific error mapping
export const getFieldError = (error: any): { field?: string; message: string } => {
  const message = mapConstraintError(error);
  
  // Map common error patterns to specific fields
  if (error?.message?.includes('name')) {
    return { field: 'name', message };
  }
  
  if (error?.message?.includes('email')) {
    return { field: 'email', message };
  }
  
  if (error?.message?.includes('code')) {
    return { field: 'code', message };
  }
  
  if (error?.message?.includes('start_date') || error?.message?.includes('end_date')) {
    return { field: 'dates', message };
  }
  
  if (error?.message?.includes('periods_per_week')) {
    return { field: 'periods_per_week', message };
  }
  
  if (error?.message?.includes('grade_level')) {
    return { field: 'grade_level', message };
  }
  
  if (error?.message?.includes('department_id')) {
    return { field: 'department_id', message };
  }
  
  if (error?.message?.includes('teacher_id')) {
    return { field: 'teacher_id', message };
  }
  
  if (error?.message?.includes('class_id')) {
    return { field: 'class_id', message: 'Invalid class selection' };
  }
  
  if (error?.message?.includes('course_id')) {
    return { field: 'course_id', message };
  }
  
  return { message };
};

// Comprehensive form validation for common entities
export const validateSchoolForm = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const nameError = validateRequired(data.name, 'School name');
  if (nameError) errors.name = nameError;
  
  const lengthError = validateLength(data.name, 'School name', 2, 100);
  if (lengthError) errors.name = lengthError;
  
  if (data.working_days && data.working_days.length === 0) {
    errors.working_days = 'At least one working day must be selected';
  }
  
  return errors;
};

export const validateAcademicYearForm = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const nameError = validateRequired(data.name, 'Academic year name');
  if (nameError) errors.name = nameError;
  
  const dateError = validateDateRange(data.start_date, data.end_date);
  if (dateError) errors.dates = dateError;
  
  return errors;
};

export const validateTermForm = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const nameError = validateRequired(data.name, 'Term name');
  if (nameError) errors.name = nameError;
  
  const dateError = validateDateRange(data.start_date, data.end_date);
  if (dateError) errors.dates = dateError;
  
  const durationError = validatePeriodDuration(data.period_duration_minutes);
  if (durationError) errors.period_duration_minutes = durationError;
  
  return errors;
};

export const validateDepartmentForm = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const nameError = validateRequired(data.name, 'Department name');
  if (nameError) errors.name = nameError;
  
  const nameLengthError = validateLength(data.name, 'Department name', 1, 100);
  if (nameLengthError) errors.name = nameLengthError;
  
  if (data.code) {
    const codeLengthError = validateLength(data.code, 'Department code', 1, 20);
    if (codeLengthError) errors.code = codeLengthError;
  }
  
  if (data.description) {
    const descLengthError = validateLength(data.description, 'Description', 0, 500);
    if (descLengthError) errors.description = descLengthError;
  }
  
  return errors;
};

export const validateCourseForm = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const nameError = validateRequired(data.name, 'Course name');
  if (nameError) errors.name = nameError;
  
  const nameLengthError = validateLength(data.name, 'Course name', 1, 100);
  if (nameLengthError) errors.name = nameLengthError;
  
  if (data.code) {
    const codeLengthError = validateLength(data.code, 'Course code', 1, 20);
    if (codeLengthError) errors.code = codeLengthError;
  }
  
  const gradeError = validateGradeLevel(data.grade_level);
  if (gradeError) errors.grade_level = gradeError;
  
  const hoursError = validatePositiveNumber(data.total_hours_per_year, 'Total hours per year');
  if (hoursError) errors.total_hours_per_year = hoursError;
  
  return errors;
};

export const validateTeacherForm = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const nameError = validateRequired(data.name, 'Teacher name');
  if (nameError) errors.name = nameError;
  
  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;
  
  const gradeError = validateGradeLevel(data.grade_level);
  if (gradeError) errors.grade_level = gradeError;
  
  return errors;
};

export const validateClassOfferingForm = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const periodsError = validatePeriodsPerWeek(data.periods_per_week);
  if (periodsError) errors.periods_per_week = periodsError;
  
  if (data.required_hours_per_term !== null && data.required_hours_per_term !== undefined) {
    const hoursError = validatePositiveNumber(data.required_hours_per_term, 'Required hours per term');
    if (hoursError) errors.required_hours_per_term = hoursError;
  }
  
  return errors;
};

export const validateTeachingAssignmentForm = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const hoursError = validateHoursPerWeek(data.hours_per_week);
  if (hoursError) errors.hours_per_week = hoursError;
  
  return errors;
}; 