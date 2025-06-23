# Enhanced Teacher Assignment System Design

## Overview

This document outlines the enhanced teacher assignment system that combines AI-powered automatic assignments with manual override capabilities. The system provides intelligent teacher suggestions while allowing administrators to make manual assignments with AI insights for better resource management.

## Key Features

### 1. **Hybrid Assignment Model**
- **AI Assignment**: Automatic teacher assignment based on department, workload, and preferences
- **Manual Assignment**: Admin override with AI insights and validation
- **AI-Suggested**: AI recommendations that require admin approval

### 2. **Smart Teacher Suggestions**
- **Department Matching**: Prioritize teachers from the course's department
- **Workload Optimization**: Consider current teaching load and availability
- **Grade Preferences**: Match teachers with their preferred grade levels
- **Conflict Detection**: Identify scheduling conflicts and constraints

### 3. **Workload Management**
- **Real-time Tracking**: Monitor teacher workload across terms
- **Status Classification**: Available, Moderate, High, Overloaded
- **Utilization Metrics**: Percentage of capacity used
- **Resource Optimization**: Balance workload across teachers

## System Architecture

### 1. **Database Schema Enhancements**

#### Enhanced Class Offerings
```sql
ALTER TABLE class_offerings 
ADD COLUMN assignment_type TEXT DEFAULT 'ai' CHECK (assignment_type IN ('ai', 'manual', 'ai_suggested')),
ADD COLUMN ai_assigned_teacher_id UUID REFERENCES teachers(id),
ADD COLUMN manual_assigned_teacher_id UUID REFERENCES teachers(id),
ADD COLUMN assignment_notes TEXT,
ADD COLUMN assignment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

#### Teacher Workload Tracking
```sql
CREATE TABLE teacher_workload (
    id UUID PRIMARY KEY,
    teacher_id UUID NOT NULL,
    academic_year_id UUID NOT NULL,
    term_id UUID NOT NULL,
    current_hours_per_week DECIMAL(4,2) DEFAULT 0,
    max_hours_per_week INTEGER DEFAULT 25,
    current_courses_count INTEGER DEFAULT 0,
    max_courses_count INTEGER DEFAULT 6,
    workload_status TEXT DEFAULT 'available',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, academic_year_id, term_id)
);
```

#### AI Assignment Suggestions
```sql
CREATE TABLE ai_teacher_assignments (
    id UUID PRIMARY KEY,
    class_offering_id UUID NOT NULL,
    suggested_teacher_id UUID NOT NULL,
    confidence_score DECIMAL(3,2),
    reasoning TEXT,
    alternative_teachers UUID[],
    conflicts_detected TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_applied BOOLEAN DEFAULT false
);
```

#### Enhanced Teacher Departments
```sql
ALTER TABLE teacher_departments 
ADD COLUMN max_hours_per_week INTEGER DEFAULT 25,
ADD COLUMN preferred_grade_levels INTEGER[];
```

### 2. **Core Functions**

#### Teacher Workload Insights
```sql
CREATE OR REPLACE FUNCTION get_teacher_workload_insights(
    school_id UUID,
    academic_year_id UUID,
    term_id UUID
)
RETURNS TABLE(
    teacher_id UUID,
    teacher_name TEXT,
    department_name TEXT,
    current_hours_per_week DECIMAL(4,2),
    max_hours_per_week INTEGER,
    workload_status TEXT,
    available_hours DECIMAL(4,2),
    utilization_percentage DECIMAL(5,2),
    recommended_for_new_assignments BOOLEAN
)
```

#### Teacher Suggestions for Course
```sql
CREATE OR REPLACE FUNCTION suggest_teachers_for_course(
    course_id UUID,
    class_section_id UUID,
    academic_year_id UUID,
    term_id UUID
)
RETURNS TABLE(
    teacher_id UUID,
    teacher_name TEXT,
    department_name TEXT,
    confidence_score DECIMAL(3,2),
    reasoning TEXT,
    current_workload DECIMAL(4,2),
    available_hours DECIMAL(4,2),
    grade_preference_match BOOLEAN,
    department_match BOOLEAN
)
```

## Assignment Workflows

### 1. **AI Assignment Workflow**

```
1. Course Creation/Update
   ↓
