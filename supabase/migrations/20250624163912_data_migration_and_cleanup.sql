-- Data Migration and Cleanup Script
-- This script validates and fixes existing data to conform to new constraints
-- Run this script after applying the new schema constraints

-- ============================================================================
-- SECTION 1: DATA VALIDATION AND REPORTING
-- ============================================================================

-- Create a temporary table to track migration issues
CREATE TEMPORARY TABLE migration_issues (
    table_name TEXT,
    issue_type TEXT,
    issue_description TEXT,
    record_id UUID,
    field_name TEXT,
    current_value TEXT,
    suggested_fix TEXT,
    severity TEXT DEFAULT 'warning'
);

-- Function to log migration issues
CREATE OR REPLACE FUNCTION log_migration_issue(
    p_table_name TEXT,
    p_issue_type TEXT,
    p_issue_description TEXT,
    p_record_id UUID DEFAULT NULL,
    p_field_name TEXT DEFAULT NULL,
    p_current_value TEXT DEFAULT NULL,
    p_suggested_fix TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT 'warning'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO migration_issues (
        table_name, issue_type, issue_description, record_id, 
        field_name, current_value, suggested_fix, severity
    ) VALUES (
        p_table_name, p_issue_type, p_issue_description, p_record_id,
        p_field_name, p_current_value, p_suggested_fix, p_severity
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 2: SCHOOLS TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for schools with invalid period durations
DO $$
DECLARE
    school_record RECORD;
BEGIN
    FOR school_record IN 
        SELECT id, name, period_duration, sessions_per_day, working_days
        FROM schools
    LOOP
        -- Check period duration
        IF school_record.period_duration IS NOT NULL AND 
           (school_record.period_duration < 15 OR school_record.period_duration > 240) THEN
            PERFORM log_migration_issue(
                'schools',
                'invalid_period_duration',
                'Period duration is outside valid range (15-240 minutes)',
                school_record.id,
                'period_duration',
                school_record.period_duration::TEXT,
                'Set to 50 (default) or valid value between 15-240',
                'error'
            );
        END IF;
        
        -- Check sessions per day
        IF school_record.sessions_per_day IS NOT NULL AND 
           (school_record.sessions_per_day <= 0 OR school_record.sessions_per_day > 20) THEN
            PERFORM log_migration_issue(
                'schools',
                'invalid_sessions_per_day',
                'Sessions per day is outside valid range (1-20)',
                school_record.id,
                'sessions_per_day',
                school_record.sessions_per_day::TEXT,
                'Set to 8 (default) or valid value between 1-20',
                'error'
            );
        END IF;
        
        -- Check working days
        IF school_record.working_days IS NULL OR array_length(school_record.working_days, 1) = 0 THEN
            PERFORM log_migration_issue(
                'schools',
                'missing_working_days',
                'No working days specified',
                school_record.id,
                'working_days',
                array_to_string(school_record.working_days, ','),
                'Set to default: {monday,tuesday,wednesday,thursday,friday}',
                'error'
            );
        END IF;
    END LOOP;
END $$;

-- Fix schools with invalid data
UPDATE schools 
SET period_duration = 50 
WHERE period_duration IS NULL OR period_duration < 15 OR period_duration > 240;

UPDATE schools 
SET sessions_per_day = 8 
WHERE sessions_per_day IS NULL OR sessions_per_day <= 0 OR sessions_per_day > 20;

UPDATE schools 
SET working_days = ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
WHERE working_days IS NULL OR array_length(working_days, 1) = 0;

-- ============================================================================
-- SECTION 3: ACADEMIC YEARS TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for academic years with invalid dates
DO $$
DECLARE
    year_record RECORD;
BEGIN
    FOR year_record IN 
        SELECT id, name, start_date, end_date, school_id
        FROM academic_years
    LOOP
        -- Check date validity
        IF year_record.start_date >= year_record.end_date THEN
            PERFORM log_migration_issue(
                'academic_years',
                'invalid_date_range',
                'End date must be after start date',
                year_record.id,
                'dates',
                year_record.start_date::TEXT || ' to ' || year_record.end_date::TEXT,
                'Fix date range so end_date > start_date',
                'error'
            );
        END IF;
        
        -- Check for overlapping academic years
        IF EXISTS (
            SELECT 1 FROM academic_years 
            WHERE school_id = year_record.school_id 
            AND id != year_record.id
            AND (
                (start_date, end_date) OVERLAPS (year_record.start_date, year_record.end_date)
            )
        ) THEN
            PERFORM log_migration_issue(
                'academic_years',
                'overlapping_dates',
                'Academic year dates overlap with another academic year',
                year_record.id,
                'dates',
                year_record.start_date::TEXT || ' to ' || year_record.end_date::TEXT,
                'Adjust dates to avoid overlap',
                'warning'
            );
        END IF;
    END LOOP;
END $$;

-- Fix academic years with invalid dates (extend end date by 1 year if start >= end)
UPDATE academic_years 
SET end_date = start_date + INTERVAL '1 year'
WHERE start_date >= end_date;

-- ============================================================================
-- SECTION 4: TERMS TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for terms with invalid data
DO $$
DECLARE
    term_record RECORD;
    academic_start DATE;
    academic_end DATE;
BEGIN
    FOR term_record IN 
        SELECT t.id, t.name, t.start_date, t.end_date, t.period_duration_minutes, t.academic_year_id
        FROM terms t
    LOOP
        -- Check date validity
        IF term_record.start_date >= term_record.end_date THEN
            PERFORM log_migration_issue(
                'terms',
                'invalid_date_range',
                'Term end date must be after start date',
                term_record.id,
                'dates',
                term_record.start_date::TEXT || ' to ' || term_record.end_date::TEXT,
                'Fix date range so end_date > start_date',
                'error'
            );
        END IF;
        
        -- Check period duration
        IF term_record.period_duration_minutes IS NOT NULL AND 
           (term_record.period_duration_minutes < 30 OR term_record.period_duration_minutes > 120) THEN
            PERFORM log_migration_issue(
                'terms',
                'invalid_period_duration',
                'Period duration is outside valid range (30-120 minutes)',
                term_record.id,
                'period_duration_minutes',
                term_record.period_duration_minutes::TEXT,
                'Set to 50 (default) or valid value between 30-120',
                'error'
            );
        END IF;
        
        -- Check if term dates are within academic year
        SELECT start_date, end_date INTO academic_start, academic_end
        FROM academic_years WHERE id = term_record.academic_year_id;
        
        IF term_record.start_date < academic_start OR term_record.end_date > academic_end THEN
            PERFORM log_migration_issue(
                'terms',
                'dates_outside_academic_year',
                'Term dates are outside academic year dates',
                term_record.id,
                'dates',
                term_record.start_date::TEXT || ' to ' || term_record.end_date::TEXT,
                'Adjust dates to be within academic year: ' || academic_start::TEXT || ' to ' || academic_end::TEXT,
                'error'
            );
        END IF;
    END LOOP;
END $$;

-- Fix terms with invalid data
UPDATE terms 
SET end_date = start_date + INTERVAL '3 months'
WHERE start_date >= end_date;

UPDATE terms 
SET period_duration_minutes = 50
WHERE period_duration_minutes IS NULL OR period_duration_minutes < 30 OR period_duration_minutes > 120;

-- Fix terms outside academic year dates
UPDATE terms 
SET start_date = (
    SELECT start_date FROM academic_years WHERE id = terms.academic_year_id
)
WHERE start_date < (
    SELECT start_date FROM academic_years WHERE id = terms.academic_year_id
);

UPDATE terms 
SET end_date = (
    SELECT end_date FROM academic_years WHERE id = terms.academic_year_id
)
WHERE end_date > (
    SELECT end_date FROM academic_years WHERE id = terms.academic_year_id
);

-- ============================================================================
-- SECTION 5: DEPARTMENTS TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for departments with invalid data
DO $$
DECLARE
    dept_record RECORD;
BEGIN
    FOR dept_record IN 
        SELECT id, name, code, description, school_id
        FROM departments
    LOOP
        -- Check name length
        IF length(dept_record.name) > 100 THEN
            PERFORM log_migration_issue(
                'departments',
                'name_too_long',
                'Department name exceeds 100 characters',
                dept_record.id,
                'name',
                dept_record.name,
                'Truncate to 100 characters',
                'error'
            );
        END IF;
        
        -- Check code length
        IF dept_record.code IS NOT NULL AND length(dept_record.code) > 20 THEN
            PERFORM log_migration_issue(
                'departments',
                'code_too_long',
                'Department code exceeds 20 characters',
                dept_record.id,
                'code',
                dept_record.code,
                'Truncate to 20 characters',
                'error'
            );
        END IF;
        
        -- Check description length
        IF dept_record.description IS NOT NULL AND length(dept_record.description) > 500 THEN
            PERFORM log_migration_issue(
                'departments',
                'description_too_long',
                'Department description exceeds 500 characters',
                dept_record.id,
                'description',
                dept_record.description,
                'Truncate to 500 characters',
                'warning'
            );
        END IF;
    END LOOP;
END $$;

-- Fix departments with invalid data
UPDATE departments 
SET name = substring(name, 1, 100)
WHERE length(name) > 100;

UPDATE departments 
SET code = substring(code, 1, 20)
WHERE code IS NOT NULL AND length(code) > 20;

UPDATE departments 
SET description = substring(description, 1, 500)
WHERE description IS NOT NULL AND length(description) > 500;

-- ============================================================================
-- SECTION 6: COURSES TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for courses with invalid data
DO $$
DECLARE
    course_record RECORD;
BEGIN
    FOR course_record IN 
        SELECT id, name, code, grade_level, total_hours_per_year, school_id, department_id
        FROM courses
    LOOP
        -- Check grade level
        IF course_record.grade_level < 1 OR course_record.grade_level > 12 THEN
            PERFORM log_migration_issue(
                'courses',
                'invalid_grade_level',
                'Grade level must be between 1 and 12',
                course_record.id,
                'grade_level',
                course_record.grade_level::TEXT,
                'Set to valid grade level (1-12)',
                'error'
            );
        END IF;
        
        -- Check total hours
        IF course_record.total_hours_per_year <= 0 THEN
            PERFORM log_migration_issue(
                'courses',
                'invalid_total_hours',
                'Total hours per year must be positive',
                course_record.id,
                'total_hours_per_year',
                course_record.total_hours_per_year::TEXT,
                'Set to 120 (default) or valid positive value',
                'error'
            );
        END IF;
        
        -- Check name length
        IF length(course_record.name) > 100 THEN
            PERFORM log_migration_issue(
                'courses',
                'name_too_long',
                'Course name exceeds 100 characters',
                course_record.id,
                'name',
                course_record.name,
                'Truncate to 100 characters',
                'error'
            );
        END IF;
        
        -- Check code length
        IF course_record.code IS NOT NULL AND length(course_record.code) > 20 THEN
            PERFORM log_migration_issue(
                'courses',
                'code_too_long',
                'Course code exceeds 20 characters',
                course_record.id,
                'code',
                course_record.code,
                'Truncate to 20 characters',
                'error'
            );
        END IF;
    END LOOP;
END $$;

-- Fix courses with invalid data
UPDATE courses 
SET grade_level = 9
WHERE grade_level < 1 OR grade_level > 12;

UPDATE courses 
SET total_hours_per_year = 120
WHERE total_hours_per_year <= 0;

UPDATE courses 
SET name = substring(name, 1, 100)
WHERE length(name) > 100;

UPDATE courses 
SET code = substring(code, 1, 20)
WHERE code IS NOT NULL AND length(code) > 20;

-- ============================================================================
-- SECTION 7: CLASSES TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for classes with invalid data
DO $$
DECLARE
    class_record RECORD;
BEGIN
    FOR class_record IN 
        SELECT id, name, grade_level, school_id
        FROM classes
    LOOP
        -- Check grade level
        IF class_record.grade_level < 1 OR class_record.grade_level > 12 THEN
            PERFORM log_migration_issue(
                'classes',
                'invalid_grade_level',
                'Grade level must be between 1 and 12',
                class_record.id,
                'grade_level',
                class_record.grade_level::TEXT,
                'Set to valid grade level (1-12)',
                'error'
            );
        END IF;
        
        -- Check name length
        IF length(class_record.name) > 100 THEN
            PERFORM log_migration_issue(
                'classes',
                'name_too_long',
                'Class name exceeds 100 characters',
                class_record.id,
                'name',
                class_record.name,
                'Truncate to 100 characters',
                'error'
            );
        END IF;
    END LOOP;
END $$;

-- Fix classes with invalid data
UPDATE classes 
SET grade_level = 9
WHERE grade_level < 1 OR grade_level > 12;

UPDATE classes 
SET name = substring(name, 1, 100)
WHERE length(name) > 100;

-- ============================================================================
-- SECTION 8: TEACHERS TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for teachers with invalid data
DO $$
DECLARE
    teacher_record RECORD;
BEGIN
    FOR teacher_record IN 
        SELECT id, first_name, last_name, email, max_periods_per_week, school_id
        FROM teachers
    LOOP
        -- Check max periods per week
        IF teacher_record.max_periods_per_week IS NOT NULL AND 
           (teacher_record.max_periods_per_week <= 0 OR teacher_record.max_periods_per_week > 50) THEN
            PERFORM log_migration_issue(
                'teachers',
                'invalid_max_periods',
                'Max periods per week must be between 1 and 50',
                teacher_record.id,
                'max_periods_per_week',
                teacher_record.max_periods_per_week::TEXT,
                'Set to 40 (default) or valid value between 1-50',
                'error'
            );
        END IF;
        
        -- Check email format
        IF teacher_record.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            PERFORM log_migration_issue(
                'teachers',
                'invalid_email',
                'Invalid email format',
                teacher_record.id,
                'email',
                teacher_record.email,
                'Fix email format',
                'error'
            );
        END IF;
    END LOOP;
END $$;

-- Fix teachers with invalid data
UPDATE teachers 
SET max_periods_per_week = 40
WHERE max_periods_per_week IS NOT NULL AND (max_periods_per_week <= 0 OR max_periods_per_week > 50);

-- ============================================================================
-- SECTION 9: CLASS OFFERINGS TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for class offerings with invalid data
DO $$
DECLARE
    offering_record RECORD;
BEGIN
    FOR offering_record IN 
        SELECT co.id, co.periods_per_week, co.required_hours_per_term, co.term_id, co.class_id, co.course_id,
               c.name as course_name, cl.name as class_name, t.name as term_name
        FROM class_offerings co
        JOIN courses c ON c.id = co.course_id
        JOIN classes cl ON cl.id = co.class_id
        JOIN terms t ON t.id = co.term_id
    LOOP
        -- Check periods per week
        IF offering_record.periods_per_week < 1 OR offering_record.periods_per_week > 20 THEN
            PERFORM log_migration_issue(
                'class_offerings',
                'invalid_periods_per_week',
                'Periods per week must be between 1 and 20',
                offering_record.id,
                'periods_per_week',
                offering_record.periods_per_week::TEXT,
                'Set to 5 (default) or valid value between 1-20',
                'error'
            );
        END IF;
        
        -- Check required hours
        IF offering_record.required_hours_per_term IS NOT NULL AND offering_record.required_hours_per_term <= 0 THEN
            PERFORM log_migration_issue(
                'class_offerings',
                'invalid_required_hours',
                'Required hours per term must be positive',
                offering_record.id,
                'required_hours_per_term',
                offering_record.required_hours_per_term::TEXT,
                'Set to NULL or valid positive value',
                'error'
            );
        END IF;
    END LOOP;
END $$;

-- Fix class offerings with invalid data
UPDATE class_offerings 
SET periods_per_week = 5
WHERE periods_per_week < 1 OR periods_per_week > 20;

UPDATE class_offerings 
SET required_hours_per_term = NULL
WHERE required_hours_per_term IS NOT NULL AND required_hours_per_term <= 0;

-- Auto-calculate required hours for offerings that don't have them
UPDATE class_offerings 
SET required_hours_per_term = (
    SELECT ROUND(
        (class_offerings.periods_per_week * t.period_duration_minutes / 60.0) * 
        ((t.end_date - t.start_date) / 7.0)
    )
    FROM terms t
    WHERE t.id = class_offerings.term_id
    AND t.period_duration_minutes IS NOT NULL
)
WHERE required_hours_per_term IS NULL 
AND periods_per_week > 0;

-- ============================================================================
-- SECTION 10: TIME SLOTS TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for time slots with invalid data
DO $$
DECLARE
    slot_record RECORD;
BEGIN
    FOR slot_record IN 
        SELECT id, day_of_week, start_time, end_time, school_id
        FROM time_slots
    LOOP
        -- Check day of week
        IF slot_record.day_of_week < 1 OR slot_record.day_of_week > 7 THEN
            PERFORM log_migration_issue(
                'time_slots',
                'invalid_day_of_week',
                'Day of week must be between 1 and 7',
                slot_record.id,
                'day_of_week',
                slot_record.day_of_week::TEXT,
                'Set to valid day (1=Monday, 7=Sunday)',
                'error'
            );
        END IF;
        
        -- Check time validity
        IF slot_record.end_time <= slot_record.start_time THEN
            PERFORM log_migration_issue(
                'time_slots',
                'invalid_time_range',
                'End time must be after start time',
                slot_record.id,
                'times',
                slot_record.start_time::TEXT || ' to ' || slot_record.end_time::TEXT,
                'Fix time range so end_time > start_time',
                'error'
            );
        END IF;
        
        -- Check duration
        IF EXTRACT(EPOCH FROM (slot_record.end_time - slot_record.start_time)) / 60 < 15 OR
           EXTRACT(EPOCH FROM (slot_record.end_time - slot_record.start_time)) / 60 > 240 THEN
            PERFORM log_migration_issue(
                'time_slots',
                'invalid_duration',
                'Time slot duration must be between 15 and 240 minutes',
                slot_record.id,
                'duration',
                (EXTRACT(EPOCH FROM (slot_record.end_time - slot_record.start_time)) / 60)::TEXT || ' minutes',
                'Adjust start or end time to get valid duration',
                'error'
            );
        END IF;
    END LOOP;
END $$;

-- Fix time slots with invalid data
UPDATE time_slots 
SET day_of_week = 1
WHERE day_of_week < 1 OR day_of_week > 7;

UPDATE time_slots 
SET end_time = start_time + INTERVAL '50 minutes'
WHERE end_time <= start_time;

-- ============================================================================
-- SECTION 11: TEACHING ASSIGNMENTS TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for orphaned teaching assignments
DO $$
DECLARE
    assignment_record RECORD;
BEGIN
    FOR assignment_record IN 
        SELECT ta.id, ta.class_offering_id, ta.teacher_id
        FROM teaching_assignments ta
        LEFT JOIN class_offerings co ON co.id = ta.class_offering_id
        LEFT JOIN teachers t ON t.id = ta.teacher_id
        WHERE co.id IS NULL OR t.id IS NULL
    LOOP
        PERFORM log_migration_issue(
            'teaching_assignments',
            'orphaned_assignment',
            'Teaching assignment references non-existent class offering or teacher',
            assignment_record.id,
            'foreign_keys',
            'class_offering_id: ' || assignment_record.class_offering_id::TEXT || ', teacher_id: ' || assignment_record.teacher_id::TEXT,
            'Delete orphaned assignment',
            'error'
        );
    END LOOP;
END $$;

-- Delete orphaned teaching assignments
DELETE FROM teaching_assignments 
WHERE class_offering_id NOT IN (SELECT id FROM class_offerings)
   OR teacher_id NOT IN (SELECT id FROM teachers);

-- ============================================================================
-- SECTION 12: HOLIDAYS TABLE VALIDATION AND CLEANUP
-- ============================================================================

-- Check for holidays with invalid data
DO $$
DECLARE
    holiday_record RECORD;
BEGIN
    FOR holiday_record IN 
        SELECT h.id, h.date, h.reason
        FROM holidays h
    LOOP
        -- Check if holiday is within term dates
        IF holiday_record.date < (
            SELECT start_date FROM academic_years WHERE id = h.academic_year_id
        ) OR holiday_record.date > (
            SELECT end_date FROM academic_years WHERE id = h.academic_year_id
        ) THEN
            PERFORM log_migration_issue(
                'holidays',
                'date_outside_term',
                'Holiday date is outside term dates',
                holiday_record.id,
                'date',
                holiday_record.date::TEXT,
                'Adjust date to be within term: ' || (
                    SELECT start_date FROM academic_years WHERE id = h.academic_year_id
                )::TEXT || ' to ' || (
                    SELECT end_date FROM academic_years WHERE id = h.academic_year_id
                )::TEXT,
                'error'
            );
        END IF;
    END LOOP;
END $$;

-- Fix holidays outside term dates
-- DELETE FROM holidays
-- WHERE date < (
--     SELECT start_date FROM academic_years WHERE id = holidays.academic_year_id
-- ) OR date > (
--     SELECT end_date FROM academic_years WHERE id = holidays.academic_year_id
-- );

-- ============================================================================
-- SECTION 13: DUPLICATE DETECTION AND CLEANUP
-- ============================================================================

-- Check for duplicate academic years
DO $$
DECLARE
    duplicate_record RECORD;
BEGIN
    FOR duplicate_record IN 
        SELECT school_id, name, COUNT(*) as count
        FROM academic_years
        GROUP BY school_id, name
        HAVING COUNT(*) > 1
    LOOP
        PERFORM log_migration_issue(
            'academic_years',
            'duplicate_name',
            'Multiple academic years with same name in school',
            NULL,
            'name',
            duplicate_record.name,
            'Rename duplicate academic years',
            'error'
        );
    END LOOP;
END $$;

-- Check for duplicate terms
DO $$
DECLARE
    duplicate_record RECORD;
BEGIN
    FOR duplicate_record IN 
        SELECT academic_year_id, name, COUNT(*) as count
        FROM terms
        GROUP BY academic_year_id, name
        HAVING COUNT(*) > 1
    LOOP
        PERFORM log_migration_issue(
            'terms',
            'duplicate_name',
            'Multiple terms with same name in academic year',
            NULL,
            'name',
            duplicate_record.name,
            'Rename duplicate terms',
            'error'
        );
    END LOOP;
END $$;

-- Check for duplicate class offerings
DO $$
DECLARE
    duplicate_record RECORD;
BEGIN
    FOR duplicate_record IN 
        SELECT term_id, class_id, course_id, COUNT(*) as count
        FROM class_offerings
        GROUP BY term_id, class_id, course_id
        HAVING COUNT(*) > 1
    LOOP
        PERFORM log_migration_issue(
            'class_offerings',
            'duplicate_offering',
            'Multiple class offerings for same course, class, and term',
            NULL,
            'combination',
            'term_id: ' || duplicate_record.term_id::TEXT || ', class_id: ' || duplicate_record.class_id::TEXT || ', course_id: ' || duplicate_record.course_id::TEXT,
            'Remove duplicate offerings',
            'error'
        );
    END LOOP;
END $$;

-- Remove duplicate class offerings (keep the first one)
DELETE FROM class_offerings 
WHERE id NOT IN (
    SELECT MIN(id::text)::uuid 
    FROM class_offerings 
    GROUP BY term_id, class_id, course_id
);

-- ============================================================================
-- SECTION 14: DATA CONSISTENCY CHECKS
-- ============================================================================

-- Check for grade level mismatches between classes and courses
DO $$
DECLARE
    mismatch_record RECORD;
BEGIN
    FOR mismatch_record IN 
        SELECT co.id, cl.grade_level as class_grade, c.grade_level as course_grade,
               cl.name as class_name, c.name as course_name
        FROM class_offerings co
        JOIN classes cl ON cl.id = co.class_id
        JOIN courses c ON c.id = co.course_id
        WHERE cl.grade_level != c.grade_level
    LOOP
        PERFORM log_migration_issue(
            'class_offerings',
            'grade_level_mismatch',
            'Class and course have different grade levels',
            mismatch_record.id,
            'grade_levels',
            'Class: ' || mismatch_record.class_grade::TEXT || ', Course: ' || mismatch_record.course_grade::TEXT,
            'Adjust class or course grade level to match',
            'warning'
        );
    END LOOP;
END $$;

-- Check for school consistency issues
DO $$
DECLARE
    consistency_record RECORD;
BEGIN
    FOR consistency_record IN 
        SELECT co.id, cl.school_id as class_school, c.school_id as course_school
        FROM class_offerings co
        JOIN classes cl ON cl.id = co.class_id
        JOIN courses c ON c.id = co.course_id
        WHERE cl.school_id != c.school_id
    LOOP
        PERFORM log_migration_issue(
            'class_offerings',
            'school_inconsistency',
            'Class and course belong to different schools',
            consistency_record.id,
            'school_ids',
            'Class school: ' || consistency_record.class_school::TEXT || ', Course school: ' || consistency_record.course_school::TEXT,
            'Move class or course to same school',
            'error'
        );
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 15: FINAL CLEANUP AND OPTIMIZATION
-- ============================================================================

-- Vacuum and analyze tables for better performance
-- VACUUM ANALYZE;  -- Commented out: cannot be executed within a pipeline

-- ============================================================================
-- SECTION 16: MIGRATION REPORT
-- ============================================================================

-- Display summary
SELECT 'MIGRATION SUMMARY' as info;
SELECT 
    migration_issues.severity,
    COUNT(*) as count,
    STRING_AGG(DISTINCT table_name, ', ') as affected_tables,
    STRING_AGG(DISTINCT issue_type, ', ') as issue_types
FROM migration_issues
GROUP BY migration_issues.severity
ORDER BY 
    CASE migration_issues.severity 
        WHEN 'error' THEN 1 
        WHEN 'warning' THEN 2 
        ELSE 3 
    END;

-- Display critical errors
SELECT 'CRITICAL ERRORS' as info;
SELECT table_name, issue_type, issue_description, record_id, suggested_fix
FROM migration_issues 
WHERE migration_issues.severity = 'error'
ORDER BY table_name, issue_type;

-- Display warnings
SELECT 'WARNINGS' as info;
SELECT table_name, issue_type, issue_description, record_id, suggested_fix
FROM migration_issues 
WHERE migration_issues.severity = 'warning'
ORDER BY table_name, issue_type;

-- ============================================================================
-- SECTION 17: VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate all data after migration
CREATE OR REPLACE FUNCTION validate_migration_results()
RETURNS TABLE(
    validation_type TEXT,
    message TEXT,
    severity TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check for any remaining constraint violations
    RETURN QUERY
    SELECT 
        'constraint_violation'::TEXT as validation_type,
        'Data violates new constraints'::TEXT as message,
        'error'::TEXT as severity,
        jsonb_build_object(
            'table', 'various',
            'constraint', 'new_constraints'
        ) as details
    WHERE EXISTS (
        SELECT 1 FROM migration_issues WHERE migration_issues.severity = 'error'
    );
    
    -- Check data integrity
    RETURN QUERY
    SELECT 
        'data_integrity'::TEXT as validation_type,
        'Data integrity check passed'::TEXT as message,
        'info'::TEXT as severity,
        jsonb_build_object(
            'total_records_processed', (
                SELECT COUNT(*) FROM (
                    SELECT 1 FROM schools
                    UNION ALL SELECT 1 FROM academic_years
                    UNION ALL SELECT 1 FROM terms
                    UNION ALL SELECT 1 FROM departments
                    UNION ALL SELECT 1 FROM courses
                    UNION ALL SELECT 1 FROM classes
                    UNION ALL SELECT 1 FROM teachers
                    UNION ALL SELECT 1 FROM class_offerings
                    UNION ALL SELECT 1 FROM time_slots
                    UNION ALL SELECT 1 FROM teaching_assignments
                    UNION ALL SELECT 1 FROM holidays
                ) t
            )
        ) as details
    WHERE NOT EXISTS (
        SELECT 1 FROM migration_issues WHERE migration_issues.severity = 'error'
    );
END;
$$ LANGUAGE plpgsql;

-- Run final validation
SELECT * FROM validate_migration_results();

-- Clean up temporary table
DROP TABLE migration_issues; 