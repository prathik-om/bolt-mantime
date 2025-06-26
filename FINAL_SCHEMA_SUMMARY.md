# Final Database Schema Summary

## Core Tables

### Schools
- Primary table for school management
- Key fields: id (uuid), name, user_id
- Configuration fields: start_time, end_time, period_duration, sessions_per_day
- Working days configuration and lesson constraints
- Strict validation on period duration (15-240 mins) and lessons per day

### Academic Years & Terms
- Academic years linked to schools
- Terms with start/end dates
- Period duration settings (30-120 mins)
- Strict date validation and overlap prevention

### Departments & Subjects
- Departments organize subjects and teachers
- Subjects with total hours per year
- Hours distribution types (equal/custom)
- Subject types: core, elective, activity, language

### Classes & Grade Subjects
- Class definitions with grade levels
- Grade-subject mappings
- Class offerings linking classes to subjects
- Term-specific curriculum delivery

## Teacher Management

### Teachers
- Core teacher information
- Workload constraints (max_periods_per_week)
- Generated full_name field
- Unique email and name constraints per school

### Teacher Qualifications & Assignments
- Subject qualifications with proficiency levels
- Department assignments (primary/secondary)
- Time constraints (unavailable/prefers/avoid)
- Teaching assignments linking teachers to class offerings

## Timetabling System

### Time Slots
- School-specific time slots
- Day and period organization
- Slot types: regular, break, lunch, assembly, activity
- Duration validation and overlap prevention
- Generated duration_minutes field

### Timetable Entries
- Bigint primary key for performance
- Links teaching assignments to specific times
- Date and time slot based scheduling
- Version control through timetable_generation_id
- Conflict prevention:
  - No teacher double booking
  - No class double booking
  - EXCLUDE constraints using gist

### Timetable Generations
- Version control for timetables
- Status tracking (draft/review/active/archived)
- Term-based organization
- Audit fields (generated_by, generated_at)

## Security & Access Control

### Row Level Security (RLS)
- School-based access control
- User-specific policies for CRUD operations
- Role-based access (admin, teacher)
- Strict validation triggers

### Constraints & Validations
- Foreign key constraints with ON DELETE CASCADE where appropriate
- Unique constraints for business rules
- Check constraints for data integrity
- Automated validation triggers

## Views & Performance

### Materialized Views
- class_schedules_view for efficient querying
- Indexes on frequently accessed columns
- Composite indexes for complex queries
- EXCLUDE constraints using btree_gist

## Notable Features

1. **Versioning Support**
   - Multiple timetable versions per term
   - Status tracking for timetable generations
   - Audit trails for changes

2. **Flexible Configuration**
   - School-specific time slots
   - Custom working days
   - Configurable period durations

3. **Constraint Management**
   - Teacher availability and preferences
   - Class scheduling rules
   - Room allocation (removed in latest version)

4. **Data Integrity**
   - Comprehensive foreign key relationships
   - Unique constraints for business rules
   - Automated validation triggers

5. **Performance Optimization**
   - Strategic use of indexes
   - Materialized views
   - Efficient conflict prevention 