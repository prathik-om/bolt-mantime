import { generateTestDepartment, generateTestSchool, createMockSupabaseClient, createTestSuccess, createTestError } from '../utils/test-helpers'

// Mock the departments API module
jest.mock('@/lib/api/departments', () => ({
  createDepartment: jest.fn(),
  getDepartments: jest.fn(),
  getDepartmentById: jest.fn(),
  updateDepartment: jest.fn(),
  deleteDepartment: jest.fn(),
  getDepartmentsBySchool: jest.fn(),
  getDepartmentWithTeachers: jest.fn(),
}))

import { 
  createDepartment, 
  getDepartments, 
  getDepartmentById, 
  updateDepartment, 
  deleteDepartment,
  getDepartmentsBySchool,
  getDepartmentWithTeachers
} from '@/lib/api/departments'

describe('Departments API', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    jest.clearAllMocks()
  })

  describe('createDepartment', () => {
    it('should create a department successfully', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const mockResponse = createTestSuccess(testDepartment)
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockResponse)

      const result = await createDepartment(testDepartment)

      expect(createDepartment).toHaveBeenCalledWith(testDepartment)
      expect(result).toEqual(mockResponse)
      expect(result.data).toEqual(testDepartment)
      expect(result.error).toBeNull()
    })

    it('should handle missing required fields', async () => {
      const invalidDepartment = { 
        name: 'Science Department'
        // Missing school_id and code
      }
      const mockError = createTestError('Missing required fields: school_id, code')
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await createDepartment(invalidDepartment)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Missing required fields')
    })

    it('should handle duplicate department code', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const mockError = createTestError('Department code already exists in this school', 409)
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await createDepartment(testDepartment)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
      expect(result.error.message).toContain('already exists')
    })

    it('should handle duplicate department name', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const mockError = createTestError('Department name already exists in this school', 409)
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await createDepartment(testDepartment)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
      expect(result.error.message).toContain('already exists')
    })

    it('should handle non-existent school ID', async () => {
      const testDepartment = generateTestDepartment('non-existent-school-id')
      const mockError = createTestError('School not found', 404)
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await createDepartment(testDepartment)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle invalid department code format', async () => {
      const invalidDepartment = {
        ...generateTestDepartment('test-school-id'),
        code: 'INVALID_CODE_123' // Too long or invalid format
      }
      const mockError = createTestError('Department code must be 2-10 characters and contain only letters and numbers')
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await createDepartment(invalidDepartment)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Department code must be')
    })
  })

  describe('getDepartments', () => {
    it('should retrieve all departments successfully', async () => {
      const testDepartments = [generateTestDepartment('school-1'), generateTestDepartment('school-2')]
      const mockResponse = createTestSuccess(testDepartments)
      
      ;(getDepartments as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getDepartments()

      expect(getDepartments).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
      expect(result.error).toBeNull()
    })

    it('should handle empty departments list', async () => {
      const mockResponse = createTestSuccess([])
      
      ;(getDepartments as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getDepartments()

      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })

    it('should handle database errors when fetching departments', async () => {
      const mockError = createTestError('Failed to fetch departments', 500)
      
      ;(getDepartments as jest.Mock).mockRejectedValue(mockError)

      await expect(getDepartments()).rejects.toEqual(mockError)
    })
  })

  describe('getDepartmentById', () => {
    it('should retrieve a department by ID successfully', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const mockResponse = createTestSuccess(testDepartment)
      
      ;(getDepartmentById as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getDepartmentById(testDepartment.id)

      expect(getDepartmentById).toHaveBeenCalledWith(testDepartment.id)
      expect(result).toEqual(mockResponse)
      expect(result.data).toEqual(testDepartment)
      expect(result.error).toBeNull()
    })

    it('should handle non-existent department ID', async () => {
      const nonExistentId = 'non-existent-id'
      const mockError = createTestError('Department not found', 404)
      
      ;(getDepartmentById as jest.Mock).mockResolvedValue(mockError)

      const result = await getDepartmentById(nonExistentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
      expect(result.error.message).toBe('Department not found')
    })

    it('should handle invalid department ID format', async () => {
      const invalidId = 'invalid-uuid'
      const mockError = createTestError('Invalid department ID format', 400)
      
      ;(getDepartmentById as jest.Mock).mockResolvedValue(mockError)

      const result = await getDepartmentById(invalidId)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Invalid department ID format')
    })
  })

  describe('getDepartmentsBySchool', () => {
    it('should retrieve departments by school ID successfully', async () => {
      const schoolId = 'test-school-id'
      const testDepartments = [generateTestDepartment(schoolId), generateTestDepartment(schoolId)]
      const mockResponse = createTestSuccess(testDepartments)
      
      ;(getDepartmentsBySchool as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getDepartmentsBySchool(schoolId)

      expect(getDepartmentsBySchool).toHaveBeenCalledWith(schoolId)
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
      expect(result.data.every(dept => dept.school_id === schoolId)).toBe(true)
    })

    it('should handle school with no departments', async () => {
      const schoolId = 'empty-school-id'
      const mockResponse = createTestSuccess([])
      
      ;(getDepartmentsBySchool as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getDepartmentsBySchool(schoolId)

      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })

    it('should handle non-existent school ID', async () => {
      const nonExistentSchoolId = 'non-existent-school-id'
      const mockError = createTestError('School not found', 404)
      
      ;(getDepartmentsBySchool as jest.Mock).mockResolvedValue(mockError)

      const result = await getDepartmentsBySchool(nonExistentSchoolId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })
  })

  describe('getDepartmentWithTeachers', () => {
    it('should retrieve department with teachers successfully', async () => {
      const departmentId = 'test-department-id'
      const departmentWithTeachers = {
        ...generateTestDepartment('test-school-id'),
        teachers: [
          { id: 'teacher-1', first_name: 'John', last_name: 'Doe' },
          { id: 'teacher-2', first_name: 'Jane', last_name: 'Smith' }
        ]
      }
      const mockResponse = createTestSuccess(departmentWithTeachers)
      
      ;(getDepartmentWithTeachers as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getDepartmentWithTeachers(departmentId)

      expect(getDepartmentWithTeachers).toHaveBeenCalledWith(departmentId)
      expect(result).toEqual(mockResponse)
      expect(result.data.teachers).toHaveLength(2)
      expect(result.error).toBeNull()
    })

    it('should handle department with no teachers', async () => {
      const departmentId = 'empty-department-id'
      const departmentWithNoTeachers = {
        ...generateTestDepartment('test-school-id'),
        teachers: []
      }
      const mockResponse = createTestSuccess(departmentWithNoTeachers)
      
      ;(getDepartmentWithTeachers as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getDepartmentWithTeachers(departmentId)

      expect(result.data.teachers).toHaveLength(0)
      expect(result.error).toBeNull()
    })

    it('should handle non-existent department ID', async () => {
      const nonExistentId = 'non-existent-id'
      const mockError = createTestError('Department not found', 404)
      
      ;(getDepartmentWithTeachers as jest.Mock).mockResolvedValue(mockError)

      const result = await getDepartmentWithTeachers(nonExistentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })
  })

  describe('updateDepartment', () => {
    it('should update a department successfully', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const updatedData = { name: 'Updated Science Department', description: 'Updated description' }
      const updatedDepartment = { ...testDepartment, ...updatedData }
      const mockResponse = createTestSuccess(updatedDepartment)
      
      ;(updateDepartment as jest.Mock).mockResolvedValue(mockResponse)

      const result = await updateDepartment(testDepartment.id, updatedData)

      expect(updateDepartment).toHaveBeenCalledWith(testDepartment.id, updatedData)
      expect(result).toEqual(mockResponse)
      expect(result.data.name).toBe('Updated Science Department')
      expect(result.data.description).toBe('Updated description')
      expect(result.error).toBeNull()
    })

    it('should handle updating non-existent department', async () => {
      const nonExistentId = 'non-existent-id'
      const updateData = { name: 'Updated Name' }
      const mockError = createTestError('Department not found', 404)
      
      ;(updateDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await updateDepartment(nonExistentId, updateData)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle duplicate name on update', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const updateData = { name: 'Existing Department Name' }
      const mockError = createTestError('Department name already exists in this school', 409)
      
      ;(updateDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await updateDepartment(testDepartment.id, updateData)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
    })

    it('should handle duplicate code on update', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const updateData = { code: 'EXISTING' }
      const mockError = createTestError('Department code already exists in this school', 409)
      
      ;(updateDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await updateDepartment(testDepartment.id, updateData)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
    })

    it('should handle partial updates', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const partialUpdate = { name: 'Partially Updated Department' }
      const updatedDepartment = { ...testDepartment, ...partialUpdate }
      const mockResponse = createTestSuccess(updatedDepartment)
      
      ;(updateDepartment as jest.Mock).mockResolvedValue(mockResponse)

      const result = await updateDepartment(testDepartment.id, partialUpdate)

      expect(result.data.name).toBe('Partially Updated Department')
      expect(result.data.code).toBe(testDepartment.code) // Should remain unchanged
    })
  })

  describe('deleteDepartment', () => {
    it('should delete a department successfully', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const mockResponse = createTestSuccess({ message: 'Department deleted successfully' })
      
      ;(deleteDepartment as jest.Mock).mockResolvedValue(mockResponse)

      const result = await deleteDepartment(testDepartment.id)

      expect(deleteDepartment).toHaveBeenCalledWith(testDepartment.id)
      expect(result).toEqual(mockResponse)
      expect(result.data.message).toBe('Department deleted successfully')
      expect(result.error).toBeNull()
    })

    it('should handle deleting non-existent department', async () => {
      const nonExistentId = 'non-existent-id'
      const mockError = createTestError('Department not found', 404)
      
      ;(deleteDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await deleteDepartment(nonExistentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle cascade delete constraints', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const mockError = createTestError('Cannot delete department with existing teachers or courses', 409)
      
      ;(deleteDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await deleteDepartment(testDepartment.id)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
      expect(result.error.message).toContain('Cannot delete department with existing')
    })

    it('should handle database errors during deletion', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const mockError = createTestError('Database error during deletion', 500)
      
      ;(deleteDepartment as jest.Mock).mockRejectedValue(mockError)

      await expect(deleteDepartment(testDepartment.id)).rejects.toEqual(mockError)
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should validate department name length', async () => {
      const invalidDepartment = {
        ...generateTestDepartment('test-school-id'),
        name: 'A'.repeat(201), // Too long
      }
      const mockError = createTestError('Department name must be less than 200 characters')
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await createDepartment(invalidDepartment)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be less than 200 characters')
    })

    it('should validate department code length', async () => {
      const invalidDepartment = {
        ...generateTestDepartment('test-school-id'),
        code: 'A'.repeat(11), // Too long
      }
      const mockError = createTestError('Department code must be between 2 and 10 characters')
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await createDepartment(invalidDepartment)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be between 2 and 10 characters')
    })

    it('should handle concurrent updates', async () => {
      const testDepartment = generateTestDepartment('test-school-id')
      const mockError = createTestError('Department was modified by another user', 409)
      
      ;(updateDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await updateDepartment(testDepartment.id, { name: 'Concurrent Update' })

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
    })

    it('should validate description length', async () => {
      const invalidDepartment = {
        ...generateTestDepartment('test-school-id'),
        description: 'A'.repeat(1001), // Too long
      }
      const mockError = createTestError('Description must be less than 1000 characters')
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await createDepartment(invalidDepartment)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be less than 1000 characters')
    })

    it('should handle special characters in department code', async () => {
      const invalidDepartment = {
        ...generateTestDepartment('test-school-id'),
        code: 'SCI@100', // Contains special character
      }
      const mockError = createTestError('Department code can only contain letters and numbers')
      
      ;(createDepartment as jest.Mock).mockResolvedValue(mockError)

      const result = await createDepartment(invalidDepartment)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('can only contain letters and numbers')
    })
  })
}) 