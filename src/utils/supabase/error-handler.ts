// Enhanced error handling for database constraints and validations
// Maps PostgreSQL error codes to user-friendly messages

export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export const handleDatabaseError = (error: any): string => {
  console.error('Database error:', error);
  
  if (error?.code) {
    return mapErrorCodeToMessage(error.code, error.message, error.details);
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

const mapErrorCodeToMessage = (code: string, message: string, details?: string): string => {
  switch (code) {
    // Foreign Key Violations
    case '23503':
      return handleForeignKeyViolation(message);
    
    // Unique Constraint Violations
    case '23505':
      return handleUniqueConstraintViolation(message);
    
    // Check Constraint Violations
    case '23514':
      return handleCheckConstraintViolation(message);
    
    // Custom trigger exceptions
    case 'P0001':
      return handleCustomValidationError(message);
    
    default:
      return message || 'An unexpected error occurred';
  }
};

const handleForeignKeyViolation = (message: string): string => {
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
};

const handleUniqueConstraintViolation = (message: string): string => {
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
};

const handleCheckConstraintViolation = (message: string): string => {
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
  
  if (message.includes('profiles_role_check')) {
    return 'User role must be either "admin" or "teacher".';
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
};

const handleCustomValidationError = (message: string): string => {
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
  
  if (message.includes('Scheduled lesson date must fall within the term dates')) {
    return 'Scheduled lesson date must fall within the term dates.';
  }
  
  if (message.includes('Admin users must have a school_id')) {
    return 'Admin users must be associated with a school. Please contact support.';
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
};

// Helper function to check if error is a specific type
export const isForeignKeyError = (error: any): boolean => {
  return error?.code === '23503';
};

export const isUniqueConstraintError = (error: any): boolean => {
  return error?.code === '23505';
};

export const isCheckConstraintError = (error: any): boolean => {
  return error?.code === '23514';
};

export const isCustomValidationError = (error: any): boolean => {
  return error?.code === 'P0001';
};

// Helper function to get error type for UI handling
export const getErrorType = (error: any): 'validation' | 'constraint' | 'foreign_key' | 'unique' | 'unknown' => {
  if (isCustomValidationError(error) || isCheckConstraintError(error)) {
    return 'validation';
  }
  
  if (isForeignKeyError(error)) {
    return 'foreign_key';
  }
  
  if (isUniqueConstraintError(error)) {
    return 'unique';
  }
  
  return 'unknown';
};

// Helper function to suggest actions based on error type
export const getErrorSuggestion = (error: any): string | null => {
  const errorType = getErrorType(error);
  
  switch (errorType) {
    case 'validation':
      return 'Please check your input and try again.';
    
    case 'foreign_key':
      return 'The referenced item may have been deleted. Please refresh the page.';
    
    case 'unique':
      return 'Please use a different value for this field.';
    
    case 'constraint':
      return 'Please fill in all required fields.';
    
    default:
      return null;
  }
};

// Enhanced error handling with field-specific mapping
export const getFieldError = (error: any): { field?: string; message: string } => {
  const message = handleDatabaseError(error);
  
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
  
  if (error?.message?.includes('class_section_id')) {
    return { field: 'class_section_id', message };
  }
  
  if (error?.message?.includes('course_id')) {
    return { field: 'course_id', message };
  }
  
  return { message };
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

// Enhanced error display with suggestions
export const displayError = (error: any, toast: any): void => {
  const userMessage = handleDatabaseError(error);
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