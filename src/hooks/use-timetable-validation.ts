import { useState, useCallback } from 'react';
import { validateScheduledLesson, validateTimetableAgainstConstraints } from '@/lib/api/timetable-ai-service';
import { getSchoolConstraints } from '@/lib/api/schools';
import type { TimeSlot } from '@/lib/types/database-helpers';

interface ValidationState {
  isValidating: boolean;
  isValid: boolean;
  errors: string[];
}

interface UseTimetableValidationProps {
  schoolId: string;
}

export function useTimetableValidation({ schoolId }: UseTimetableValidationProps) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    isValid: true,
    errors: []
  });

  const validateLesson = useCallback(async (
    teacherId: string,
    timeSlotId: string,
    date: string
  ) => {
    try {
      setValidationState(prev => ({ ...prev, isValidating: true }));
      
      const validation = await validateScheduledLesson(
        schoolId,
        teacherId,
        timeSlotId,
        date
      );

      setValidationState({
        isValidating: false,
        isValid: validation.isValid,
        errors: validation.errors
      });

      return validation.isValid;
    } catch (error) {
      setValidationState({
        isValidating: false,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      });
      return false;
    }
  }, [schoolId]);

  const validateTimetable = useCallback(async (timetableData: any[]) => {
    try {
      setValidationState(prev => ({ ...prev, isValidating: true }));
      
      const validation = await validateTimetableAgainstConstraints(
        schoolId,
        timetableData
      );

      setValidationState({
        isValidating: false,
        isValid: validation.isValid,
        errors: validation.errors
      });

      return validation.isValid;
    } catch (error) {
      setValidationState({
        isValidating: false,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      });
      return false;
    }
  }, [schoolId]);

  const validateTimeSlot = useCallback(async (
    timeSlot: TimeSlot,
    teacherId: string
  ) => {
    try {
      setValidationState(prev => ({ ...prev, isValidating: true }));
      
      const constraints = await getSchoolConstraints(schoolId);
      const validation = await validateScheduledLesson(
        schoolId,
        teacherId,
        timeSlot.id,
        new Date().toISOString().split('T')[0]
      );

      setValidationState({
        isValidating: false,
        isValid: validation.isValid,
        errors: validation.errors
      });

      return {
        isValid: validation.isValid,
        errors: validation.errors,
        constraints
      };
    } catch (error) {
      setValidationState({
        isValidating: false,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      });
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        constraints: null
      };
    }
  }, [schoolId]);

  return {
    ...validationState,
    validateLesson,
    validateTimetable,
    validateTimeSlot
  };
} 