2. AI Analysis
   ├── Department Matching
   ├── Workload Assessment
   ├── Grade Preference Check
   ├── Conflict Detection
   └── Confidence Scoring
   ↓
3. Teacher Selection
   ├── Highest Confidence Score
   ├── Workload Balance
   └── Department Alignment
   ↓
4. Assignment Application
   ├── Update Class Offering
   ├── Update Teacher Workload
   └── Record AI Assignment
   ↓
5. Validation & Notification
   ├── Conflict Check
   ├── Admin Notification
   └── Teacher Notification
```

### 2. **Manual Assignment Workflow**

```
1. Admin Initiates Manual Assignment
   ↓
2. AI Provides Insights
   ├── Teacher Suggestions
   ├── Workload Analysis
   ├── Conflict Warnings
   └── Department Compatibility
   ↓
3. Admin Reviews Options
   ├── View AI Suggestions
   ├── Check Teacher Details
   ├── Review Workload Status
   └── Consider Conflicts
   ↓
4. Manual Assignment
   ├── Select Teacher
   ├── Add Assignment Notes
   └── Override AI (if needed)
   ↓
5. Validation & Application
   ├── Conflict Validation
   ├── Workload Update
   └── Assignment Recording
```

### 3. **AI-Suggested Workflow**

```
1. AI Generates Suggestions
   ↓
2. Admin Review Queue
   ├── View All Suggestions
   ├── Confidence Scores
   ├── Reasoning Display
   └── Alternative Options
   ↓
3. Admin Decision
   ├── Accept Suggestion
   ├── Modify Assignment
   ├── Reject & Request New
   └── Manual Override
   ↓
4. Assignment Execution
   ├── Apply Selected Teacher
   ├── Update Workload
   └── Record Decision
```

## User Interface Components

### 1. **Teacher Assignment Dashboard**

#### Features
- **Assignment Overview**: Summary of AI vs Manual assignments
- **Workload Distribution**: Visual representation of teacher workload
- **Pending Actions**: AI suggestions requiring review
- **Conflict Alerts**: Real-time conflict notifications

#### Components
```typescript
interface TeacherAssignmentDashboardProps {
  schoolId: string;
  academicYearId: string;
  termId: string;
  onAssignmentUpdate: (assignment: TeacherAssignment) => void;
}

interface AssignmentOverviewCard {
  totalAssignments: number;
  aiAssignments: number;
  manualAssignments: number;
  pendingSuggestions: number;
  workloadDistribution: WorkloadStats;
}
```

### 2. **AI Teacher Suggestion Modal**

#### Features
- **Confidence Scores**: Visual confidence indicators
- **Detailed Reasoning**: AI explanation for each suggestion
- **Alternative Teachers**: Backup options with scores
- **Conflict Warnings**: Clear conflict identification

#### Components
```typescript
interface AITeacherSuggestionModalProps {
  courseId: string;
  classSectionId: string;
  academicYearId: string;
  termId: string;
  onTeacherSelect: (teacherId: string, assignmentType: AssignmentType) => void;
  onClose: () => void;
}

interface TeacherSuggestion {
  teacherId: string;
  teacherName: string;
  departmentName: string;
  confidenceScore: number;
  reasoning: string;
  currentWorkload: number;
  availableHours: number;
  gradePreferenceMatch: boolean;
  departmentMatch: boolean;
  conflicts: string[];
}
```

### 3. **Manual Assignment Interface**

#### Features
- **Teacher Search**: Filter by department, workload, availability
- **Workload Insights**: Real-time workload status
- **Conflict Detection**: Immediate conflict warnings
- **Assignment History**: Track assignment changes

#### Components
```typescript
interface ManualAssignmentFormProps {
  classOfferingId: string;
  courseId: string;
  classSectionId: string;
  academicYearId: string;
  termId: string;
  onAssignment: (teacherId: string, notes?: string) => void;
}

interface TeacherWorkloadCard {
  teacherId: string;
  teacherName: string;
  departmentName: string;
  currentHours: number;
  maxHours: number;
  utilizationPercentage: number;
  workloadStatus: WorkloadStatus;
  recommended: boolean;
}
```

### 4. **Workload Management Dashboard**

#### Features
- **Teacher Overview**: All teachers with workload status
- **Utilization Charts**: Visual workload distribution
- **Overload Alerts**: Teachers exceeding capacity
- **Resource Optimization**: Suggestions for workload balance

#### Components
```typescript
interface WorkloadManagementDashboardProps {
  schoolId: string;
  academicYearId: string;
  termId: string;
  onWorkloadUpdate: (teacherId: string, updates: WorkloadUpdates) => void;
}

