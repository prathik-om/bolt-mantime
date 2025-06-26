/**
 * Type helper utilities for database types
 * Generated on: $(date)
 */

import { Database } from './database'

// Type helpers for table rows
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type TableRelations<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Relationships']

// Type helpers for enums
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Common table types
export type Teacher = Tables<'teachers'>
export type TeacherInsert = TablesInsert<'teachers'>
export type TeacherUpdate = TablesUpdate<'teachers'>

export type School = Tables<'schools'>
export type SchoolInsert = TablesInsert<'schools'>
export type SchoolUpdate = TablesUpdate<'schools'>

export type Department = Tables<'departments'>
export type DepartmentInsert = TablesInsert<'departments'>
export type DepartmentUpdate = TablesUpdate<'departments'>

export type TeacherDepartment = Tables<'teacher_departments'>
export type TeacherDepartmentInsert = TablesInsert<'teacher_departments'>
export type TeacherDepartmentUpdate = TablesUpdate<'teacher_departments'>

export type Course = Tables<'courses'>
export type CourseInsert = TablesInsert<'courses'>
export type CourseUpdate = TablesUpdate<'courses'>

export type Class = Tables<'classes'>
export type ClassInsert = TablesInsert<'classes'>
export type ClassUpdate = TablesUpdate<'classes'>

export type ClassOffering = Tables<'class_offerings'>
export type ClassOfferingInsert = TablesInsert<'class_offerings'>
export type ClassOfferingUpdate = TablesUpdate<'class_offerings'>

export type TeachingAssignment = Tables<'teaching_assignments'>
export type TeachingAssignmentInsert = TablesInsert<'teaching_assignments'>
export type TeachingAssignmentUpdate = TablesUpdate<'teaching_assignments'>

export type TimeSlot = Tables<'time_slots'>
export type TimeSlotInsert = TablesInsert<'time_slots'>
export type TimeSlotUpdate = TablesUpdate<'time_slots'>

export type Break = Tables<'breaks'>
export type BreakInsert = TablesInsert<'breaks'>
export type BreakUpdate = TablesUpdate<'breaks'>

export type AcademicYear = Tables<'academic_years'>
export type AcademicYearInsert = TablesInsert<'academic_years'>
export type AcademicYearUpdate = TablesUpdate<'academic_years'>

export type Term = Tables<'terms'>
export type TermInsert = TablesInsert<'terms'>
export type TermUpdate = TablesUpdate<'terms'>

export type Holiday = Tables<'holidays'>
export type HolidayInsert = TablesInsert<'holidays'>
export type HolidayUpdate = TablesUpdate<'holidays'>

export type Profile = Tables<'profiles'>
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>

export type TimetableGeneration = Tables<'timetable_generations'>
export type TimetableGenerationInsert = TablesInsert<'timetable_generations'>
export type TimetableGenerationUpdate = TablesUpdate<'timetable_generations'>

// Enum Types
export type DayOfWeek = Enums<'day_of_week'>
export type TimeSlotType = Enums<'time_slot_type'>
export type TimetableStatus = Enums<'timetable_status'>

// Utility Types for Common Relationships
export type TeacherWithDepartments = Teacher & {
  departments: Department[]
  primary_department?: Department
}

export type DepartmentWithTeachers = Department & {
  teachers: Teacher[]
}

export type ClassOfferingWithDetails = ClassOffering & {
  class: Class
  course: Course
  term: Term
  teaching_assignments: TeachingAssignment[]
}

export type TeachingAssignmentWithDetails = TeachingAssignment & {
  teacher: Teacher
  class_offering: ClassOffering & {
    class: Class
    course: Course
  }
}

export type TimeSlotWithBreaks = TimeSlot & {
  breaks: Break[]
}

export type TermWithHolidays = Term & {
  holidays: Holiday[]
  academic_year: AcademicYear
}

// Utility type for handling nullable fields
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>
}

// Utility type for partial updates with specific fields
export type PartialUpdate<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>

// Utility type for response with pagination
export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Utility type for API error responses
export type ApiError = {
  code: string
  message: string
  details?: Record<string, any>
}

// Utility type for API success responses
export type ApiSuccess<T> = {
  data: T
  message?: string
}

// Utility type for API responses
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// Type guard for API responses
export function isApiError(response: any): response is ApiError {
  return 'code' in response && 'message' in response
}

// Type guard for checking if a field exists in a table
export function hasField<T extends keyof Database['public']['Tables']>(
  table: T,
  field: keyof Database['public']['Tables'][T]['Row']
): boolean {
  return field in Database['public']['Tables'][table]['Row']
}

export type TimetableGenerationStatus = 'draft' | 'generating' | 'completed' | 'failed' | 'published'

export interface TimetableGeneration {
  id: string
  term_id: string
  generated_by: string
  generated_at: string
  status: TimetableGenerationStatus
  notes: string | null
  scheduled_lessons: number
  total_offerings: number
}

export interface ScheduledLesson {
  id: number
  teaching_assignment_id: string
  date: string
  timeslot_id: string
  timetable_generation_id: string
}

export interface ValidationResult {
  isValid: boolean
  message: string
  details?: {
    teacher_conflicts?: number
    class_conflicts?: number
    room_conflicts?: number
    holiday_conflicts?: number
    term_date_violations?: number
  }
}

// Re-export other types from database.ts
export type {
  School,
  Teacher,
  Class,
  Course,
  Term,
  TimeSlot,
  Room,
  Department,
  TeachingAssignment,
  ClassOffering,
  Break,
  Holiday
} from './database' 