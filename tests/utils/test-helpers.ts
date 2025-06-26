import { createClient } from '@supabase/supabase-js'
import { vi } from 'vitest'

// Test data generators
export const generateTestSchool = () => ({
  id: 'test-school-id',
  name: 'Test School',
  start_time: '08:00',
  end_time: '15:00',
  period_duration: 45,
  sessions_per_day: 8,
  working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
})

export const generateTestAcademicYear = (schoolId: string) => ({
  id: 'test-academic-year-id',
  school_id: schoolId,
  name: '2025-2026',
  start_date: '2025-06-01',
  end_date: '2026-05-31',
})

export const generateTestTerm = (academicYearId: string) => ({
  id: 'test-term-id',
  academic_year_id: academicYearId,
  name: 'Term 1',
  start_date: '2025-06-01',
  end_date: '2025-12-31',
  period_duration_minutes: 50,
})

export const generateTestDepartment = (schoolId: string) => ({
  id: 'test-department-id',
  name: 'Science',
  code: 'SCI100',
  description: 'Science Department',
  school_id: schoolId,
})

export const generateTestCourse = (schoolId: string, departmentId: string) => ({
  id: 'test-course-id',
  school_id: schoolId,
  name: 'Mathematics',
  code: 'MATH100',
  grade_level: 10,
  department_id: departmentId,
  total_hours_per_year: 120,
})

export const generateTestClass = (schoolId: string) => ({
  id: 'test-class-id',
  school_id: schoolId,
  grade_level: 10,
  name: 'Class 10A',
})

export const generateTestTeacher = (schoolId: string) => ({
  id: 'test-teacher-id',
  school_id: schoolId,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@test.com',
  max_periods_per_week: 20,
})

export const generateTestClassOffering = (termId: string, classId: string, courseId: string) => ({
  id: 'test-class-offering-id',
  term_id: termId,
  class_id: classId,
  course_id: courseId,
  periods_per_week: 5,
  required_hours_per_term: 90,
  assignment_type: 'ai',
})

export const generateTestTeachingAssignment = (classOfferingId: string, teacherId: string, schoolId: string) => ({
  id: 'test-teaching-assignment-id',
  class_offering_id: classOfferingId,
  teacher_id: teacherId,
  school_id: schoolId,
  assignment_type: 'manual',
})

export const generateTestTimeSlot = (schoolId: string) => ({
  id: 'test-time-slot-id',
  school_id: schoolId,
  day_of_week: 1,
  start_time: '09:00',
  end_time: '10:00',
  period_number: 1,
  is_teaching_period: true,
  slot_name: 'Period 1',
})

export const generateTestHoliday = (academicYearId: string, schoolId: string) => ({
  id: 'test-holiday-id',
  date: '2025-08-15',
  reason: 'Independence Day',
  academic_year_id: academicYearId,
  school_id: schoolId,
})

export const generateTestRoom = (schoolId: string) => ({
  id: 'test-room-id',
  school_id: schoolId,
  name: 'Room 101',
  capacity: 40,
  room_type: 'classroom',
  is_active: true,
})

// Mock Supabase client for testing
export const createMockSupabaseClient = () => {
  const mockClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
          limit: vi.fn(),
        })),
        order: vi.fn(),
        limit: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
  }
  
  return mockClient
}

// Test error responses
export const createTestError = (message: string, status: number = 400) => ({
  error: {
    message,
    status,
  },
})

// Test success responses
export const createTestSuccess = (data: any) => ({
  data,
  error: null,
})

// Wait utility for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Clean up test data
export const cleanupTestData = async (supabase: any) => {
  // This would be implemented based on your actual cleanup needs
  console.log('Cleaning up test data...')
} 