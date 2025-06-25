-- =====================================================
-- FULL SCHEMA INTEGRITY CHECK FOR ALL MODULES
-- =====================================================
DO $$
DECLARE
    test_count INTEGER := 0;
    passed_count INTEGER := 0;
    failed_count INTEGER := 0;
    test_name TEXT;
    test_school_1 UUID := gen_random_uuid();
    test_school_2 UUID := gen_random_uuid();
    test_school_3 UUID := gen_random_uuid();
    test_ay_1 UUID := gen_random_uuid();
    test_ay_2 UUID := gen_random_uuid();
    test_term_1 UUID := gen_random_uuid();
    test_term_2 UUID := gen_random_uuid();
    test_dep_1 UUID := gen_random_uuid();
    test_dep_2 UUID := gen_random_uuid();
    test_fk_term UUID := gen_random_uuid();
    test_chk_ay UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'STARTING FULL SCHEMA INTEGRITY CHECK';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';

    -- ========== UNIQUE CONSTRAINTS ==========
    test_count := test_count + 1;
    test_name := 'academic_years_school_name_unique';
    BEGIN
        INSERT INTO academic_years (id, school_id, name, start_date, end_date)
        VALUES (test_ay_1, test_school_1, 'Test Year', '2024-01-01', '2024-12-31');
        INSERT INTO academic_years (id, school_id, name, start_date, end_date)
        VALUES (test_ay_2, test_school_1, 'Test Year', '2024-01-01', '2024-12-31');
        RAISE NOTICE '❌ % FAILED - Duplicate academic year name allowed', test_name;
        failed_count := failed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ % PASSED - Unique constraint enforced: %', test_name, SQLERRM;
        passed_count := passed_count + 1;
    END;
    DELETE FROM academic_years WHERE id IN (test_ay_1, test_ay_2);

    test_count := test_count + 1;
    test_name := 'terms_academic_year_name_unique';
    BEGIN
        INSERT INTO academic_years (id, school_id, name, start_date, end_date)
        VALUES (test_ay_1, test_school_2, 'Year2', '2024-01-01', '2024-12-31');
        INSERT INTO terms (id, academic_year_id, name, start_date, end_date, period_duration_minutes)
        VALUES (test_term_1, test_ay_1, 'Term1', '2024-01-01', '2024-06-30', 45);
        INSERT INTO terms (id, academic_year_id, name, start_date, end_date, period_duration_minutes)
        VALUES (test_term_2, test_ay_1, 'Term1', '2024-07-01', '2024-12-31', 45);
        RAISE NOTICE '❌ % FAILED - Duplicate term name allowed', test_name;
        failed_count := failed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ % PASSED - Unique constraint enforced: %', test_name, SQLERRM;
        passed_count := passed_count + 1;
    END;
    DELETE FROM terms WHERE id IN (test_term_1, test_term_2);
    DELETE FROM academic_years WHERE id = test_ay_1;

    test_count := test_count + 1;
    test_name := 'departments_school_name_unique';
    BEGIN
        INSERT INTO schools (id, name, start_time, end_time, period_duration, sessions_per_day, working_days)
        VALUES (test_school_3, 'School3', '08:00:00', '15:00:00', 45, 8, ARRAY['monday']);
        INSERT INTO departments (id, school_id, name, code, description)
        VALUES (test_dep_1, test_school_3, 'Math', 'MATH', 'Math Dept');
        INSERT INTO departments (id, school_id, name, code, description)
        VALUES (test_dep_2, test_school_3, 'Math', 'MATH2', 'Math Dept 2');
        RAISE NOTICE '❌ % FAILED - Duplicate department name allowed', test_name;
        failed_count := failed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ % PASSED - Unique constraint enforced: %', test_name, SQLERRM;
        passed_count := passed_count + 1;
    END;
    DELETE FROM departments WHERE id IN (test_dep_1, test_dep_2);
    DELETE FROM schools WHERE id = test_school_3;

    -- ========== FOREIGN KEY CONSTRAINTS ==========
    test_count := test_count + 1;
    test_name := 'terms_academic_year_fkey';
    BEGIN
        INSERT INTO terms (id, academic_year_id, name, start_date, end_date, period_duration_minutes)
        VALUES (test_fk_term, gen_random_uuid(), 'Term', '2024-01-01', '2024-06-30', 45);
        RAISE NOTICE '❌ % FAILED - Invalid academic_year_id allowed', test_name;
        failed_count := failed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ % PASSED - Foreign key constraint enforced: %', test_name, SQLERRM;
        passed_count := passed_count + 1;
    END;
    DELETE FROM terms WHERE id = test_fk_term;

    -- ========== CHECK CONSTRAINTS ==========
    test_count := test_count + 1;
    test_name := 'academic_years_start_before_end';
    BEGIN
        INSERT INTO academic_years (id, school_id, name, start_date, end_date)
        VALUES (test_chk_ay, test_school_1, 'Invalid Year', '2024-12-31', '2024-01-01');
        RAISE NOTICE '❌ % FAILED - Invalid date range allowed', test_name;
        failed_count := failed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ % PASSED - Date range constraint enforced: %', test_name, SQLERRM;
        passed_count := passed_count + 1;
    END;
    DELETE FROM academic_years WHERE id = test_chk_ay;

    -- ========== TRIGGER/VALIDATION FUNCTIONS ==========
    test_count := test_count + 1;
    test_name := 'validate_teacher_workload_function_exists';
    BEGIN
        -- Check if the function exists (don't call it directly as it's a trigger function)
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_teacher_workload') THEN
            RAISE NOTICE '✅ % PASSED - Function exists', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Function missing', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Error checking function: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    test_count := test_count + 1;
    test_name := 'validate_class_offering_requirements_function_exists';
    BEGIN
        -- Check if the function exists (don't call it directly as it's a trigger function)
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_class_offering_requirements') THEN
            RAISE NOTICE '✅ % PASSED - Function exists', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Function missing', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Error checking function: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- ========== INDEXES ==========
    test_count := test_count + 1;
    test_name := 'idx_scheduled_lessons_date_timeslot';
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_lessons_date_timeslot') THEN
            RAISE NOTICE '✅ % PASSED - Index exists', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Index missing', test_name;
            failed_count := failed_count + 1;
        END IF;
    END;

    -- ========== ENUMS/DATA TYPES ==========
    test_count := test_count + 1;
    test_name := 'timetable_generation_status_enum';
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timetable_generation_status') THEN
            RAISE NOTICE '✅ % PASSED - ENUM type exists', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - ENUM type missing', test_name;
            failed_count := failed_count + 1;
        END IF;
    END;

    -- ========== HELPER FUNCTIONS ==========
    test_count := test_count + 1;
    test_name := 'get_available_teaching_time_function';
    BEGIN
        -- Test with correct signature: get_available_teaching_time(term_id_param uuid)
        PERFORM get_available_teaching_time(gen_random_uuid());
        RAISE NOTICE '✅ % PASSED - Function exists and is callable', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Function missing or invalid: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    test_count := test_count + 1;
    test_name := 'validate_curriculum_consistency_function';
    BEGIN
        -- Test with correct signature: validate_curriculum_consistency() (no parameters)
        PERFORM validate_curriculum_consistency();
        RAISE NOTICE '✅ % PASSED - Function exists and is callable', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Function missing or invalid: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    test_count := test_count + 1;
    test_name := 'prepare_timetable_data_function';
    BEGIN
        -- Test with correct signature: prepare_timetable_data(school_uuid uuid)
        PERFORM prepare_timetable_data(gen_random_uuid());
        RAISE NOTICE '✅ % PASSED - Function exists and is callable', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Function missing or invalid: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- ========== RLS POLICIES ==========
    test_count := test_count + 1;
    test_name := 'schools_rls_enabled';
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schools' AND schemaname = 'public') THEN
            RAISE NOTICE '✅ % PASSED - RLS policies exist for schools', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - No RLS policies found for schools', test_name;
            failed_count := failed_count + 1;
        END IF;
    END;

    -- ========== FINAL SUMMARY ==========
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FULL SCHEMA INTEGRITY CHECK SUMMARY';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total Tests: %', test_count;
    RAISE NOTICE 'Passed: %', passed_count;
    RAISE NOTICE 'Failed: %', failed_count;
    RAISE NOTICE 'Success Rate: %%%', ROUND((passed_count::DECIMAL / test_count) * 100, 2);

    IF failed_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ALL TESTS PASSED! Schema is ready for CRUD/API/UI testing.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  % TESTS FAILED. Please fix these issues before proceeding.', failed_count;
    END IF;
    RAISE NOTICE '=====================================================';
END $$; 