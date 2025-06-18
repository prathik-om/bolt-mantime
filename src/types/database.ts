import { Database } from '@/lib/database.types'

// Core entity types
export type School = Database['public']['Tables']['schools']['Row']
export type AcademicYear = Database['public']['Tables']['academic_years']['Row']
export type Term = Database['public']['Tables']['terms']['Row']
export type Teacher = Database['public']['Tables']['teachers']['Row']
export type Subject = Database['public']['Tables']['subjects']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']
export type ClassSection = Database['public']['Tables']['class_sections']['Row']
export type TimeSlot = Database['public']['Tables']['time_slots']['Row']
export type Holiday = Database['public']['Tables']['holidays']['Row']

// Relationship types
export type TeacherQualification = Database['public']['Tables']['teacher_qualifications']['Row']
export type ClassOffering = Database['public']['Tables']['class_offerings']['Row']
export type TeachingAssignment = Database['public']['Tables']['teaching_assignments']['Row']

// Timetable types
export type TimetableGeneration = Database['public']['Tables']['timetable_generations']['Row']
export type ScheduledLesson = Database['public']['Tables']['scheduled_lessons']['Row']

// Insert types for forms
export type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
export type SubjectInsert = Database['public']['Tables']['subjects']['Insert']
export type ClassSectionInsert = Database['public']['Tables']['class_sections']['Insert']
export type TimeSlotInsert = Database['public']['Tables']['time_slots']['Insert']
export type ClassOfferingInsert = Database['public']['Tables']['class_offerings']['Insert']
export type TeachingAssignmentInsert = Database['public']['Tables']['teaching_assignments']['Insert']
export type TimetableGenerationInsert = Database['public']['Tables']['timetable_generations']['Insert']

// Extended types with relationships
export interface TeacherWithQualifications extends Teacher {
  qualifications: (TeacherQualification & { subject: Subject })[]
}

export interface ClassOfferingWithDetails extends ClassOffering {
  class_section: ClassSection
  subject: Subject
  term: Term
  teaching_assignments: (TeachingAssignment & { teacher: Teacher })[]
}

export interface ScheduledLessonWithDetails extends ScheduledLesson {
  teaching_assignment: TeachingAssignment & {
    class_offering: ClassOfferingWithDetails
    teacher: Teacher
  }
  room?: Room
  time_slot: TimeSlot
}

export interface TimetableGenerationWithDetails extends TimetableGeneration {
  lessons: ScheduledLessonWithDetails[]
  term: Term
}

// Utility types for the application
export interface ScheduleView {
  type: 'class' | 'teacher' | 'room'
  id: string
  name: string
}

export interface ConflictSummary {
  total: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
}

export interface OptimizationMetrics {
  teacherWorkloadBalance: number
  roomUtilization: number
  consecutivePeriodCompliance: number
  constraintViolations: number
  overallScore: number
}

// Form data types
export interface TeacherFormData {
  first_name: string
  last_name: string
  email: string
  employment_type: string
  max_periods_per_week: number
  qualifications: string[]
}

export interface SubjectFormData {
  name: string
  code: string
  subject_type: string
  required_room_type: string | null
}

export interface ClassSectionFormData {
  grade_level: number
  name: string
  student_count: number
  class_teacher_id: string | null
}

export interface RoomFormData {
  name: string
  capacity: number
  room_type: string
}