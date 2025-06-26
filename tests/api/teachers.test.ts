import { generateTestTeacher, generateTestSchool, createMockSupabaseClient, createTestSuccess, createTestError } from '../utils/test-helpers'

// Mock the teachers API module
jest.mock('@/lib/api/teachers', () => ({
  createTeacher: jest.fn(),
  getTeachers: jest.fn(),
  getTeacherById: jest.fn(),
  updateTeacher: jest.fn(),
  deleteTeacher: jest.fn(),
  getTeachersBySchool: jest.fn(),
  assignTeacherToDepartment: jest.fn(),
  removeTeacherFromDepartment: jest.fn(),
}))

import { 
  createTeacher, 
  getTeachers, 
  getTeacherById, 
  updateTeacher, 
  deleteTeacher,
  getTeachersBySchool,
  assignTeacherToDepartment,
  removeTeacherFromDepartment
} from '@/lib/api/teachers'

describe('Teachers API', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    jest.clearAllMocks()
  })

  describe('createTeacher', () => {
    it('should create a teacher successfully', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const mockResponse = createTestSuccess(testTeacher)
      
      ;(createTeacher as jest.Mock).mockResolvedValue(mockResponse)

      const result = await createTeacher(testTeacher)

      expect(createTeacher).toHaveBeenCalledWith(testTeacher)
      expect(result).toEqual(mockResponse)
      expect(result.data).toEqual(testTeacher)
      expect(result.error).toBeNull()
    })

    it('should handle missing required fields', async () => {
      const invalidTeacher = { 
        first_name: 'John',
        email: 'john@test.com'
        // Missing last_name and school_id
      }
      const mockError = createTestError('Missing required fields: last_name, school_id')
      
      ;(createTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await createTeacher(invalidTeacher)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Missing required fields')
    })

    it('should handle invalid email format', async () => {
      const invalidTeacher = {
        ...generateTestTeacher('test-school-id'),
        email: 'invalid-email-format'
      }
      const mockError = createTestError('Invalid email format')
      
      ;(createTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await createTeacher(invalidTeacher)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Invalid email format')
    })

    it('should handle duplicate email', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const mockError = createTestError('Teacher with this email already exists', 409)
      
      ;(createTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await createTeacher(testTeacher)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
      expect(result.error.message).toContain('already exists')
    })

    it('should handle invalid max periods per week', async () => {
      const invalidTeacher = {
        ...generateTestTeacher('test-school-id'),
        max_periods_per_week: -5 // Invalid negative value
      }
      const mockError = createTestError('Max periods per week must be positive')
      
      ;(createTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await createTeacher(invalidTeacher)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be positive')
    })

    it('should handle non-existent school ID', async () => {
      const testTeacher = generateTestTeacher('non-existent-school-id')
      const mockError = createTestError('School not found', 404)
      
      ;(createTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await createTeacher(testTeacher)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })
  })

  describe('getTeachers', () => {
    it('should retrieve all teachers successfully', async () => {
      const testTeachers = [generateTestTeacher('school-1'), generateTestTeacher('school-2')]
      const mockResponse = createTestSuccess(testTeachers)
      
      ;(getTeachers as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getTeachers()

      expect(getTeachers).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
      expect(result.error).toBeNull()
    })

    it('should handle empty teachers list', async () => {
      const mockResponse = createTestSuccess([])
      
      ;(getTeachers as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getTeachers()

      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })

    it('should handle database errors when fetching teachers', async () => {
      const mockError = createTestError('Failed to fetch teachers', 500)
      
      ;(getTeachers as jest.Mock).mockRejectedValue(mockError)

      await expect(getTeachers()).rejects.toEqual(mockError)
    })
  })

  describe('getTeacherById', () => {
    it('should retrieve a teacher by ID successfully', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const mockResponse = createTestSuccess(testTeacher)
      
      ;(getTeacherById as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getTeacherById(testTeacher.id)

      expect(getTeacherById).toHaveBeenCalledWith(testTeacher.id)
      expect(result).toEqual(mockResponse)
      expect(result.data).toEqual(testTeacher)
      expect(result.error).toBeNull()
    })

    it('should handle non-existent teacher ID', async () => {
      const nonExistentId = 'non-existent-id'
      const mockError = createTestError('Teacher not found', 404)
      
      ;(getTeacherById as jest.Mock).mockResolvedValue(mockError)

      const result = await getTeacherById(nonExistentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
      expect(result.error.message).toBe('Teacher not found')
    })

    it('should handle invalid teacher ID format', async () => {
      const invalidId = 'invalid-uuid'
      const mockError = createTestError('Invalid teacher ID format', 400)
      
      ;(getTeacherById as jest.Mock).mockResolvedValue(mockError)

      const result = await getTeacherById(invalidId)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Invalid teacher ID format')
    })
  })

  describe('getTeachersBySchool', () => {
    it('should retrieve teachers by school ID successfully', async () => {
      const schoolId = 'test-school-id'
      const testTeachers = [generateTestTeacher(schoolId), generateTestTeacher(schoolId)]
      const mockResponse = createTestSuccess(testTeachers)
      
      ;(getTeachersBySchool as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getTeachersBySchool(schoolId)

      expect(getTeachersBySchool).toHaveBeenCalledWith(schoolId)
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
      expect(result.data.every(teacher => teacher.school_id === schoolId)).toBe(true)
    })

    it('should handle school with no teachers', async () => {
      const schoolId = 'empty-school-id'
      const mockResponse = createTestSuccess([])
      
      ;(getTeachersBySchool as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getTeachersBySchool(schoolId)

      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })

    it('should handle non-existent school ID', async () => {
      const nonExistentSchoolId = 'non-existent-school-id'
      const mockError = createTestError('School not found', 404)
      
      ;(getTeachersBySchool as jest.Mock).mockResolvedValue(mockError)

      const result = await getTeachersBySchool(nonExistentSchoolId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })
  })

  describe('updateTeacher', () => {
    it('should update a teacher successfully', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const updatedData = { first_name: 'Jane', last_name: 'Smith' }
      const updatedTeacher = { ...testTeacher, ...updatedData }
      const mockResponse = createTestSuccess(updatedTeacher)
      
      ;(updateTeacher as jest.Mock).mockResolvedValue(mockResponse)

      const result = await updateTeacher(testTeacher.id, updatedData)

      expect(updateTeacher).toHaveBeenCalledWith(testTeacher.id, updatedData)
      expect(result).toEqual(mockResponse)
      expect(result.data.first_name).toBe('Jane')
      expect(result.data.last_name).toBe('Smith')
      expect(result.error).toBeNull()
    })

    it('should handle updating non-existent teacher', async () => {
      const nonExistentId = 'non-existent-id'
      const updateData = { first_name: 'Updated Name' }
      const mockError = createTestError('Teacher not found', 404)
      
      ;(updateTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await updateTeacher(nonExistentId, updateData)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle invalid email update', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const invalidUpdateData = { email: 'invalid-email' }
      const mockError = createTestError('Invalid email format')
      
      ;(updateTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await updateTeacher(testTeacher.id, invalidUpdateData)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Invalid email format')
    })

    it('should handle duplicate email on update', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const updateData = { email: 'existing@email.com' }
      const mockError = createTestError('Email already exists', 409)
      
      ;(updateTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await updateTeacher(testTeacher.id, updateData)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
    })

    it('should handle partial updates', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const partialUpdate = { first_name: 'Partially Updated' }
      const updatedTeacher = { ...testTeacher, ...partialUpdate }
      const mockResponse = createTestSuccess(updatedTeacher)
      
      ;(updateTeacher as jest.Mock).mockResolvedValue(mockResponse)

      const result = await updateTeacher(testTeacher.id, partialUpdate)

      expect(result.data.first_name).toBe('Partially Updated')
      expect(result.data.last_name).toBe(testTeacher.last_name) // Should remain unchanged
    })
  })

  describe('deleteTeacher', () => {
    it('should delete a teacher successfully', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const mockResponse = createTestSuccess({ message: 'Teacher deleted successfully' })
      
      ;(deleteTeacher as jest.Mock).mockResolvedValue(mockResponse)

      const result = await deleteTeacher(testTeacher.id)

      expect(deleteTeacher).toHaveBeenCalledWith(testTeacher.id)
      expect(result).toEqual(mockResponse)
      expect(result.data.message).toBe('Teacher deleted successfully')
      expect(result.error).toBeNull()
    })

    it('should handle deleting non-existent teacher', async () => {
      const nonExistentId = 'non-existent-id'
      const mockError = createTestError('Teacher not found', 404)
      
      ;(deleteTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await deleteTeacher(nonExistentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle cascade delete constraints', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const mockError = createTestError('Cannot delete teacher with existing teaching assignments', 409)
      
      ;(deleteTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await deleteTeacher(testTeacher.id)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
      expect(result.error.message).toContain('Cannot delete teacher with existing')
    })
  })

  describe('assignTeacherToDepartment', () => {
    it('should assign teacher to department successfully', async () => {
      const teacherId = 'test-teacher-id'
      const departmentId = 'test-department-id'
      const mockResponse = createTestSuccess({ message: 'Teacher assigned to department successfully' })
      
      ;(assignTeacherToDepartment as jest.Mock).mockResolvedValue(mockResponse)

      const result = await assignTeacherToDepartment(teacherId, departmentId)

      expect(assignTeacherToDepartment).toHaveBeenCalledWith(teacherId, departmentId)
      expect(result).toEqual(mockResponse)
      expect(result.error).toBeNull()
    })

    it('should handle assigning to non-existent department', async () => {
      const teacherId = 'test-teacher-id'
      const nonExistentDepartmentId = 'non-existent-department-id'
      const mockError = createTestError('Department not found', 404)
      
      ;(assignTeacherToDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await assignTeacherToDepartment(teacherId, nonExistentDepartmentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle duplicate assignment', async () => {
      const teacherId = 'test-teacher-id'
      const departmentId = 'test-department-id'
      const mockError = createTestError('Teacher already assigned to this department', 409)
      
      ;(assignTeacherToDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await assignTeacherToDepartment(teacherId, departmentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
    })
  })

  describe('removeTeacherFromDepartment', () => {
    it('should remove teacher from department successfully', async () => {
      const teacherId = 'test-teacher-id'
      const departmentId = 'test-department-id'
      const mockResponse = createTestSuccess({ message: 'Teacher removed from department successfully' })
      
      ;(removeTeacherFromDepartment as jest.Mock).mockResolvedValue(mockResponse)

      const result = await removeTeacherFromDepartment(teacherId, departmentId)

      expect(removeTeacherFromDepartment).toHaveBeenCalledWith(teacherId, departmentId)
      expect(result).toEqual(mockResponse)
      expect(result.error).toBeNull()
    })

    it('should handle removing from non-existent assignment', async () => {
      const teacherId = 'test-teacher-id'
      const departmentId = 'test-department-id'
      const mockError = createTestError('Teacher not assigned to this department', 404)
      
      ;(removeTeacherFromDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await removeTeacherFromDepartment(teacherId, departmentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should validate name length', async () => {
      const invalidTeacher = {
        ...generateTestTeacher('test-school-id'),
        first_name: 'A'.repeat(101), // Too long
      }
      const mockError = createTestError('First name must be less than 100 characters')
      
      ;(createTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await createTeacher(invalidTeacher)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be less than 100 characters')
    })

    it('should handle concurrent updates', async () => {
      const testTeacher = generateTestTeacher('test-school-id')
      const mockError = createTestError('Teacher was modified by another user', 409)
      
      ;(updateTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await updateTeacher(testTeacher.id, { first_name: 'Concurrent Update' })

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
    })

    it('should validate max periods per week range', async () => {
      const invalidTeacher = {
        ...generateTestTeacher('test-school-id'),
        max_periods_per_week: 50, // Too high
      }
      const mockError = createTestError('Max periods per week must be between 1 and 40')
      
      ;(createTeacher as jest.Mock).mockResolvedValue(mockError)

      const result = await createTeacher(invalidTeacher)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be between 1 and 40')
    })
  })
}) 