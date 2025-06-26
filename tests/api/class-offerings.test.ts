import { 
  generateTestClassOffering, 
  generateTestTerm, 
  generateTestClass, 
  generateTestCourse,
  generateTestAcademicYear,
  generateTestSchool,
  createMockSupabaseClient, 
  createTestSuccess, 
  createTestError 
} from '../utils/test-helpers'

// Mock the class offerings API module
jest.mock('@/lib/api/class-offerings', () => ({
  createClassOffering: jest.fn(),
  getClassOfferings: jest.fn(),
  getClassOfferingById: jest.fn(),
  updateClassOffering: jest.fn(),
  deleteClassOffering: jest.fn(),
  getClassOfferingsByTerm: jest.fn(),
  getClassOfferingsByClass: jest.fn(),
  getClassOfferingsByCourse: jest.fn(),
}))

import { 
  createClassOffering, 
  getClassOfferings, 
  getClassOfferingById, 
  updateClassOffering, 
  deleteClassOffering,
  getClassOfferingsByTerm,
  getClassOfferingsByClass,
  getClassOfferingsByCourse
} from '@/lib/api/class-offerings'

describe('Class Offerings API', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    jest.clearAllMocks()
  })

  describe('createClassOffering', () => {
    it('should create a class offering successfully', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const mockResponse = createTestSuccess(testClassOffering)
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockResponse)

      const result = await createClassOffering(testClassOffering)

      expect(createClassOffering).toHaveBeenCalledWith(testClassOffering)
      expect(result).toEqual(mockResponse)
      expect(result.data).toEqual(testClassOffering)
      expect(result.error).toBeNull()
    })

    it('should handle missing required fields', async () => {
      const invalidClassOffering = { 
        term_id: 'term-1',
        periods_per_week: 5
        // Missing class_id and course_id
      }
      const mockError = createTestError('Missing required fields: class_id, course_id')
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(invalidClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Missing required fields')
    })

    it('should handle non-existent term ID', async () => {
      const testClassOffering = generateTestClassOffering('non-existent-term', 'class-1', 'course-1')
      const mockError = createTestError('Term not found', 404)
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(testClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle non-existent class ID', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'non-existent-class', 'course-1')
      const mockError = createTestError('Class not found', 404)
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(testClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle non-existent course ID', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'non-existent-course')
      const mockError = createTestError('Course not found', 404)
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(testClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle invalid periods per week', async () => {
      const invalidClassOffering = {
        ...generateTestClassOffering('term-1', 'class-1', 'course-1'),
        periods_per_week: 0 // Invalid value
      }
      const mockError = createTestError('Periods per week must be between 1 and 20')
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(invalidClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be between 1 and 20')
    })

    it('should handle invalid required hours per term', async () => {
      const invalidClassOffering = {
        ...generateTestClassOffering('term-1', 'class-1', 'course-1'),
        required_hours_per_term: -10 // Invalid negative value
      }
      const mockError = createTestError('Required hours per term must be positive')
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(invalidClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be positive')
    })

    it('should handle duplicate class offering', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const mockError = createTestError('Class offering already exists for this term, class, and course', 409)
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(testClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
      expect(result.error.message).toContain('already exists')
    })
  })

  describe('getClassOfferings', () => {
    it('should retrieve all class offerings successfully', async () => {
      const testClassOfferings = [
        generateTestClassOffering('term-1', 'class-1', 'course-1'),
        generateTestClassOffering('term-1', 'class-2', 'course-2')
      ]
      const mockResponse = createTestSuccess(testClassOfferings)
      
      ;(getClassOfferings as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getClassOfferings()

      expect(getClassOfferings).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
      expect(result.error).toBeNull()
    })

    it('should handle empty class offerings list', async () => {
      const mockResponse = createTestSuccess([])
      
      ;(getClassOfferings as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getClassOfferings()

      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })

    it('should handle database errors when fetching class offerings', async () => {
      const mockError = createTestError('Failed to fetch class offerings', 500)
      
      ;(getClassOfferings as jest.Mock).mockRejectedValue(mockError)

      await expect(getClassOfferings()).rejects.toEqual(mockError)
    })
  })

  describe('getClassOfferingById', () => {
    it('should retrieve a class offering by ID successfully', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const mockResponse = createTestSuccess(testClassOffering)
      
      ;(getClassOfferingById as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getClassOfferingById(testClassOffering.id)

      expect(getClassOfferingById).toHaveBeenCalledWith(testClassOffering.id)
      expect(result).toEqual(mockResponse)
      expect(result.data).toEqual(testClassOffering)
      expect(result.error).toBeNull()
    })

    it('should handle non-existent class offering ID', async () => {
      const nonExistentId = 'non-existent-id'
      const mockError = createTestError('Class offering not found', 404)
      
      ;(getClassOfferingById as jest.Mock).mockResolvedValue(mockError)

      const result = await getClassOfferingById(nonExistentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
      expect(result.error.message).toBe('Class offering not found')
    })
  })

  describe('getClassOfferingsByTerm', () => {
    it('should retrieve class offerings by term ID successfully', async () => {
      const termId = 'term-1'
      const testClassOfferings = [
        generateTestClassOffering(termId, 'class-1', 'course-1'),
        generateTestClassOffering(termId, 'class-2', 'course-2')
      ]
      const mockResponse = createTestSuccess(testClassOfferings)
      
      ;(getClassOfferingsByTerm as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getClassOfferingsByTerm(termId)

      expect(getClassOfferingsByTerm).toHaveBeenCalledWith(termId)
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
      expect(result.data.every(offering => offering.term_id === termId)).toBe(true)
    })

    it('should handle term with no class offerings', async () => {
      const termId = 'empty-term-id'
      const mockResponse = createTestSuccess([])
      
      ;(getClassOfferingsByTerm as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getClassOfferingsByTerm(termId)

      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })

    it('should handle non-existent term ID', async () => {
      const nonExistentTermId = 'non-existent-term-id'
      const mockError = createTestError('Term not found', 404)
      
      ;(getClassOfferingsByTerm as jest.Mock).mockResolvedValue(mockError)

      const result = await getClassOfferingsByTerm(nonExistentTermId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })
  })

  describe('getClassOfferingsByClass', () => {
    it('should retrieve class offerings by class ID successfully', async () => {
      const classId = 'class-1'
      const testClassOfferings = [
        generateTestClassOffering('term-1', classId, 'course-1'),
        generateTestClassOffering('term-2', classId, 'course-2')
      ]
      const mockResponse = createTestSuccess(testClassOfferings)
      
      ;(getClassOfferingsByClass as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getClassOfferingsByClass(classId)

      expect(getClassOfferingsByClass).toHaveBeenCalledWith(classId)
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
      expect(result.data.every(offering => offering.class_id === classId)).toBe(true)
    })

    it('should handle class with no offerings', async () => {
      const classId = 'empty-class-id'
      const mockResponse = createTestSuccess([])
      
      ;(getClassOfferingsByClass as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getClassOfferingsByClass(classId)

      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })
  })

  describe('getClassOfferingsByCourse', () => {
    it('should retrieve class offerings by course ID successfully', async () => {
      const courseId = 'course-1'
      const testClassOfferings = [
        generateTestClassOffering('term-1', 'class-1', courseId),
        generateTestClassOffering('term-2', 'class-2', courseId)
      ]
      const mockResponse = createTestSuccess(testClassOfferings)
      
      ;(getClassOfferingsByCourse as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getClassOfferingsByCourse(courseId)

      expect(getClassOfferingsByCourse).toHaveBeenCalledWith(courseId)
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
      expect(result.data.every(offering => offering.course_id === courseId)).toBe(true)
    })

    it('should handle course with no offerings', async () => {
      const courseId = 'empty-course-id'
      const mockResponse = createTestSuccess([])
      
      ;(getClassOfferingsByCourse as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getClassOfferingsByCourse(courseId)

      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })
  })

  describe('updateClassOffering', () => {
    it('should update a class offering successfully', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const updatedData = { periods_per_week: 6, required_hours_per_term: 100 }
      const updatedClassOffering = { ...testClassOffering, ...updatedData }
      const mockResponse = createTestSuccess(updatedClassOffering)
      
      ;(updateClassOffering as jest.Mock).mockResolvedValue(mockResponse)

      const result = await updateClassOffering(testClassOffering.id, updatedData)

      expect(updateClassOffering).toHaveBeenCalledWith(testClassOffering.id, updatedData)
      expect(result).toEqual(mockResponse)
      expect(result.data.periods_per_week).toBe(6)
      expect(result.data.required_hours_per_term).toBe(100)
      expect(result.error).toBeNull()
    })

    it('should handle updating non-existent class offering', async () => {
      const nonExistentId = 'non-existent-id'
      const updateData = { periods_per_week: 6 }
      const mockError = createTestError('Class offering not found', 404)
      
      ;(updateClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await updateClassOffering(nonExistentId, updateData)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle invalid periods per week on update', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const invalidUpdateData = { periods_per_week: 25 } // Too high
      const mockError = createTestError('Periods per week must be between 1 and 20')
      
      ;(updateClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await updateClassOffering(testClassOffering.id, invalidUpdateData)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be between 1 and 20')
    })

    it('should handle partial updates', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const partialUpdate = { periods_per_week: 7 }
      const updatedClassOffering = { ...testClassOffering, ...partialUpdate }
      const mockResponse = createTestSuccess(updatedClassOffering)
      
      ;(updateClassOffering as jest.Mock).mockResolvedValue(mockResponse)

      const result = await updateClassOffering(testClassOffering.id, partialUpdate)

      expect(result.data.periods_per_week).toBe(7)
      expect(result.data.required_hours_per_term).toBe(testClassOffering.required_hours_per_term) // Should remain unchanged
    })
  })

  describe('deleteClassOffering', () => {
    it('should delete a class offering successfully', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const mockResponse = createTestSuccess({ message: 'Class offering deleted successfully' })
      
      ;(deleteClassOffering as jest.Mock).mockResolvedValue(mockResponse)

      const result = await deleteClassOffering(testClassOffering.id)

      expect(deleteClassOffering).toHaveBeenCalledWith(testClassOffering.id)
      expect(result).toEqual(mockResponse)
      expect(result.data.message).toBe('Class offering deleted successfully')
      expect(result.error).toBeNull()
    })

    it('should handle deleting non-existent class offering', async () => {
      const nonExistentId = 'non-existent-id'
      const mockError = createTestError('Class offering not found', 404)
      
      ;(deleteClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await deleteClassOffering(nonExistentId)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(404)
    })

    it('should handle cascade delete constraints', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const mockError = createTestError('Cannot delete class offering with existing teaching assignments', 409)
      
      ;(deleteClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await deleteClassOffering(testClassOffering.id)

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
      expect(result.error.message).toContain('Cannot delete class offering with existing')
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should validate assignment type', async () => {
      const invalidClassOffering = {
        ...generateTestClassOffering('term-1', 'class-1', 'course-1'),
        assignment_type: 'invalid-type' // Invalid assignment type
      }
      const mockError = createTestError('Assignment type must be either "ai" or "manual"')
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(invalidClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be either "ai" or "manual"')
    })

    it('should handle concurrent updates', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const mockError = createTestError('Class offering was modified by another user', 409)
      
      ;(updateClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await updateClassOffering(testClassOffering.id, { periods_per_week: 8 })

      expect(result.error).toBeDefined()
      expect(result.error.status).toBe(409)
    })

    it('should validate required hours per term range', async () => {
      const invalidClassOffering = {
        ...generateTestClassOffering('term-1', 'class-1', 'course-1'),
        required_hours_per_term: 1000, // Too high
      }
      const mockError = createTestError('Required hours per term must be between 1 and 500')
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(invalidClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must be between 1 and 500')
    })

    it('should handle cross-term validation', async () => {
      const testClassOffering = generateTestClassOffering('term-1', 'class-1', 'course-1')
      const mockError = createTestError('Class and course must belong to the same school as the term')
      
      ;(createClassOffering as jest.Mock).mockResolvedValue(mockError)

      const result = await createClassOffering(testClassOffering)

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('must belong to the same school')
    })
  })
}) 