interface WorkloadInsight {
  teacherId: string;
  teacherName: string;
  departmentName: string;
  currentHoursPerWeek: number;
  maxHoursPerWeek: number;
  currentCoursesCount: number;
  maxCoursesCount: number;
  workloadStatus: WorkloadStatus;
  availableHours: number;
  utilizationPercentage: number;
  recommendedForNewAssignments: boolean;
}
```

## AI Algorithm Logic

### 1. **Teacher Scoring Algorithm**

#### Scoring Factors
```typescript
interface TeacherScore {
  departmentMatch: number;        // 0-1: Perfect department match
  gradePreference: number;        // 0-1: Grade level preference
  workloadAvailability: number;   // 0-1: Available capacity
  experienceLevel: number;        // 0-1: Teaching experience
  conflictScore: number;          // 0-1: Scheduling conflicts
  performanceRating: number;      // 0-1: Historical performance
}

const calculateConfidenceScore = (scores: TeacherScore): number => {
  const weights = {
    departmentMatch: 0.25,
    gradePreference: 0.20,
    workloadAvailability: 0.25,
    experienceLevel: 0.15,
    conflictScore: 0.10,
    performanceRating: 0.05
  };
  
  return Object.entries(scores).reduce((total, [key, score]) => {
    return total + (score * weights[key as keyof TeacherScore]);
  }, 0);
};
```

#### Confidence Score Ranges
- **0.90-1.00**: Perfect match (department + grade + available)
- **0.80-0.89**: Excellent match (department + available)
- **0.70-0.79**: Good match (department + moderate workload)
- **0.60-0.69**: Acceptable match (different department + available)
- **0.50-0.59**: Poor match (limited availability)
- **< 0.50**: Not recommended

### 2. **Conflict Detection Logic**

#### Types of Conflicts
```typescript
interface ConflictDetection {
  timeConflicts: TimeConflict[];
  workloadConflicts: WorkloadConflict[];
  departmentConflicts: DepartmentConflict[];
  preferenceConflicts: PreferenceConflict[];
}

interface TimeConflict {
  type: 'same_time_slot' | 'adjacent_slots' | 'travel_time';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedAssignments: string[];
}
```

#### Conflict Resolution
1. **Time Conflicts**: Check for overlapping time slots
2. **Workload Conflicts**: Ensure teacher capacity
3. **Department Conflicts**: Verify department alignment
4. **Preference Conflicts**: Consider teacher preferences

### 3. **Workload Optimization**

#### Optimization Goals
```typescript
interface WorkloadOptimization {
  goals: {
    balanceWorkload: boolean;     // Distribute workload evenly
    minimizeOverload: boolean;    // Prevent teacher overload
    maximizeUtilization: boolean; // Efficient resource use
    respectPreferences: boolean;  // Honor teacher preferences
  };
  constraints: {
    maxHoursPerWeek: number;
    maxCoursesPerTeacher: number;
    departmentAlignment: boolean;
    gradePreferences: boolean;
  };
}
```

## API Endpoints

### 1. **Teacher Assignment APIs**

```typescript
// GET /api/teacher-assignments/workload-insights
async function getTeacherWorkloadInsights(
  schoolId: string,
  academicYearId: string,
  termId: string
): Promise<WorkloadInsight[]>

// GET /api/teacher-assignments/suggestions
async function suggestTeachersForCourse(
  courseId: string,
  classSectionId: string,
  academicYearId: string,
  termId: string
): Promise<TeacherSuggestion[]>

// POST /api/teacher-assignments/apply
async function applyTeacherAssignment(
  classOfferingId: string,
  teacherId: string,
  assignmentType: AssignmentType
): Promise<ClassOffering>

// POST /api/teacher-assignments/validate
async function validateTeacherAssignment(
  teacherId: string,
  courseId: string,
  classSectionId: string,
  academicYearId: string,
  termId: string
): Promise<ValidationResult>
```

### 2. **Workload Management APIs**

```typescript
// GET /api/teacher-assignments/workload/:teacherId
async function getTeacherWorkload(
  teacherId: string,
  academicYearId: string,
  termId: string
): Promise<TeacherWorkload>

