# Holidays and Working Days Integration Design

## Overview

This document outlines how holidays and working days configuration are integrated into the school management system to ensure accurate course hours calculation and scheduling. The system factors in holidays, weekends, and working days to provide realistic teaching hour requirements and availability.

## Key Components

### 1. Holidays Management

#### Holiday Types
- **Public Holiday**: National/state holidays (e.g., Independence Day, Christmas)
- **School Holiday**: School-specific holidays (e.g., Founder's Day, Sports Day)
- **Exam Day**: Days when regular classes are suspended for exams
- **Event Day**: Special events that affect regular teaching schedule

#### Holiday Structure
```sql
CREATE TABLE holidays (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('public_holiday', 'school_holiday', 'exam_day', 'event_day')),
    description TEXT,
    academic_year_id UUID NOT NULL,
    school_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, school_id) -- Prevent duplicate holidays on same date
);
```

### 2. Working Days Configuration

#### Configuration Structure
```sql
CREATE TABLE working_days_config (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL,
    academic_year_id UUID NOT NULL,
    term_id UUID NOT NULL,
    working_days_per_week INTEGER NOT NULL DEFAULT 5,
    hours_per_day DECIMAL(4,2) NOT NULL DEFAULT 6.0,
    periods_per_day INTEGER NOT NULL DEFAULT 6,
    period_duration_minutes INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, academic_year_id, term_id)
);
```

#### Configuration Parameters
- **Working Days Per Week**: Number of teaching days (1-7)
- **Hours Per Day**: Total teaching hours per day
- **Periods Per Day**: Number of class periods per day
- **Period Duration**: Length of each period in minutes

### 3. Hours Calculation Functions

#### Available Teaching Hours Calculation
```sql
CREATE OR REPLACE FUNCTION calculate_available_teaching_hours(
    term_start_date DATE,
    term_end_date DATE,
    school_id UUID,
    academic_year_id UUID
)
RETURNS TABLE(
    total_working_days INTEGER,
    total_teaching_hours DECIMAL(8,2),
    holidays_count INTEGER,
    weekends_count INTEGER
)
```

#### Calculation Logic
1. **Get Working Days Configuration**: Retrieve school's working days setup
2. **Iterate Through Date Range**: Check each day from term start to end
3. **Classify Days**:
   - Weekend days (Saturday/Sunday)
   - Holiday days (from holidays table)
   - Working days (available for teaching)
4. **Calculate Total Hours**: Working days × Hours per day

#### Course Hours Validation
```sql
CREATE OR REPLACE FUNCTION validate_course_hours_requirements(
    course_id UUID,
    term_id UUID
)
RETURNS TABLE(
    is_valid BOOLEAN,
    required_hours INTEGER,
    available_hours DECIMAL(8,2),
    deficit_hours DECIMAL(8,2),
    message TEXT
)
```

## Integration with Course Management

### 1. Course Hours Requirements

#### Course Structure Enhancement
```sql
ALTER TABLE courses 
ADD COLUMN min_hours_per_term INTEGER DEFAULT 0,
ADD COLUMN max_hours_per_term INTEGER DEFAULT NULL;
```

#### Hours Validation Process
1. **Course Creation**: Set minimum/maximum hours per term
2. **Term Assignment**: Validate against available teaching hours
3. **Real-time Validation**: Check feasibility during scheduling

### 2. Bulk Course Creation with Hours

#### Template-based Creation
```sql
CREATE TABLE course_templates (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    department_id UUID NOT NULL,
    grade_levels INTEGER[] NOT NULL,
    min_hours_per_term INTEGER DEFAULT 0,
    max_hours_per_term INTEGER DEFAULT NULL,
    school_id UUID NOT NULL
);
```

#### Smart Hours Assignment
- **Default Hours**: Apply template hours to all grades
- **Custom Hours**: Override with grade-specific requirements
- **Validation**: Ensure hours are achievable within term constraints

## User Interface Components

### 1. Holiday Management Interface

#### Features
- **Calendar View**: Visual holiday calendar with color coding
- **Bulk Import**: Import holidays from CSV/Excel files
- **Recurring Holidays**: Set up annual recurring holidays
- **Holiday Types**: Different icons/colors for different holiday types
- **Academic Year Filtering**: View holidays by academic year

#### Components
```typescript
// Holiday Calendar Component
interface HolidayCalendarProps {
  academicYearId: string;
  schoolId: string;
  onHolidaySelect: (holiday: Holiday) => void;
  onHolidayCreate: (date: Date) => void;
}

// Holiday Management Modal
interface HolidayModalProps {
  holiday?: Holiday;
  academicYearId: string;
  schoolId: string;
  onSave: (holiday: HolidayInsert) => void;
  onDelete?: (id: string) => void;
}
```

### 2. Working Days Configuration Interface

#### Features
- **Term-based Configuration**: Set different configs per term
- **Visual Schedule Builder**: Drag-and-drop interface for period setup
- **Validation Feedback**: Real-time validation of configuration
- **Template System**: Save and reuse configurations

#### Components
```typescript
// Working Days Config Form
interface WorkingDaysConfigFormProps {
  termId: string;
  academicYearId: string;
  schoolId: string;
  config?: WorkingDaysConfig;
  onSave: (config: WorkingDaysConfigInsert) => void;
}

// Period Schedule Builder
interface PeriodScheduleBuilderProps {
  periodsPerDay: number;
  periodDuration: number;
  onPeriodChange: (periods: Period[]) => void;
}
```

### 3. Course Hours Validation Interface

#### Features
- **Real-time Validation**: Show hours feasibility during course creation
- **Visual Indicators**: Green/red indicators for achievable hours
- **Suggestions**: Recommend adjustments for unachievable hours
- **Term Comparison**: Compare hours across different terms

#### Components
```typescript
// Hours Validation Display
interface HoursValidationProps {
  courseId: string;
  termId: string;
  requiredHours: number;
  onValidationResult: (result: ValidationResult) => void;
}

// Term Hours Comparison
interface TermHoursComparisonProps {
  courseId: string;
  academicYearId: string;
  onTermSelect: (termId: string) => void;
}
```

## API Endpoints

### 1. Holiday Management APIs

```typescript
// GET /api/holidays
// Query parameters: schoolId, academicYearId, startDate, endDate
async function getHolidays(params: HolidayQueryParams): Promise<Holiday[]>

// POST /api/holidays
async function createHoliday(holiday: HolidayInsert): Promise<Holiday>

// PUT /api/holidays/:id
async function updateHoliday(id: string, updates: HolidayUpdate): Promise<Holiday>

// DELETE /api/holidays/:id
async function deleteHoliday(id: string): Promise<boolean>

// GET /api/holidays/calculate-hours
async function calculateAvailableHours(params: HoursCalculationParams): Promise<HoursCalculation>
```

### 2. Working Days Configuration APIs

```typescript
// GET /api/working-days-config
async function getWorkingDaysConfig(params: ConfigQueryParams): Promise<WorkingDaysConfig[]>

// POST /api/working-days-config
async function createWorkingDaysConfig(config: WorkingDaysConfigInsert): Promise<WorkingDaysConfig>

// PUT /api/working-days-config/:id
async function updateWorkingDaysConfig(id: string, updates: WorkingDaysConfigUpdate): Promise<WorkingDaysConfig>

// GET /api/working-days-config/validate
async function validateWorkingDaysConfig(config: WorkingDaysConfigInsert): Promise<ValidationResult>
```

### 3. Course Hours Validation APIs

```typescript
// GET /api/courses/:id/validate-hours
async function validateCourseHours(courseId: string, termId: string): Promise<HoursValidationResult>

// GET /api/terms/:id/available-hours
async function getTermAvailableHours(termId: string): Promise<AvailableHours>
```

## Scheduling Algorithm Integration

### 1. AI Scheduling Considerations

#### Holiday Awareness
- **Exclude Holiday Dates**: Never schedule classes on holidays
- **Holiday Proximity**: Consider holidays when planning exam schedules
- **Make-up Classes**: Suggest make-up sessions for holiday-affected courses

#### Working Days Optimization
- **Period Distribution**: Distribute periods across available working days
- **Teacher Availability**: Consider teacher constraints within working hours
- **Room Utilization**: Optimize room usage during available periods

### 2. Conflict Resolution

#### Holiday Conflicts
- **Automatic Detection**: Flag courses requiring hours on holidays
- **Alternative Scheduling**: Suggest alternative time slots
- **Hours Redistribution**: Distribute lost hours across other days

#### Working Days Conflicts
- **Period Overflow**: Handle courses requiring more periods than available
- **Teacher Overload**: Prevent teacher scheduling beyond working hours
- **Room Conflicts**: Resolve room booking conflicts within working hours

## Data Flow

### 1. Course Creation Flow
```
1. User creates course with hours requirement
2. System validates against term's available hours
3. If valid: Course created successfully
4. If invalid: Show warning with suggestions
5. User adjusts hours or term selection
6. Re-validate until requirements are met
```

### 2. Holiday Management Flow
```
1. Admin adds/updates holidays
2. System recalculates available hours for affected terms
3. Notify courses that may be affected
4. Suggest adjustments to course hours if needed
5. Update scheduling constraints
```

### 3. Working Days Configuration Flow
```
1. Admin configures working days for term
2. System validates configuration
3. Calculate new available hours
4. Update all course validations
5. Notify affected schedules
```

## Benefits

### 1. Accurate Planning
- **Realistic Hours**: Course hours based on actual available teaching time
- **Holiday Awareness**: No scheduling conflicts with holidays
- **Term-specific**: Different configurations for different terms

### 2. Better Scheduling
- **Optimized Distribution**: Better period distribution across working days
- **Conflict Prevention**: Prevent scheduling on holidays
- **Resource Optimization**: Better utilization of teachers and rooms

### 3. Compliance
- **Regulatory Requirements**: Meet minimum teaching hours requirements
- **Audit Trail**: Track hours calculation and validation
- **Documentation**: Clear documentation of holiday and working day policies

## Implementation Priority

### Phase 1: Core Infrastructure
1. Database schema and functions
2. Basic API endpoints
3. Simple UI for holiday management

### Phase 2: Enhanced Features
1. Working days configuration UI
2. Course hours validation
3. Bulk holiday import

### Phase 3: Advanced Integration
1. AI scheduling integration
2. Advanced validation rules
3. Reporting and analytics

## Conclusion

The integration of holidays and working days configuration provides a robust foundation for accurate course hours calculation and scheduling. This system ensures that:

1. **Course hours are realistic** and achievable within the available teaching time
2. **Holidays are respected** and never conflict with scheduled classes
3. **Working days are optimized** for maximum teaching efficiency
4. **Scheduling is intelligent** and considers all temporal constraints

This design provides a comprehensive solution that scales from simple holiday management to complex multi-term scheduling with AI optimization. 