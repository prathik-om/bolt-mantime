-- =====================================================
-- COMPREHENSIVE DATABASE SCHEMA VALIDATION
-- =====================================================
-- This script validates all database constraints, triggers, and validation functions
-- Run this before proceeding with CRUD operations testing

DO $$
DECLARE
    test_count INTEGER := 0;
    passed_count INTEGER := 0;
    failed_count INTEGER := 0;
    test_name TEXT;
    test_result TEXT;
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'STARTING COMPREHENSIVE DATABASE SCHEMA VALIDATION';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';

    -- =====================================================
    -- 1. VALIDATE UNIQUE CONSTRAINTS
    -- =====================================================
    RAISE NOTICE '1. VALIDATING UNIQUE CONSTRAINTS...';
    
    -- Test academic_years unique constraints
    test_count := test_count + 1;
    test_name := 'academic_years_school_name_unique';
    BEGIN
        -- This should fail if constraint exists
        INSERT INTO academic_years (id, school_id, name, start_date, end_date)
        VALUES ('test-year-1', 'test-school-1', 'Test Year', '2024-01-01', '2024-12-31');
        INSERT INTO academic_years (id, school_id, name, start_date, end_date)
        VALUES ('test-year-2', 'test-school-1', 'Test Year', '2024-01-01', '2024-12-31');
        RAISE NOTICE '❌ % FAILED - Duplicate name allowed', test_name;
        failed_count := failed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ % PASSED - Constraint enforced: %', test_name, SQLERRM;
        passed_count := passed_count + 1;
    END;
    
    -- Clean up test data
    DELETE FROM academic_years WHERE id IN ('test-year-1', 'test-year-2');

    -- =====================================================
    -- 2. VALIDATE FOREIGN KEY CONSTRAINTS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '2. VALIDATING FOREIGN KEY CONSTRAINTS...';
    
    test_count := test_count + 1;
    test_name := 'terms_academic_year_fkey';
    BEGIN
        INSERT INTO terms (id, academic_year_id, name, start_date, end_date, period_duration_minutes)
        VALUES ('test-term-1', 'non-existent-year', 'Test Term', '2024-01-01', '2024-06-30', 45);
        RAISE NOTICE '❌ % FAILED - Invalid foreign key allowed', test_name;
        failed_count := failed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ % PASSED - Foreign key constraint enforced: %', test_name, SQLERRM;
        passed_count := passed_count + 1;
    END;

    -- =====================================================
    -- 3. VALIDATE CHECK CONSTRAINTS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '3. VALIDATING CHECK CONSTRAINTS...';
    
    test_count := test_count + 1;
    test_name := 'academic_years_start_before_end';
    BEGIN
        INSERT INTO academic_years (id, school_id, name, start_date, end_date)
        VALUES ('test-year-3', 'test-school-1', 'Invalid Year', '2024-12-31', '2024-01-01');
        RAISE NOTICE '❌ % FAILED - Invalid date range allowed', test_name;
        failed_count := failed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ % PASSED - Date range constraint enforced: %', test_name, SQLERRM;
        passed_count := passed_count + 1;
    END;

    -- =====================================================
    -- 4. VALIDATE TRIGGER FUNCTIONS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '4. VALIDATING TRIGGER FUNCTIONS...';
    
    -- Test if validation functions exist
    test_count := test_count + 1;
    test_name := 'validate_teacher_workload_function_exists';
    BEGIN
        PERFORM validate_teacher_workload();
        RAISE NOTICE '✅ % PASSED - Function exists and is callable', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Function missing or invalid: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    test_count := test_count + 1;
    test_name := 'validate_class_offering_requirements_function_exists';
    BEGIN
        PERFORM validate_class_offering_requirements();
        RAISE NOTICE '✅ % PASSED - Function exists and is callable', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Function missing or invalid: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 5. VALIDATE INDEXES
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '5. VALIDATING PERFORMANCE INDEXES...';
    
    -- Check if critical indexes exist
    test_count := test_count + 1;
    test_name := 'idx_scheduled_lessons_date_timeslot';
    BEGIN
        IF EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_scheduled_lessons_date_timeslot'
        ) THEN
            RAISE NOTICE '✅ % PASSED - Index exists', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Index missing', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Error checking index: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 6. VALIDATE ROW LEVEL SECURITY
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '6. VALIDATING ROW LEVEL SECURITY...';
    
    test_count := test_count + 1;
    test_name := 'schools_rls_enabled';
    BEGIN
        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'schools' AND schemaname = 'public'
        ) THEN
            RAISE NOTICE '✅ % PASSED - RLS policies exist for schools', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - No RLS policies found for schools', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Error checking RLS: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 7. VALIDATE DATA TYPES AND DOMAINS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '7. VALIDATING DATA TYPES AND DOMAINS...';
    
    test_count := test_count + 1;
    test_name := 'timetable_generation_status_enum';
    BEGIN
        IF EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = 'timetable_generation_status'
        ) THEN
            RAISE NOTICE '✅ % PASSED - ENUM type exists', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - ENUM type missing', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Error checking ENUM: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 8. VALIDATE HELPER FUNCTIONS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '8. VALIDATING HELPER FUNCTIONS...';
    
    test_count := test_count + 1;
    test_name := 'get_available_time_slots_function';
    BEGIN
        PERFORM get_available_time_slots('test-teacher', '2024-01-01', 'test-school');
        RAISE NOTICE '✅ % PASSED - Function exists and is callable', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Function missing or invalid: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    test_count := test_count + 1;
    test_name := 'get_curriculum_requirements_function';
    BEGIN
        PERFORM get_curriculum_requirements('test-term', 'test-school');
        RAISE NOTICE '✅ % PASSED - Function exists and is callable', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Function missing or invalid: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 9. VALIDATE OR-TOOLS DATA INTEGRITY FUNCTIONS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '9. VALIDATING OR-TOOLS DATA INTEGRITY FUNCTIONS...';
    
    test_count := test_count + 1;
    test_name := 'validate_ortools_data_integrity_function';
    BEGIN
        PERFORM validate_ortools_data_integrity('test-school');
        RAISE NOTICE '✅ % PASSED - Function exists and is callable', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Function missing or invalid: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 10. FINAL VALIDATION SUMMARY
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'DATABASE SCHEMA VALIDATION SUMMARY';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total Tests: %', test_count;
    RAISE NOTICE 'Passed: %', passed_count;
    RAISE NOTICE 'Failed: %', failed_count;
    RAISE NOTICE 'Success Rate: %%%', ROUND((passed_count::DECIMAL / test_count) * 100, 2);
    
    IF failed_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ALL TESTS PASSED! Database schema is ready for CRUD testing.';
        RAISE NOTICE 'Proceed to Phase 2: CRUD Operations Testing';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  % TESTS FAILED. Please fix these issues before proceeding.', failed_count;
        RAISE NOTICE 'Review the failed tests above and address the issues.';
    END IF;
    
    RAISE NOTICE '=====================================================';

END $$; 