// PUT /api/teacher-assignments/workload/:teacherId
async function updateTeacherWorkload(
  teacherId: string,
  academicYearId: string,
  termId: string,
  updates: WorkloadUpdates
): Promise<TeacherWorkload>

// GET /api/teacher-assignments/stats
async function getAssignmentStats(
  schoolId: string,
  academicYearId: string,
  termId: string
): Promise<AssignmentStats>
```

### 3. **AI Assignment APIs**

```typescript
// POST /api/teacher-assignments/ai-suggestions
async function createAISuggestion(
  classOfferingId: string,
  suggestedTeacherId: string,
  confidenceScore: number,
  reasoning: string
): Promise<AITeacherAssignment>

// GET /api/teacher-assignments/ai-suggestions
async function getAISuggestions(
  classOfferingId?: string
): Promise<AITeacherAssignment[]>

// POST /api/teacher-assignments/bulk-assign
async function bulkAssignTeachers(
  assignments: BulkAssignment[]
): Promise<BulkAssignmentResult[]>
```

## Integration with Scheduling

### 1. **Scheduling Algorithm Integration**

#### Pre-scheduling Phase
```typescript
interface PreSchedulingPhase {
  teacherAssignments: TeacherAssignment[];
  workloadConstraints: WorkloadConstraint[];
  departmentRequirements: DepartmentRequirement[];
  conflictResolutions: ConflictResolution[];
}
```

#### Scheduling Phase
```typescript
interface SchedulingPhase {
  assignedTeachers: Map<string, string>; // courseId -> teacherId
  workloadBalancing: WorkloadBalance;
  conflictAvoidance: ConflictAvoidance;
  optimizationGoals: OptimizationGoal[];
}
```

### 2. **Conflict Resolution**

#### Automatic Resolution
1. **Time Conflicts**: Adjust time slots or suggest alternative teachers
2. **Workload Conflicts**: Redistribute assignments or extend capacity
3. **Department Conflicts**: Find alternative teachers or modify assignments

#### Manual Resolution
1. **Admin Override**: Manual assignment with conflict warnings
2. **Schedule Adjustment**: Modify existing schedules
3. **Capacity Extension**: Increase teacher capacity temporarily

## Benefits

### 1. **Efficiency**
- **Automated Assignments**: Reduce manual assignment time
- **Smart Suggestions**: AI-powered recommendations
- **Conflict Prevention**: Proactive conflict detection
- **Workload Balance**: Optimal resource distribution

### 2. **Flexibility**
- **Manual Override**: Admin control when needed
- **AI Insights**: Data-driven decision support
- **Hybrid Approach**: Best of both worlds
- **Customizable Rules**: Configurable assignment criteria

### 3. **Quality**
- **Department Alignment**: Ensure subject expertise
- **Grade Preferences**: Match teacher preferences
- **Workload Optimization**: Prevent teacher burnout
- **Performance Tracking**: Monitor assignment effectiveness

### 4. **Transparency**
- **Assignment History**: Track all assignment changes
- **AI Reasoning**: Understand AI decisions
- **Conflict Reporting**: Clear conflict identification
- **Workload Visibility**: Real-time workload status

## Implementation Priority

### Phase 1: Core Infrastructure
1. Database schema and functions
2. Basic AI suggestion algorithm
3. Workload tracking system
4. Assignment validation

### Phase 2: User Interface
1. Teacher assignment dashboard
2. AI suggestion modal
3. Manual assignment interface
4. Workload management views

### Phase 3: Advanced Features
1. Conflict resolution algorithms
2. Bulk assignment capabilities
3. Performance analytics
4. Advanced optimization

### Phase 4: Integration
1. Scheduling algorithm integration
2. Real-time notifications
3. Mobile app support
4. API documentation

## Conclusion

The enhanced teacher assignment system provides a sophisticated yet flexible approach to teacher-course assignments. By combining AI intelligence with manual control, the system ensures optimal resource utilization while maintaining administrative oversight. The workload management features help prevent teacher burnout and ensure fair distribution of responsibilities across the faculty.

This system scales from simple automatic assignments to complex multi-constraint optimization, making it suitable for schools of all sizes and complexity levels. 