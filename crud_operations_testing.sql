-- =====================================================
-- COMPREHENSIVE CRUD OPERATIONS TESTING
-- =====================================================
-- This script tests all CRUD operations for every module in the system
-- Run this after database schema validation passes

DO $$
DECLARE
    test_count INTEGER := 0;
    passed_count INTEGER := 0;
    failed_count INTEGER := 0;
    test_name TEXT;
    test_school_id UUID := gen_random_uuid();
    test_academic_year_id UUID := gen_random_uuid();
    test_term_id UUID := gen_random_uuid();
    test_department_id UUID := gen_random_uuid();
    test_course_id UUID := gen_random_uuid();
    test_class_id UUID := gen_random_uuid();
    test_teacher_id UUID := gen_random_uuid();
    test_class_offering_id UUID := gen_random_uuid();
    test_teaching_assignment_id UUID := gen_random_uuid();
    test_time_slot_id UUID := gen_random_uuid();
    test_holiday_id UUID := gen_random_uuid();
    test_room_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'STARTING COMPREHENSIVE CRUD OPERATIONS TESTING';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';

    -- =====================================================
    -- 1. SCHOOLS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '1. TESTING SCHOOLS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'schools_create';
    BEGIN
        INSERT INTO schools (id, name, start_time, end_time, period_duration, sessions_per_day, working_days)
        VALUES (test_school_id, 'Test School CRUD', '08:00:00', '15:00:00', 45, 8, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
        RAISE NOTICE '✅ % PASSED - School created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - School creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'schools_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM schools WHERE id = test_school_id) THEN
            RAISE NOTICE '✅ % PASSED - School read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - School not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - School read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'schools_update';
    BEGIN
        UPDATE schools SET name = 'Updated Test School' WHERE id = test_school_id;
        IF EXISTS (SELECT 1 FROM schools WHERE id = test_school_id AND name = 'Updated Test School') THEN
            RAISE NOTICE '✅ % PASSED - School updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - School update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - School update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 2. ACADEMIC YEARS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '2. TESTING ACADEMIC YEARS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'academic_years_create';
    BEGIN
        INSERT INTO academic_years (id, school_id, name, start_date, end_date)
        VALUES (test_academic_year_id, test_school_id, 'Test Academic Year', '2024-09-01', '2025-06-30');
        RAISE NOTICE '✅ % PASSED - Academic year created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Academic year creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'academic_years_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM academic_years WHERE id = test_academic_year_id) THEN
            RAISE NOTICE '✅ % PASSED - Academic year read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Academic year not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Academic year read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'academic_years_update';
    BEGIN
        UPDATE academic_years SET name = 'Updated Academic Year' WHERE id = test_academic_year_id;
        IF EXISTS (SELECT 1 FROM academic_years WHERE id = test_academic_year_id AND name = 'Updated Academic Year') THEN
            RAISE NOTICE '✅ % PASSED - Academic year updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Academic year update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Academic year update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 3. TERMS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '3. TESTING TERMS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'terms_create';
    BEGIN
        INSERT INTO terms (id, academic_year_id, name, start_date, end_date, period_duration_minutes)
        VALUES (test_term_id, test_academic_year_id, 'Test Term', '2024-09-01', '2024-12-20', 45);
        RAISE NOTICE '✅ % PASSED - Term created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Term creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'terms_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM terms WHERE id = test_term_id) THEN
            RAISE NOTICE '✅ % PASSED - Term read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Term not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Term read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'terms_update';
    BEGIN
        UPDATE terms SET name = 'Updated Term' WHERE id = test_term_id;
        IF EXISTS (SELECT 1 FROM terms WHERE id = test_term_id AND name = 'Updated Term') THEN
            RAISE NOTICE '✅ % PASSED - Term updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Term update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Term update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 4. DEPARTMENTS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '4. TESTING DEPARTMENTS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'departments_create';
    BEGIN
        INSERT INTO departments (id, school_id, name, code, description)
        VALUES (test_department_id, test_school_id, 'Test Department', 'TEST', 'Test Department Description');
        RAISE NOTICE '✅ % PASSED - Department created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Department creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'departments_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM departments WHERE id = test_department_id) THEN
            RAISE NOTICE '✅ % PASSED - Department read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Department not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Department read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'departments_update';
    BEGIN
        UPDATE departments SET name = 'Updated Department' WHERE id = test_department_id;
        IF EXISTS (SELECT 1 FROM departments WHERE id = test_department_id AND name = 'Updated Department') THEN
            RAISE NOTICE '✅ % PASSED - Department updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Department update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Department update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 5. COURSES CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '5. TESTING COURSES CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'courses_create';
    BEGIN
        INSERT INTO courses (id, school_id, department_id, name, code, grade_level, total_hours_per_year)
        VALUES (test_course_id, test_school_id, test_department_id, 'Test Course', 'TEST101', 9, 120);
        RAISE NOTICE '✅ % PASSED - Course created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Course creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'courses_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM courses WHERE id = test_course_id) THEN
            RAISE NOTICE '✅ % PASSED - Course read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Course not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Course read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'courses_update';
    BEGIN
        UPDATE courses SET name = 'Updated Course' WHERE id = test_course_id;
        IF EXISTS (SELECT 1 FROM courses WHERE id = test_course_id AND name = 'Updated Course') THEN
            RAISE NOTICE '✅ % PASSED - Course updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Course update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Course update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 6. CLASSES CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '6. TESTING CLASSES CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'classes_create';
    BEGIN
        INSERT INTO classes (id, school_id, name, grade_level, section)
        VALUES (test_class_id, test_school_id, 'Test Class', 9, 'A');
        RAISE NOTICE '✅ % PASSED - Class created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Class creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'classes_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM classes WHERE id = test_class_id) THEN
            RAISE NOTICE '✅ % PASSED - Class read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Class not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Class read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'classes_update';
    BEGIN
        UPDATE classes SET name = 'Updated Class' WHERE id = test_class_id;
        IF EXISTS (SELECT 1 FROM classes WHERE id = test_class_id AND name = 'Updated Class') THEN
            RAISE NOTICE '✅ % PASSED - Class updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Class update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Class update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 7. TEACHERS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '7. TESTING TEACHERS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'teachers_create';
    BEGIN
        INSERT INTO teachers (id, school_id, first_name, last_name, email, max_periods_per_week)
        VALUES (test_teacher_id, test_school_id, 'Test', 'Teacher', 'test.teacher@school.com', 20);
        RAISE NOTICE '✅ % PASSED - Teacher created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Teacher creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'teachers_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM teachers WHERE id = test_teacher_id) THEN
            RAISE NOTICE '✅ % PASSED - Teacher read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Teacher not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Teacher read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'teachers_update';
    BEGIN
        UPDATE teachers SET first_name = 'Updated' WHERE id = test_teacher_id;
        IF EXISTS (SELECT 1 FROM teachers WHERE id = test_teacher_id AND first_name = 'Updated') THEN
            RAISE NOTICE '✅ % PASSED - Teacher updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Teacher update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Teacher update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 8. CLASS OFFERINGS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '8. TESTING CLASS OFFERINGS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'class_offerings_create';
    BEGIN
        INSERT INTO class_offerings (id, term_id, class_id, course_id, periods_per_week, required_hours_per_term)
        VALUES (test_class_offering_id, test_term_id, test_class_id, test_course_id, 5, 90);
        RAISE NOTICE '✅ % PASSED - Class offering created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Class offering creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'class_offerings_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM class_offerings WHERE id = test_class_offering_id) THEN
            RAISE NOTICE '✅ % PASSED - Class offering read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Class offering not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Class offering read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'class_offerings_update';
    BEGIN
        UPDATE class_offerings SET periods_per_week = 6 WHERE id = test_class_offering_id;
        IF EXISTS (SELECT 1 FROM class_offerings WHERE id = test_class_offering_id AND periods_per_week = 6) THEN
            RAISE NOTICE '✅ % PASSED - Class offering updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Class offering update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Class offering update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 9. TEACHING ASSIGNMENTS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '9. TESTING TEACHING ASSIGNMENTS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'teaching_assignments_create';
    BEGIN
        INSERT INTO teaching_assignments (id, school_id, class_offering_id, teacher_id, assignment_type)
        VALUES (test_teaching_assignment_id, test_school_id, test_class_offering_id, test_teacher_id, 'manual');
        RAISE NOTICE '✅ % PASSED - Teaching assignment created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Teaching assignment creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'teaching_assignments_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM teaching_assignments WHERE id = test_teaching_assignment_id) THEN
            RAISE NOTICE '✅ % PASSED - Teaching assignment read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Teaching assignment not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Teaching assignment read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'teaching_assignments_update';
    BEGIN
        UPDATE teaching_assignments SET assignment_type = 'ai_suggested' WHERE id = test_teaching_assignment_id;
        IF EXISTS (SELECT 1 FROM teaching_assignments WHERE id = test_teaching_assignment_id AND assignment_type = 'ai_suggested') THEN
            RAISE NOTICE '✅ % PASSED - Teaching assignment updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Teaching assignment update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Teaching assignment update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 10. TIME SLOTS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '10. TESTING TIME SLOTS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'time_slots_create';
    BEGIN
        INSERT INTO time_slots (id, school_id, day_of_week, start_time, end_time, period_number, is_teaching_period, slot_name)
        VALUES (test_time_slot_id, test_school_id, 1, '08:00:00', '08:45:00', 1, true, 'Test Period 1');
        RAISE NOTICE '✅ % PASSED - Time slot created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Time slot creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'time_slots_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM time_slots WHERE id = test_time_slot_id) THEN
            RAISE NOTICE '✅ % PASSED - Time slot read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Time slot not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Time slot read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'time_slots_update';
    BEGIN
        UPDATE time_slots SET slot_name = 'Updated Period 1' WHERE id = test_time_slot_id;
        IF EXISTS (SELECT 1 FROM time_slots WHERE id = test_time_slot_id AND slot_name = 'Updated Period 1') THEN
            RAISE NOTICE '✅ % PASSED - Time slot updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Time slot update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Time slot update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 11. HOLIDAYS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '11. TESTING HOLIDAYS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'holidays_create';
    BEGIN
        INSERT INTO holidays (id, academic_year_id, date, name, description)
        VALUES (test_holiday_id, test_academic_year_id, '2024-12-25', 'Christmas Day', 'Christmas Holiday');
        RAISE NOTICE '✅ % PASSED - Holiday created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Holiday creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'holidays_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM holidays WHERE id = test_holiday_id) THEN
            RAISE NOTICE '✅ % PASSED - Holiday read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Holiday not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Holiday read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'holidays_update';
    BEGIN
        UPDATE holidays SET name = 'Updated Christmas Day' WHERE id = test_holiday_id;
        IF EXISTS (SELECT 1 FROM holidays WHERE id = test_holiday_id AND name = 'Updated Christmas Day') THEN
            RAISE NOTICE '✅ % PASSED - Holiday updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Holiday update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Holiday update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 12. ROOMS CRUD TESTING
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '12. TESTING ROOMS CRUD OPERATIONS...';
    
    -- CREATE
    test_count := test_count + 1;
    test_name := 'rooms_create';
    BEGIN
        INSERT INTO rooms (id, school_id, name, capacity, room_type)
        VALUES (test_room_id, test_school_id, 'Test Room', 30, 'classroom');
        RAISE NOTICE '✅ % PASSED - Room created successfully', test_name;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Room creation failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- READ
    test_count := test_count + 1;
    test_name := 'rooms_read';
    BEGIN
        IF EXISTS (SELECT 1 FROM rooms WHERE id = test_room_id) THEN
            RAISE NOTICE '✅ % PASSED - Room read successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Room not found after creation', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Room read failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- UPDATE
    test_count := test_count + 1;
    test_name := 'rooms_update';
    BEGIN
        UPDATE rooms SET name = 'Updated Room' WHERE id = test_room_id;
        IF EXISTS (SELECT 1 FROM rooms WHERE id = test_room_id AND name = 'Updated Room') THEN
            RAISE NOTICE '✅ % PASSED - Room updated successfully', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Room update failed', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Room update failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 13. DELETE OPERATIONS TESTING (CASCADE)
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '13. TESTING DELETE OPERATIONS (CASCADE)...';
    
    -- Test cascade deletes
    test_count := test_count + 1;
    test_name := 'cascade_delete_school';
    BEGIN
        DELETE FROM schools WHERE id = test_school_id;
        -- Check if all related records were deleted
        IF NOT EXISTS (SELECT 1 FROM schools WHERE id = test_school_id) AND
           NOT EXISTS (SELECT 1 FROM academic_years WHERE school_id = test_school_id) AND
           NOT EXISTS (SELECT 1 FROM departments WHERE school_id = test_school_id) AND
           NOT EXISTS (SELECT 1 FROM courses WHERE school_id = test_school_id) AND
           NOT EXISTS (SELECT 1 FROM classes WHERE school_id = test_school_id) AND
           NOT EXISTS (SELECT 1 FROM teachers WHERE school_id = test_school_id) AND
           NOT EXISTS (SELECT 1 FROM time_slots WHERE school_id = test_school_id) AND
           NOT EXISTS (SELECT 1 FROM rooms WHERE school_id = test_school_id) THEN
            RAISE NOTICE '✅ % PASSED - Cascade delete worked correctly', test_name;
            passed_count := passed_count + 1;
        ELSE
            RAISE NOTICE '❌ % FAILED - Cascade delete failed - some records remain', test_name;
            failed_count := failed_count + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ % FAILED - Cascade delete failed: %', test_name, SQLERRM;
        failed_count := failed_count + 1;
    END;

    -- =====================================================
    -- 14. FINAL CRUD TESTING SUMMARY
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'CRUD OPERATIONS TESTING SUMMARY';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total Tests: %', test_count;
    RAISE NOTICE 'Passed: %', passed_count;
    RAISE NOTICE 'Failed: %', failed_count;
    RAISE NOTICE 'Success Rate: %%%', ROUND((passed_count::DECIMAL / test_count) * 100, 2);
    
    IF failed_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ALL CRUD TESTS PASSED! Database operations are working correctly.';
        RAISE NOTICE 'Proceed to Phase 3: API Endpoint Testing';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  % CRUD TESTS FAILED. Please fix these issues before proceeding.', failed_count;
        RAISE NOTICE 'Review the failed tests above and address the issues.';
    END IF;
    
    RAISE NOTICE '=====================================================';

END $$; 