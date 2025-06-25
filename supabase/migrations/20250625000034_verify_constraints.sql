-- Migration: Verify All Unique Constraints
-- Date: 2025-06-25
-- Description: Verify that all critical unique constraints are present in the database DDL

DO $$
DECLARE
    constraint_record RECORD;
    missing_constraints TEXT[] := ARRAY[]::TEXT[];
    found_constraints TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '=== VERIFYING CRITICAL UNIQUE CONSTRAINTS ===';
    
    -- Check academic_years constraints
    RAISE NOTICE '--- Academic Years Constraints ---';
    FOR constraint_record IN 
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'public.academic_years'::regclass 
        AND contype = 'u'
        ORDER BY conname
    LOOP
        RAISE NOTICE 'Found: % - %', constraint_record.conname, constraint_record.definition;
        found_constraints := array_append(found_constraints, 'academic_years: ' || constraint_record.conname);
    END LOOP;
    
    -- Check for required academic_years constraint (school_id, name)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.academic_years'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%school_id%name%'
    ) THEN
        missing_constraints := array_append(missing_constraints, 'academic_years: UNIQUE (school_id, name)');
    END IF;
    
    -- Check terms constraints
    RAISE NOTICE '--- Terms Constraints ---';
    FOR constraint_record IN 
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'public.terms'::regclass 
        AND contype = 'u'
        ORDER BY conname
    LOOP
        RAISE NOTICE 'Found: % - %', constraint_record.conname, constraint_record.definition;
        found_constraints := array_append(found_constraints, 'terms: ' || constraint_record.conname);
    END LOOP;
    
    -- Check for required terms constraints
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.terms'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%academic_year_id%name%'
    ) THEN
        missing_constraints := array_append(missing_constraints, 'terms: UNIQUE (academic_year_id, name)');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.terms'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%academic_year_id%start_date%end_date%'
    ) THEN
        missing_constraints := array_append(missing_constraints, 'terms: UNIQUE (academic_year_id, start_date, end_date)');
    END IF;
    
    -- Check time_slots constraints
    RAISE NOTICE '--- Time Slots Constraints ---';
    FOR constraint_record IN 
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'public.time_slots'::regclass 
        AND contype = 'u'
        ORDER BY conname
    LOOP
        RAISE NOTICE 'Found: % - %', constraint_record.conname, constraint_record.definition;
        found_constraints := array_append(found_constraints, 'time_slots: ' || constraint_record.conname);
    END LOOP;
    
    -- Check for required time_slots constraints
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.time_slots'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%school_id%day_of_week%start_time%'
    ) THEN
        missing_constraints := array_append(missing_constraints, 'time_slots: UNIQUE (school_id, day_of_week, start_time)');
    END IF;
    
    -- Check class_offerings constraints
    RAISE NOTICE '--- Class Offerings Constraints ---';
    FOR constraint_record IN 
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'public.class_offerings'::regclass 
        AND contype = 'u'
        ORDER BY conname
    LOOP
        RAISE NOTICE 'Found: % - %', constraint_record.conname, constraint_record.definition;
        found_constraints := array_append(found_constraints, 'class_offerings: ' || constraint_record.conname);
    END LOOP;
    
    -- Check for required class_offerings constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.class_offerings'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%term_id%class_id%course_id%'
    ) THEN
        missing_constraints := array_append(missing_constraints, 'class_offerings: UNIQUE (term_id, class_id, course_id)');
    END IF;
    
    -- Check teaching_assignments constraints
    RAISE NOTICE '--- Teaching Assignments Constraints ---';
    FOR constraint_record IN 
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'public.teaching_assignments'::regclass 
        AND contype = 'u'
        ORDER BY conname
    LOOP
        RAISE NOTICE 'Found: % - %', constraint_record.conname, constraint_record.definition;
        found_constraints := array_append(found_constraints, 'teaching_assignments: ' || constraint_record.conname);
    END LOOP;
    
    -- Check for required teaching_assignments constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.teaching_assignments'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%class_offering_id%teacher_id%'
    ) THEN
        missing_constraints := array_append(missing_constraints, 'teaching_assignments: UNIQUE (class_offering_id, teacher_id)');
    END IF;
    
    -- Report results
    RAISE NOTICE '=== SUMMARY ===';
    RAISE NOTICE 'Found constraints: %', array_to_string(found_constraints, ', ');
    
    IF array_length(missing_constraints, 1) > 0 THEN
        RAISE NOTICE '❌ MISSING CONSTRAINTS: %', array_to_string(missing_constraints, ', ');
        RAISE EXCEPTION 'Critical unique constraints are missing from the database DDL';
    ELSE
        RAISE NOTICE '✅ All critical unique constraints are present and enforced at the database level';
    END IF;
    
END $$; 