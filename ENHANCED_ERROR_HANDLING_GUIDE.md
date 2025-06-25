# Enhanced Error Handling Guide

## 🎯 **Overview**

This guide provides comprehensive instructions for implementing enhanced error handling in the frontend and API layers to gracefully handle new database constraints and validations.

## 📋 **New Error Handling System**

### **1. Enhanced Error Handler (`src/lib/utils/error-handling.ts`)**

The new error handling system provides:

- **Comprehensive error mapping** for all database constraint violations
- **Form validation helpers** for common data types
- **User-friendly error messages** with actionable suggestions
- **Field-specific error mapping** for form validation
- **Enhanced error display** with different toast styles based on error type

### **2. Reusable Form Component (`src/components/ui/form-with-validation.tsx`)**

A reusable form component that provides:

- **Built-in validation** for common field types
- **Real-time error feedback** with field-level error display
- **Automatic error clearing** when users start typing
- **Database error integration** with field-specific error mapping
- **Predefined field configurations** for common entities

## 🔧 **How to Use the New Error Handling**

### **Step 1: Import the Error Handler**

```typescript
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
```

### **Step 2: Update Your Error Handling**

**Before:**
```typescript
} catch (err: any) {
  console.error('Error:', err);
  toast.error(err.message || "Something went wrong");
}
```

**After:**
```typescript
} catch (err: any) {
  console.error('Error:', err);
  displayError(err, toast);
}
```

### **Step 3: Enhanced Error Handling with Field Mapping**

```typescript
} catch (err: any) {
  console.error('Error:', err);
  
  // Handle field-specific errors
  const fieldError = getFieldError(err);
  if (fieldError.field) {
    setFormErrors(prev => ({ ...prev, [fieldError.field!]: fieldError.message }));
    toast.error(fieldError.message);
  } else {
    displayError(err, toast);
  }
}
```

## 📝 **Form Validation Examples**

### **Basic Form Validation**

```typescript
import { validateDepartmentForm } from '@/lib/utils/error-handling';

const handleSubmit = async (formData: any) => {
  // Validate form data
  const errors = validateDepartmentForm(formData);
  if (Object.keys(errors).length > 0) {
    const firstError = Object.values(errors)[0];
    toast.error(firstError);
    return;
  }

  // Proceed with submission
  try {
    await createDepartment(formData);
    toast.success('Department created successfully!');
  } catch (err: any) {
    displayError(err, toast);
  }
};
```

### **Using the Reusable Form Component**

```typescript
import { FormWithValidation, departmentFields } from '@/components/ui/form-with-validation';

const DepartmentForm = () => {
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      await createDepartment(values);
      toast.success('Department created successfully!');
    } catch (err: any) {
      // Error handling is built into the form component
      throw err;
    }
  };

  return (
    <FormWithValidation
      fields={departmentFields}
      initialValues={{
        name: '',
        code: '',
        description: ''
      }}
      onSubmit={handleSubmit}
      title="Create Department"
      description="Add a new department to your school"
    />
  );
};
```

## 🎨 **Predefined Field Configurations**

The system includes predefined field configurations for common entities:

### **School Fields**
```typescript
import { schoolFields } from '@/components/ui/form-with-validation';

// Includes: name, working_days
```

### **Academic Year Fields**
```typescript
import { academicYearFields } from '@/components/ui/form-with-validation';

// Includes: name, start_date, end_date
```

### **Term Fields**
```typescript
import { termFields } from '@/components/ui/form-with-validation';

// Includes: name, start_date, end_date, period_duration_minutes
```

### **Department Fields**
```typescript
import { departmentFields } from '@/components/ui/form-with-validation';

// Includes: name, code, description
```

### **Course Fields**
```typescript
import { courseFields } from '@/components/ui/form-with-validation';

// Includes: name, code, grade_level, total_hours_per_year
```

### **Teacher Fields**
```typescript
import { teacherFields } from '@/components/ui/form-with-validation';

// Includes: name, email, grade_level
```

### **Class Offering Fields**
```typescript
import { classOfferingFields } from '@/components/ui/form-with-validation';

// Includes: periods_per_week, required_hours_per_term
```

### **Teaching Assignment Fields**
```typescript
import { teachingAssignmentFields } from '@/components/ui/form-with-validation';

// Includes: hours_per_week
```

## 🔍 **Error Types and Handling**

### **1. Validation Errors (Code: 23514, P0001)**
- **When they occur**: When data doesn't meet validation rules
- **Examples**: 
  - End date before start date
  - Invalid grade level (not 1-12)
  - Periods per week outside allowed range
  - Teacher workload exceeds maximum
- **User message**: "Please check your input and try again."
- **Toast style**: Error with description

### **2. Unique Constraint Violations (Code: 23505)**
- **When they occur**: When trying to create duplicate records
- **Examples**:
  - Duplicate department names
  - Duplicate course codes
  - Duplicate class offerings
- **User message**: "Please use a different value for this field."
- **Toast style**: Error with description

### **3. Foreign Key Violations (Code: 23503)**
- **When they occur**: When trying to reference a non-existent record
- **Examples**:
  - Referencing a deleted teacher
  - Referencing a deleted department
- **User message**: "The referenced item may have been deleted. Please refresh the page."
- **Toast style**: Error with description

## 📋 **Files That Need Updates**

