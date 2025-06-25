"use client";

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  displayError, 
  getFieldError, 
  validateRequired, 
  validateLength, 
  validateEmail, 
  validateDateRange, 
  validateNumberRange, 
  validatePositiveNumber,
  validateGradeLevel,
  validatePeriodsPerWeek,
  validatePeriodDuration,
  validateHoursPerWeek
} from '@/lib/utils/error-handling';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'multiselect';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => string | null;
  placeholder?: string;
}

export interface FormWithValidationProps {
  fields: FormField[];
  initialValues: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
  title?: string;
  description?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

export const FormWithValidation: React.FC<FormWithValidationProps> = ({
  fields,
  initialValues,
  onSubmit,
  submitLabel = 'Submit',
  loading = false,
  title,
  description,
  onCancel,
  cancelLabel = 'Cancel'
}) => {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: string, value: any): string | null => {
    const field = fields.find(f => f.name === name);
    if (!field) return null;

    // Required validation
    if (field.required) {
      const requiredError = validateRequired(value, field.label);
      if (requiredError) return requiredError;
    }

    // Length validation for strings
    if (typeof value === 'string' && (field.minLength || field.maxLength)) {
      const lengthError = validateLength(value, field.label, field.minLength || 0, field.maxLength || 1000);
      if (lengthError) return lengthError;
    }

    // Number range validation
    if (typeof value === 'number' && (field.min !== undefined || field.max !== undefined)) {
      const rangeError = validateNumberRange(value, field.label, field.min || 0, field.max || 1000);
      if (rangeError) return rangeError;
    }

    // Type-specific validations
    if (field.type === 'email' && value) {
      const emailError = validateEmail(value);
      if (emailError) return emailError;
    }

    if (field.type === 'number' && value !== null && value !== undefined) {
      const numberError = validatePositiveNumber(value, field.label);
      if (numberError) return numberError;
    }

    // Custom validation
    if (field.validation) {
      const customError = field.validation(value);
      if (customError) return customError;
    }

    return null;
  }, [fields]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field.name, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [fields, values, validateField]);

  const handleFieldChange = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handleFieldBlur = useCallback((name: string) => {
    const error = validateField(name, values[name]);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField, values]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      // Handle database errors
      const fieldError = getFieldError(error);
      if (fieldError.field) {
        setErrors(prev => ({ ...prev, [fieldError.field!]: fieldError.message }));
        toast.error(fieldError.message);
      } else {
        displayError(error, toast);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = values[field.name];
    const error = errors[field.name];

    const commonProps = {
      id: field.name,
      name: field.name,
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const newValue = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
        handleFieldChange(field.name, newValue);
      },
      onBlur: () => handleFieldBlur(field.name),
      placeholder: field.placeholder,
      className: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      }`,
      required: field.required,
      min: field.min,
      max: field.max,
      minLength: field.minLength,
      maxLength: field.maxLength,
    };

    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <input
            {...commonProps}
            type={field.type}
          />
        );

      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            step="any"
          />
        );

      case 'date':
        return (
          <input
            {...commonProps}
            type="date"
          />
        );

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );

      case 'multiselect':
        return (
          <select {...commonProps} multiple>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {title && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-2 text-gray-600">{description}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {fields.map(field => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {renderField(field)}
            
            {errors[field.name] && (
              <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
            )}
          </div>
        ))}

        <div className="flex justify-end space-x-4 pt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {cancelLabel}
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || loading ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

// Predefined field configurations for common entities
export const schoolFields: FormField[] = [
  {
    name: 'name',
    label: 'School Name',
    type: 'text',
    required: true,
    minLength: 2,
    maxLength: 100,
    placeholder: 'Enter school name'
  },
  {
    name: 'working_days',
    label: 'Working Days',
    type: 'multiselect',
    required: true,
    options: [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ]
  }
];

export const academicYearFields: FormField[] = [
  {
    name: 'name',
    label: 'Academic Year Name',
    type: 'text',
    required: true,
    minLength: 1,
    maxLength: 100,
    placeholder: 'e.g., 2024-2025'
  },
  {
    name: 'start_date',
    label: 'Start Date',
    type: 'date',
    required: true
  },
  {
    name: 'end_date',
    label: 'End Date',
    type: 'date',
    required: true,
    validation: (value) => {
      // This will be validated against start_date in the form
      return null;
    }
  }
];

export const termFields: FormField[] = [
  {
    name: 'name',
    label: 'Term Name',
    type: 'text',
    required: true,
    minLength: 1,
    maxLength: 100,
    placeholder: 'e.g., Fall Term'
  },
  {
    name: 'start_date',
    label: 'Start Date',
    type: 'date',
    required: true
  },
  {
    name: 'end_date',
    label: 'End Date',
    type: 'date',
    required: true
  },
  {
    name: 'period_duration_minutes',
    label: 'Period Duration (minutes)',
    type: 'number',
    required: true,
    min: 30,
    max: 120,
    validation: validatePeriodDuration
  }
];

export const departmentFields: FormField[] = [
  {
    name: 'name',
    label: 'Department Name',
    type: 'text',
    required: true,
    minLength: 1,
    maxLength: 100,
    placeholder: 'Enter department name'
  },
  {
    name: 'code',
    label: 'Department Code',
    type: 'text',
    required: false,
    maxLength: 20,
    placeholder: 'e.g., MATH'
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    required: false,
    maxLength: 500,
    placeholder: 'Enter department description'
  }
];

export const courseFields: FormField[] = [
  {
    name: 'name',
    label: 'Course Name',
    type: 'text',
    required: true,
    minLength: 1,
    maxLength: 100,
    placeholder: 'Enter course name'
  },
  {
    name: 'code',
    label: 'Course Code',
    type: 'text',
    required: false,
    maxLength: 20,
    placeholder: 'e.g., MATH101'
  },
  {
    name: 'grade_level',
    label: 'Grade Level',
    type: 'number',
    required: true,
    min: 1,
    max: 12,
    validation: validateGradeLevel
  },
  {
    name: 'total_hours_per_year',
    label: 'Total Hours per Year',
    type: 'number',
    required: true,
    min: 1,
    validation: (value) => validatePositiveNumber(value, 'Total hours per year')
  }
];

export const teacherFields: FormField[] = [
  {
    name: 'name',
    label: 'Teacher Name',
    type: 'text',
    required: true,
    minLength: 1,
    maxLength: 100,
    placeholder: 'Enter teacher name'
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    validation: validateEmail
  },
  {
    name: 'grade_level',
    label: 'Grade Level',
    type: 'number',
    required: true,
    min: 1,
    max: 12,
    validation: validateGradeLevel
  }
];

export const classOfferingFields: FormField[] = [
  {
    name: 'periods_per_week',
    label: 'Periods per Week',
    type: 'number',
    required: true,
    min: 1,
    max: 20,
    validation: validatePeriodsPerWeek
  },
  {
    name: 'required_hours_per_term',
    label: 'Required Hours per Term',
    type: 'number',
    required: false,
    min: 0,
    validation: (value) => {
      if (value !== null && value !== undefined && value < 0) {
        return 'Required hours per term must be positive';
      }
      return null;
    }
  }
];

export const teachingAssignmentFields: FormField[] = [
  {
    name: 'hours_per_week',
    label: 'Hours per Week',
    type: 'number',
    required: true,
    min: 1,
    max: 40,
    validation: validateHoursPerWeek
  }
]; 