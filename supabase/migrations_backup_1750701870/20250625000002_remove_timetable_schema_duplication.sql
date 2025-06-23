-- Migration: Remove timetable schema duplication
-- This migration removes the confusing timetable.class_offerings table and related tables
-- to ensure there's only one source of truth for curriculum definition

-- 1. First, let's check if there's any data in the timetable schema that we need to preserve
-- (This is a safety check - we'll log any data found)

DO $$
DECLARE
    offering_count INTEGER;
    class_count INTEGER;
    subject_count INTEGER;
    teacher_count INTEGER;
    assignment_count INTEGER;
BEGIN
    -- Check for data in timetable schema
    SELECT COUNT(*) INTO offering_count FROM timetable.class_offerings;
    SELECT COUNT(*) INTO class_count FROM timetable.classes;
    SELECT COUNT(*) INTO subject_count FROM timetable.subjects;
    SELECT COUNT(*) INTO teacher_count FROM timetable.teachers;
    SELECT COUNT(*) INTO assignment_count FROM timetable.teaching_assignments;
    
    -- Log the findings
    RAISE NOTICE 'Data found in timetable schema:';
    RAISE NOTICE '  - class_offerings: %', offering_count;
    RAISE NOTICE '  - classes: %', class_count;
    RAISE NOTICE '  - subjects: %', subject_count;
    RAISE NOTICE '  - teachers: %', teacher_count;
    RAISE NOTICE '  - teaching_assignments: %', assignment_count;
    
    -- If there's data, we should warn about it
    IF offering_count > 0 OR class_count > 0 OR subject_count > 0 OR teacher_count > 0 OR assignment_count > 0 THEN
        RAISE WARNING 'Data found in timetable schema! This migration will remove this data.';
        RAISE WARNING 'If this data is important, please migrate it to the public schema first.';
    END IF;
END $$;

-- 2. Drop the timetable schema tables in the correct order (respecting foreign keys)
DROP TABLE IF EXISTS timetable.schedule_entries CASCADE;
DROP TABLE IF EXISTS timetable.teaching_assignments CASCADE;
DROP TABLE IF EXISTS timetable.teacher_qualifications CASCADE;
DROP TABLE IF EXISTS timetable.class_offerings CASCADE;
DROP TABLE IF EXISTS timetable.timetables CASCADE;
DROP TABLE IF EXISTS timetable.constraints CASCADE;
DROP TABLE IF EXISTS timetable.classes CASCADE;
DROP TABLE IF EXISTS timetable.subjects CASCADE;
DROP TABLE IF EXISTS timetable.teachers CASCADE;
DROP TABLE IF EXISTS timetable.rooms CASCADE;
DROP TABLE IF EXISTS timetable.time_slots CASCADE;
DROP TABLE IF EXISTS timetable.academic_periods CASCADE;
DROP TABLE IF EXISTS timetable.schools CASCADE;
DROP TABLE IF EXISTS timetable.grades CASCADE;

-- 3. Drop the sequence if it exists
DROP SEQUENCE IF EXISTS timetable.schedule_entries_id_seq;

-- 4. Create a comment explaining why the timetable schema was removed
COMMENT ON SCHEMA timetable IS 
'This schema was removed to eliminate confusion with duplicate class_offerings tables. 
The public.class_offerings table is now the single source of truth for curriculum definition.';

-- 5. Create a view to help users understand the current structure
CREATE OR REPLACE VIEW public.curriculum_structure_guide AS
SELECT 
    'Single Source of Truth' as concept,
    'public.class_offerings' as table_name,
    'Defines which courses are taught to which class sections during specific terms' as description
UNION ALL
SELECT 
    'Class Sections',
    'public.class_sections', 
    'Defines class sections (e.g., Grade 9-A, Grade 9-B)'
UNION ALL
SELECT 
    'Courses',
    'public.courses',
    'Defines the actual courses/subjects that can be taught'
UNION ALL
SELECT 
    'Terms',
    'public.terms',
    'Defines academic terms when courses are taught'
UNION ALL
SELECT 
    'Teaching Assignments',
    'public.teaching_assignments',
    'Links teachers to class offerings (separate from class_offerings table)'
UNION ALL
SELECT 
    'Teachers',
    'public.teachers',
    'Defines teachers who can be assigned to courses';

-- 6. Add a helpful function to explain the current structure
CREATE OR REPLACE FUNCTION public.explain_curriculum_structure()
RETURNS TABLE(
    component TEXT,
    purpose TEXT,
    key_fields TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Class Offerings (Single Source of Truth)'::TEXT as component,
        'Defines the curriculum: which courses are taught to which classes during which terms'::TEXT as purpose,
        'class_id, course_id, term_id, periods_per_week, required_hours_per_term'::TEXT as key_fields
    UNION ALL
    SELECT 
        'Teaching Assignments'::TEXT,
        'Assigns teachers to specific class offerings'::TEXT,
        'class_offering_id, teacher_id'::TEXT
    UNION ALL
    SELECT 
        'Class Sections'::TEXT,
        'Defines the classes (e.g., Grade 9-A, Grade 10-B)'::TEXT,
        'school_id, grade_level, name'::TEXT
    UNION ALL
    SELECT 
        'Courses'::TEXT,
        'Defines the subjects/courses that can be taught'::TEXT,
        'school_id, subject_id, name, code, grade_level'::TEXT
    UNION ALL
    SELECT 
        'Terms'::TEXT,
        'Defines when courses are taught (e.g., Term 1, Term 2)'::TEXT,
        'academic_year_id, name, start_date, end_date'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a summary of what was removed
COMMENT ON FUNCTION public.explain_curriculum_structure() IS 
'This function explains the current curriculum structure after removing the confusing timetable schema. 
The public.class_offerings table is now the single source of truth for curriculum definition.'; 