### **High Priority (Frequently Used)**
1. `src/app/admin/onboarding/page.tsx` - School creation
2. `src/app/admin/academic-calendar/_components/AcademicCalendarClientUI.tsx` - Date validations
3. `src/app/admin/departments/_components/DepartmentsClientUI.tsx` - Unique names
4. `src/app/admin/subjects/_components/SubjectsClientUI.tsx` - Course constraints
5. `src/app/admin/classes/_components/ClassesClientUI.tsx` - Class constraints

### **Medium Priority**
1. `src/app/admin/teachers/_components/TeachersClientUI.tsx`
2. `src/app/admin/rooms/_components/RoomsClientUI.tsx`
3. `src/app/admin/class-offerings/_components/ClassOfferingsClientUI.tsx`
4. `src/app/admin/teaching-assignments/_components/TeachingAssignmentsClientUI.tsx`

### **Low Priority**
1. `src/app/admin/terms/_components/TermsClientUI.tsx`
2. `src/app/admin/academic-years/_components/AcademicYearsClientUI.tsx`
3. `src/app/admin/schools/_components/SchoolEditModal.tsx`

## 🎨 **UI/UX Improvements**

### **1. Field-Level Error Display**
For form validation errors, show errors next to specific fields:

```typescript
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

// In your form JSX
<div>
  <input 
    className={`border ${fieldErrors.name ? 'border-red-500' : 'border-gray-300'}`}
    // ... other props
  />
  {fieldErrors.name && (
    <p className="text-sm text-red-600 mt-1">{fieldErrors.name}</p>
  )}
</div>
```

### **2. Enhanced Toast Notifications**
Use different toast styles based on error type:

```typescript
// Validation errors
toast.error(message, {
  description: 'Please check your input and try again.',
  duration: 5000,
});

// Unique constraint errors
toast.error(message, {
  description: 'Please use a different value for this field.',
  duration: 4000,
});

// Foreign key errors
toast.error(message, {
  description: 'The referenced item may have been deleted. Please refresh the page.',
  duration: 6000,
});
```

### **3. Loading States**
Show loading states during form submission:

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await submitData();
    toast.success('Success!');
  } catch (err: any) {
    displayError(err, toast);
  } finally {
    setIsSubmitting(false);
  }
};

// In your button
<button 
  type="submit" 
  disabled={isSubmitting}
  className="disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSubmitting ? 'Saving...' : 'Save'}
</button>
```

## 🔧 **API Layer Updates**

### **Enhanced API Error Handling**

Update your API functions to use the new error handling:

```typescript
// Before
export async function createDepartment(data: DepartmentInsert): Promise<Department> {
  const { data: result, error } = await supabase
    .from('departments')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create department: ${error.message}`);
  }

  return result;
}

// After
export async function createDepartment(data: DepartmentInsert): Promise<Department> {
  const { data: result, error } = await supabase
    .from('departments')
    .insert(data)
    .select()
    .single();

  if (error) {
    // Let the frontend handle the error mapping
    throw error;
  }

  return result;
}
```

### **Validation in API Layer**

Add validation to your API functions:

```typescript
import { validateDepartmentForm } from '@/lib/utils/error-handling';

export async function createDepartment(data: DepartmentInsert): Promise<Department> {
  // Validate data before submission
  const errors = validateDepartmentForm(data);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }

  const { data: result, error } = await supabase
    .from('departments')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return result;
}
```

## 🧪 **Testing Error Handling**

### **Test Different Error Scenarios**

```typescript
// Test validation errors
test('should handle validation errors', async () => {
  const invalidData = { name: '', grade_level: 15 };
  
  try {
    await createCourse(invalidData);
  } catch (error: any) {
    expect(error.message).toContain('Course name is required');
  }
});

// Test unique constraint errors
test('should handle duplicate name errors', async () => {
  const duplicateData = { name: 'Existing Course' };
  
  try {
    await createCourse(duplicateData);
  } catch (error: any) {
    expect(error.message).toContain('already exists');
  }
});

// Test foreign key errors
test('should handle foreign key errors', async () => {
  const invalidData = { department_id: 'non-existent-id' };
  
  try {
    await createCourse(invalidData);
  } catch (error: any) {
    expect(error.message).toContain('no longer exists');
  }
});
```

## 📚 **Best Practices**

### **1. Always Use displayError**
Never use `toast.error(err.message)` directly. Always use `displayError(err, toast)` for consistent error handling.

### **2. Validate Before Submission**
Always validate form data before submitting to the API to provide immediate feedback to users.

### **3. Show Loading States**
Always show loading states during form submission to prevent multiple submissions.

### **4. Clear Errors on Input**
Clear field errors when users start typing to provide a better user experience.

### **5. Use Field-Specific Error Mapping**
Map database errors to specific form fields when possible to help users identify the problematic field.

### **6. Provide Actionable Suggestions**
Include suggestions in error messages to help users understand how to fix the issue.

## 🚀 **Migration Checklist**

- [ ] Update all catch blocks to use `displayError(err, toast)`
- [ ] Add form validation using the new validation helpers
- [ ] Update API functions to throw raw errors instead of wrapping them
- [ ] Add loading states to all form submissions
- [ ] Implement field-level error display
- [ ] Test error scenarios for each form
- [ ] Update error messages to be more user-friendly
- [ ] Add suggestions for common error types

## 📞 **Support**

If you encounter issues with the new error handling system:

1. Check the error codes in the database logs
2. Verify that the error mapping includes your specific error
3. Test with the predefined field configurations
4. Use the reusable form component for consistent behavior

The enhanced error handling system provides a robust foundation for handling all types of database constraints and validation errors while maintaining a great user experience. 