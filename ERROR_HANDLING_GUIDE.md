# Error Handling Guide for New Database Constraints

## 🎯 **Overview**

With the new database constraints and validations in place, you need to ensure your API and UI handle these errors gracefully. This guide shows you how to update your error handling to provide user-friendly feedback.

## 📋 **New Error Types to Handle**

### **1. Foreign Key Violations (Code: 23503)**
- **When they occur**: When trying to reference a non-existent record
- **Examples**: 
  - Deleting a term that has holidays
  - Deleting a school that has time slots
  - Referencing a deleted teacher in assignments

### **2. Unique Constraint Violations (Code: 23505)**
- **When they occur**: When trying to create duplicate records
- **Examples**:
  - Creating a time slot that overlaps with existing one
  - Creating duplicate department names
  - Creating duplicate course codes

### **3. Check Constraint Violations (Code: 23514)**
- **When they occur**: When data doesn't meet validation rules
- **Examples**:
  - End date before start date
  - Invalid day of week (not 1-7)
  - Period duration outside allowed range

### **4. Custom Validation Errors (Code: P0001)**
- **When they occur**: When our custom triggers reject data
- **Examples**:
  - Time slot overlaps
  - Term dates outside academic year
  - Holiday dates outside term

## 🔧 **How to Update Your Code**

### **Step 1: Import the Error Handler**

```typescript
import { handleDatabaseError } from '@/utils/supabase/error-handler';
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
  const userMessage = handleDatabaseError(err);
  toast.error(userMessage);
}
```

### **Step 3: Enhanced Error Handling with Suggestions**

```typescript
} catch (err: any) {
  console.error('Error:', err);
  const userMessage = handleDatabaseError(err);
  
  // Add helpful suggestions based on error type
  let suggestion = '';
  if (err?.code === '23505') {
    suggestion = ' Please use a different value.';
  } else if (err?.code === '23503') {
    suggestion = ' Please refresh the page and try again.';
  } else if (err?.code === '23514') {
    suggestion = ' Please check your input values.';
  }
  
  toast.error(userMessage + suggestion);
}
```

## 📝 **Files That Need Updates**

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

} catch (err: any) {
  const userMessage = handleDatabaseError(err);
  
  // Map database errors to specific fields
  if (err?.code === '23505' && err.message.includes('name')) {
    setFieldErrors({ name: userMessage });
  } else if (err?.code === '23514' && err.message.includes('date')) {
    setFieldErrors({ end_date: userMessage });
  } else {
    toast.error(userMessage);
  }
}
```

### **2. Retry Mechanisms**
For foreign key errors, provide retry options:

```typescript
if (err?.code === '23503') {
  toast.error(userMessage, {
    action: {
      label: 'Refresh',
      onClick: () => window.location.reload()
    }
  });
}
```

### **3. Validation Before Submit**
Add client-side validation to prevent common errors:

```typescript
const validateBeforeSubmit = (values: any) => {
  const errors: Record<string, string> = {};
  
  // Check for date conflicts
  if (values.end_date <= values.start_date) {
    errors.end_date = 'End date must be after start date';
  }
  
  // Check for time conflicts
  if (values.end_time <= values.start_time) {
    errors.end_time = 'End time must be after start time';
  }
  
  return errors;
};
```

## 🧪 **Testing Your Error Handling**

### **Test Cases to Add**

1. **Foreign Key Tests**:
   - Try to create a holiday with non-existent term
   - Try to assign teacher to non-existent department
   - Try to create time slot for non-existent school

2. **Unique Constraint Tests**:
   - Try to create duplicate department names
   - Try to create overlapping time slots
   - Try to create duplicate course codes

3. **Check Constraint Tests**:
   - Try to create academic year with end date before start date
   - Try to create time slot with invalid day of week
   - Try to create term with invalid period duration

4. **Custom Validation Tests**:
   - Try to create term outside academic year dates
   - Try to create holiday outside term dates
   - Try to create admin profile without school_id

### **Manual Testing Commands**

```sql
-- Test foreign key constraint
INSERT INTO holidays (term_id, date, reason) 
VALUES ('non-existent-uuid', '2024-01-01', 'Test');

-- Test unique constraint
INSERT INTO departments (name, school_id) 
VALUES ('Math', 'existing-school-id');
INSERT INTO departments (name, school_id) 
VALUES ('Math', 'existing-school-id');

-- Test check constraint
INSERT INTO academic_years (name, start_date, end_date, school_id) 
VALUES ('Test', '2024-06-01', '2024-05-01', 'existing-school-id');
```

## 🚀 **Implementation Checklist**

- [ ] Update `src/utils/supabase/helpers.ts` ✅
- [ ] Create `src/utils/supabase/error-handler.ts` ✅
- [ ] Update onboarding page error handling
- [ ] Update academic calendar error handling
- [ ] Update departments error handling
- [ ] Update subjects error handling
- [ ] Update classes error handling
- [ ] Update teachers error handling
- [ ] Update rooms error handling
- [ ] Update class offerings error handling
- [ ] Update teaching assignments error handling
- [ ] Add field-level error display
- [ ] Add retry mechanisms for foreign key errors
- [ ] Add client-side validation
- [ ] Test all error scenarios
- [ ] Update documentation

## 📊 **Error Message Examples**

### **Foreign Key Errors**
- ❌ "insert or update on table "holidays" violates foreign key constraint"
- ✅ "The selected term no longer exists. Please refresh and try again."

### **Unique Constraint Errors**
- ❌ "duplicate key value violates unique constraint"
- ✅ "A department with this name already exists in your school."

### **Check Constraint Errors**
- ❌ "new row for relation "academic_years" violates check constraint"
- ✅ "Academic year end date must be after start date."

### **Custom Validation Errors**
- ❌ "Time slot overlaps with existing slot for school"
- ✅ "This time slot overlaps with an existing slot. Please choose a different time."

## 🎉 **Benefits**

1. **Better User Experience**: Clear, actionable error messages
2. **Reduced Support Tickets**: Users understand what went wrong
3. **Improved Data Quality**: Database-level validation prevents bad data
4. **Consistent Error Handling**: Standardized approach across the app
5. **Easier Debugging**: Structured error codes and messages

## ⚠️ **Important Notes**

1. **Always log the original error** for debugging
2. **Don't expose sensitive information** in user messages
3. **Provide actionable guidance** when possible
4. **Test error scenarios** thoroughly
5. **Monitor error rates** in production

This enhanced error handling will significantly improve your application's user experience and reliability! 🚀 