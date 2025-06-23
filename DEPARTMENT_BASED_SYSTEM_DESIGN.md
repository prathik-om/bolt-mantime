# Department-Based School Management System Design

## 🎯 **Overview**

This document outlines the transformation from a subject-based to a department-based system, which better reflects real-world school organization and enables more intelligent AI scheduling.

## 🏗️ **Core Design Principles**

### 1. **Department as Organizational Unit**
- **Departments** represent academic divisions (English, Math, Science, etc.)
- Each department owns multiple **courses**
- Teachers are assigned to **departments** (can be multiple)
- Clear ownership and responsibility chain

### 2. **Teacher-Department Relationship**
- **Many-to-Many**: Teachers can belong to multiple departments
- **Primary Department**: Each teacher has one primary department
- **Qualification-Based**: Teachers can only teach courses from their departments
- **Flexibility**: Allows cross-department teaching when needed

### 3. **Course-Department Relationship**
- **One-to-Many**: Each course belongs to exactly one department
- **Department Ownership**: Only department teachers can teach the course
- **Grade Flexibility**: Courses can be mapped to specific grades with customization

### 4. **AI Scheduling Logic**
- **Department-Based Assignment**: Ensure teachers from the correct department teach courses
- **Availability Constraints**: Consider teacher availability and preferences
- **Hours Requirements**: Meet minimum/maximum teaching hours per term
- **Load Balancing**: Distribute teaching load across department teachers

## 📊 **Database Schema**

### **Core Tables**

```sql
-- 1. Departments (replaces subjects with better organization)
departments (
  id, name, code, description, school_id, created_at, updated_at
)

-- 2. Teacher-Department Mapping (many-to-many)
teacher_departments (
  id, teacher_id, department_id, is_primary, created_at
)

-- 3. Enhanced Courses (with department reference)
courses (
  id, name, code, department_id, min_hours_per_term, max_hours_per_term, ...
)

-- 4. Flexible Grade Mappings
course_grade_mappings (
  id, course_id, grade_level, is_default, class_section_ids
)
```

### **Key Relationships**

```
School → Departments → Courses → Class Offerings → Teaching Assignments
   ↓
Teachers → Teacher Departments → Departments
   ↓
Course Grade Mappings → Class Sections
```

## 🎓 **Use Case Examples**

### **Example 1: Multi-Department Teacher**
```
Teacher: Dr. Sarah Johnson
Departments: 
- Primary: Science (Biology, Chemistry)
- Secondary: English (Literature)

Courses she can teach:
- Science 101 (Biology) ✅
- Science 201 (Chemistry) ✅  
- English 301 (Literature) ✅
- Math 101 (Algebra) ❌ (not in her departments)
```

### **Example 2: Department Course Ownership**
```
Science Department:
- Science 001: Introduction to Biology
- Science 002: Chemistry Fundamentals
- Science 003: Physics Basics

Teachers: Dr. Johnson, Dr. Smith, Dr. Brown
All can teach any Science course based on availability
```

### **Example 3: Flexible Grade Mapping**
```
Course: Science 001
Grade Mappings:
- Grade 9: Default (all sections)
- Grade 10: Custom (only sections A, B, C)
- Grade 11: Not offered
```

## 🤖 **AI Scheduling Algorithm Logic**

### **1. Teacher Assignment Rules**
```typescript
function assignTeacherToCourse(course, availableTeachers) {
  // 1. Filter teachers by department
  const departmentTeachers = availableTeachers.filter(
    teacher => teacher.departments.includes(course.department_id)
  );
  
  // 2. Check availability
  const availableDepartmentTeachers = departmentTeachers.filter(
    teacher => isAvailable(teacher, course.timeSlot)
  );
  
  // 3. Check hours constraints
  const qualifiedTeachers = availableDepartmentTeachers.filter(
    teacher => canTakeMoreHours(teacher, course.min_hours_per_term)
  );
  
  // 4. Select optimal teacher (load balancing, preferences, etc.)
  return selectOptimalTeacher(qualifiedTeachers, course);
}
```

### **2. Course Scheduling Constraints**
```typescript
function validateCourseSchedule(course, term) {
  // 1. Minimum hours requirement
  const totalHours = calculateTotalHours(course, term);
  if (totalHours < course.min_hours_per_term) {
    return { valid: false, reason: 'Insufficient hours' };
  }
  
  // 2. Maximum hours limit
  if (course.max_hours_per_term && totalHours > course.max_hours_per_term) {
    return { valid: false, reason: 'Exceeds maximum hours' };
  }
  
  // 3. Teacher availability
  const teachers = getDepartmentTeachers(course.department_id);
  const availableTeachers = teachers.filter(t => isAvailableForCourse(t, course));
  
  if (availableTeachers.length === 0) {
    return { valid: false, reason: 'No available teachers' };
  }
  
  return { valid: true };
}
```

### **3. Grade-Level Assignment Logic**
```typescript
function getAffectedClassSections(course, gradeLevel) {
  const mapping = course.gradeMappings.find(m => m.grade_level === gradeLevel);
  
  if (mapping.is_default) {
    // Apply to all sections of this grade
    return getAllClassSections(gradeLevel);
  } else {
    // Apply only to specific sections
    return mapping.class_section_ids;
  }
}
```

## 🚀 **Implementation Benefits**

### **1. Real-World Alignment**
- ✅ Matches actual school organizational structure
- ✅ Clear department responsibilities
- ✅ Logical teacher assignments

### **2. Scalability**
- ✅ Easy to add new departments
- ✅ Flexible teacher assignments
- ✅ Customizable grade mappings

### **3. AI Scheduling Intelligence**
- ✅ Department-based teacher filtering
- ✅ Availability-aware assignments
- ✅ Hours requirement enforcement
- ✅ Load balancing across departments

### **4. User Experience**
- ✅ Intuitive department management
- ✅ Clear teacher qualifications
- ✅ Flexible course offerings
- ✅ Better scheduling outcomes

## 📋 **Migration Strategy**

### **Phase 1: Schema Migration**
1. Create new tables (departments, teacher_departments, etc.)
2. Migrate existing subjects to departments
3. Update courses with department references
4. Create teacher-department mappings

### **Phase 2: UI Updates**
1. Replace subjects pages with departments
2. Update teacher management with department assignments
3. Enhance course management with grade mappings
4. Update class offerings with new relationships

### **Phase 3: AI Integration**
1. Update scheduling algorithm with department logic
2. Implement hours requirement validation
3. Add load balancing across departments
4. Test and optimize scheduling outcomes

## 🎯 **Next Steps**

1. **Review and approve** this design
2. **Run the migration** to implement the new schema
3. **Update the UI components** to use departments
4. **Enhance the AI scheduler** with department logic
5. **Test the complete system** with real data

This design provides a solid foundation for a more intelligent and realistic school management system! 🎓 