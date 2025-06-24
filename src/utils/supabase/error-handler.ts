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
  
  if (message.includes('classes_school_id_grade_level_name_key')) {
    return 'A class with this name already exists in this grade level.';
  }
  
  if (message.includes('departments_school_id_name_key')) {
    return 'A department with this name already exists in your school.';
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
  
  if (message.includes('holidays_date_key')) {
    return 'A holiday already exists on this date.';
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
  
  if (message.includes('Scheduled lesson date must fall within the term dates')) {
    return 'Scheduled lesson date must fall within the term dates.';
  }
  
  if (message.includes('Admin users must have a school_id')) {
    return 'Admin users must be associated with a school. Please contact support.';
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