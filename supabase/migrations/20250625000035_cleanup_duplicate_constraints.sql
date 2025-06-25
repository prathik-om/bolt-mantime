-- Migration: Cleanup Duplicate Constraints
-- Date: 2025-06-25
-- Description: Remove duplicate unique constraints to clean up the schema

BEGIN;

-- Drop duplicate constraints, keeping the properly named ones

-- 1. academic_years: Drop the auto-generated constraint name, keep the descriptive one
ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_school_id_name_key;
-- Keep: academic_years_school_name_unique

-- 2. class_offerings: Drop the auto-generated constraint name, keep the descriptive one  
ALTER TABLE public.class_offerings DROP CONSTRAINT IF EXISTS class_offerings_term_id_class_id_course_id_key;
-- Keep: class_offerings_term_class_course_unique

-- 3. teaching_assignments: Drop the auto-generated constraint name, keep the descriptive one
ALTER TABLE public.teaching_assignments DROP CONSTRAINT IF EXISTS teaching_assignments_class_offering_id_teacher_id_key;
-- Keep: teaching_assignments_class_offering_teacher_unique

-- Verify the cleanup by checking constraint definitions, not just names
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    RAISE NOTICE '=== VERIFYING CONSTRAINT CLEANUP ===';
    
    -- Check academic_years: UNIQUE (school_id, name)
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conrelid = 'public.academic_years'::regclass 
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%school_id%name%';
    IF constraint_count != 1 THEN
        RAISE EXCEPTION 'academic_years should have exactly 1 UNIQUE (school_id, name) constraint, found %', constraint_count;
    END IF;
    
    -- Check class_offerings: UNIQUE (term_id, class_id, course_id)
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conrelid = 'public.class_offerings'::regclass 
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%term_id%class_id%course_id%';
    IF constraint_count != 1 THEN
        RAISE EXCEPTION 'class_offerings should have exactly 1 UNIQUE (term_id, class_id, course_id) constraint, found %', constraint_count;
    END IF;
    
    -- Check teaching_assignments: UNIQUE (class_offering_id, teacher_id)
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conrelid = 'public.teaching_assignments'::regclass 
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%class_offering_id%teacher_id%';
    IF constraint_count != 1 THEN
        RAISE EXCEPTION 'teaching_assignments should have exactly 1 UNIQUE (class_offering_id, teacher_id) constraint, found %', constraint_count;
    END IF;
    
    RAISE NOTICE '✅ Duplicate constraints successfully removed';
    RAISE NOTICE '✅ Schema is now clean with no redundant constraints';
END $$;

COMMIT; 