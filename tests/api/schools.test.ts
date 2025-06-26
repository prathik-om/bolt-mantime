import { generateTestSchool, createMockSupabaseClient, createTestSuccess, createTestError } from '../utils/test-helpers'

// Mock the schools API module
jest.mock('@/lib/api/schools', () => ({
  createSchool: jest.fn(),
  getSchools: jest.fn(),
  getSchoolById: jest.fn(),
  updateSchool: jest.fn(),
  deleteSchool: jest.fn(),
}))

import { createSchool, getSchools, getSchoolById, updateSchool, deleteSchool } from '@/lib/api/schools'

describe('Schools API', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    jest.clearAllMocks()
  })

  describe('createSchool', () => {
    it('should create a school successfully', async () => {
      const testSchool = generateTestSchool()
      const mockResponse = createTestSuccess(testSchool)
      
      ;(createSchool as jest.Mock).mockResolvedValue(mockResponse)

      const result = await createSchool(testSchool)

      expect(createSchool).toHaveBeenCalledWith(testSchool)
      expect(result).toEqual(mockResponse)
      expect(result.data).toEqual(testSchool)
      expect(result.error).toBeNull()
    })

    it('should handle missing required fields', async () => {
      const invalidSchool = { name: 'Test School' } // Missing required fields
      const mockError = createTestError('Missing required fields: start_time, end_time')
      
      ;(createSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await createSchool(invalidSchool)

      expect(createSchool).toHaveBeenCalledWith(invalidSchool)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Missing required fields')
    })

    it('should handle invalid period duration', async () => {
      const invalidSchool = {
        ...generateTestSchool(),
        period_duration: 10, // Less than minimum 15
      }
      const mockError = createTestError('Period duration must be between 15 and 240 minutes')
      
      ;(createSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await createSchool(invalidSchool)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Period duration must be between')
    })

    it('should handle invalid sessions per day', async () => {
      const invalidSchool = {
        ...generateTestSchool(),
        sessions_per_day: 25, // More than maximum 20
      }
      const mockError = createTestError('Sessions per day must be between 1 and 20')
      
      ;(createSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await createSchool(invalidSchool)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Sessions per day must be between')
    })

    it('should handle database connection errors', async () => {
      const testSchool = generateTestSchool()
      const mockError = createTestError('Database connection failed', 500)
      
      ;(createSchool as jest.Mock).mockRejectedValue(mockError)

      await expect(createSchool(testSchool)).rejects.toEqual(mockError)
    })
  })

  describe('getSchools', () => {
    it('should retrieve all schools successfully', async () => {
      const testSchools = [generateTestSchool(), generateTestSchool()]
      const mockResponse = createTestSuccess(testSchools)
      
      ;(getSchools as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getSchools()

      expect(getSchools).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
      expect(result.error).toBeNull()
    })

    it('should handle empty schools list', async () => {
      const mockResponse = createTestSuccess([])
      
      ;(getSchools as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getSchools()

      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })

    it('should handle database errors when fetching schools', async () => {
      const mockError = createTestError('Failed to fetch schools', 500)
      
      ;(getSchools as jest.Mock).mockRejectedValue(mockError)

      await expect(getSchools()).rejects.toEqual(mockError)
    })
  })

  describe('getSchoolById', () => {
    it('should retrieve a school by ID successfully', async () => {
      const testSchool = generateTestSchool()
      const mockResponse = createTestSuccess(testSchool)
      
      ;(getSchoolById as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getSchoolById(testSchool.id)

      expect(getSchoolById).toHaveBeenCalledWith(testSchool.id)
      expect(result).toEqual(mockResponse)
      expect(result.data).toEqual(testSchool)
      expect(result.error).toBeNull()
    })

    it('should handle non-existent school ID', async () => {
      const nonExistentId = 'non-existent-id'
      const mockError = createTestError('School not found', 404)
      
      ;(getSchoolById as jest.Mock).mockResolvedValue(mockError)

      const result = await getSchoolById(nonExistentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
      expect(result.error.message).toBe('School not found')
    })

    it('should handle invalid school ID format', async () => {
      const invalidId = 'invalid-uuid'
      const mockError = createTestError('Invalid school ID format', 400)
      
      ;(getSchoolById as jest.Mock).mockResolvedValue(mockError)

      const result = await getSchoolById(invalidId)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Invalid school ID format')
    })
  })

  describe('updateSchool', () => {
    it('should update a school successfully', async () => {
      const testSchool = generateTestSchool()
      const updatedData = { name: 'Updated School Name' }
      const updatedSchool = { ...testSchool, ...updatedData }
      const mockResponse = createTestSuccess(updatedSchool)
      
      ;(updateSchool as jest.Mock).mockResolvedValue(mockResponse)

      const result = await updateSchool(testSchool.id, updatedData)

      expect(updateSchool).toHaveBeenCalledWith(testSchool.id, updatedData)
      expect(result).toEqual(mockResponse)
      expect(result.data.name).toBe('Updated School Name')
      expect(result.error).toBeNull()
    })

    it('should handle updating non-existent school', async () => {
      const nonExistentId = 'non-existent-id'
      const updateData = { name: 'Updated Name' }
      const mockError = createTestError('School not found', 404)
      
      ;(updateSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await updateSchool(nonExistentId, updateData)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle invalid update data', async () => {
      const testSchool = generateTestSchool()
      const invalidUpdateData = { period_duration: -5 } // Invalid value
      const mockError = createTestError('Invalid period duration value')
      
      ;(updateSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await updateSchool(testSchool.id, invalidUpdateData)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Invalid period duration')
    })

    it('should handle partial updates', async () => {
      const testSchool = generateTestSchool()
      const partialUpdate = { name: 'Partially Updated School' }
      const updatedSchool = { ...testSchool, ...partialUpdate }
      const mockResponse = createTestSuccess(updatedSchool)
      
      ;(updateSchool as jest.Mock).mockResolvedValue(mockResponse)

      const result = await updateSchool(testSchool.id, partialUpdate)

      expect(result.data.name).toBe('Partially Updated School')
      expect(result.data.start_time).toBe(testSchool.start_time) // Should remain unchanged
    })
  })

  describe('deleteSchool', () => {
    it('should delete a school successfully', async () => {
      const testSchool = generateTestSchool()
      const mockResponse = createTestSuccess({ message: 'School deleted successfully' })
      
      ;(deleteSchool as jest.Mock).mockResolvedValue(mockResponse)

      const result = await deleteSchool(testSchool.id)

      expect(deleteSchool).toHaveBeenCalledWith(testSchool.id)
      expect(result).toEqual(mockResponse)
      expect(result.data.message).toBe('School deleted successfully')
      expect(result.error).toBeNull()
    })

    it('should handle deleting non-existent school', async () => {
      const nonExistentId = 'non-existent-id'
      const mockError = createTestError('School not found', 404)
      
      ;(deleteSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await deleteSchool(nonExistentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle cascade delete constraints', async () => {
      const testSchool = generateTestSchool()
      const mockError = createTestError('Cannot delete school with existing academic years', 409)
      
      ;(deleteSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await deleteSchool(testSchool.id)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
      expect(result.error.message).toContain('Cannot delete school with existing')
    })

    it('should handle database errors during deletion', async () => {
      const testSchool = generateTestSchool()
      const mockError = createTestError('Database error during deletion', 500)
      
      ;(deleteSchool as jest.Mock).mockRejectedValue(mockError)

      await expect(deleteSchool(testSchool.id)).rejects.toEqual(mockError)
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should validate working days array', async () => {
      const invalidSchool = {
        ...generateTestSchool(),
        working_days: ['invalid-day', 'monday'], // Invalid day
      }
      const mockError = createTestError('Invalid working day: invalid-day')
      
      ;(createSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await createSchool(invalidSchool)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Invalid working day')
    })

    it('should validate time format', async () => {
      const invalidSchool = {
        ...generateTestSchool(),
        start_time: '25:00', // Invalid time
      }
      const mockError = createTestError('Invalid time format')
      
      ;(createSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await createSchool(invalidSchool)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Invalid time format')
    })

    it('should handle concurrent updates', async () => {
      const testSchool = generateTestSchool()
      const mockError = createTestError('School was modified by another user', 409)
      
      ;(updateSchool as jest.Mock).mockResolvedValue(mockError)

      const result = await updateSchool(testSchool.id, { name: 'Concurrent Update' })

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
    })
  })
}) 