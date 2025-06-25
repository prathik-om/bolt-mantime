-- Test script for new validation functions
-- This will test all the constraints and validation functions we added

-- First, let's create some test data
-- We'll need a school, academic year, terms, courses, classes, teachers, etc.

-- 1. Create test school
INSERT INTO schools (id, name, start_time, end_time, period_duration, sessions_per_day, working_days)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Test School', '08:00:00', '15:00:00', 45, 8, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
ON CONFLICT (id) DO NOTHING;

-- 2. Create test academic year
INSERT INTO academic_years (id, school_id, name, start_date, end_date)
VALUES 
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2024-2025', '2024-09-01', '2025-06-30')
ON CONFLICT (id) DO NOTHING;

-- 3. Create test terms
INSERT INTO terms (id, academic_year_id, name, start_date, end_date, period_duration_minutes)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Fall Term', '2024-09-01', '2024-12-20', 45),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Spring Term', '2025-01-06', '2025-06-30', 45)
ON CONFLICT (id) DO NOTHING;

-- 4. Create test departments
INSERT INTO departments (id, school_id, name, code, description)
VALUES 
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Mathematics', 'MATH', 'Mathematics Department'),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Science', 'SCI', 'Science Department')
ON CONFLICT (id) DO NOTHING;

-- 5. Create test courses
INSERT INTO courses (id, school_id, department_id, name, code, grade_level, total_hours_per_year)
VALUES 
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Algebra I', 'ALG1', 9, 120),
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Geometry', 'GEO', 10, 120),
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'Biology', 'BIO', 9, 120)
ON CONFLICT (id) DO NOTHING;

-- 6. Create test classes
INSERT INTO classes (id, school_id, name, grade_level)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Grade 9A', 9),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Grade 10A', 10)
ON CONFLICT (id) DO NOTHING;

-- 7. Create test teachers
INSERT INTO teachers (id, school_id, first_name, last_name, email, max_periods_per_week)
VALUES 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'John', 'Smith', 'john.smith@testschool.com', 40),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Jane', 'Doe', 'jane.doe@testschool.com', 40)
ON CONFLICT (id) DO NOTHING;

-- 8. Create test time slots
INSERT INTO time_slots (id, school_id, day_of_week, start_time, end_time, period_number, is_teaching_period, slot_name)
VALUES 
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 1, '08:00:00', '08:45:00', 1, true, 'Period 1'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 1, '08:50:00', '09:35:00', 2, true, 'Period 2'),
  ('abcdabcd-abcd-abcd-abcd-abcdabcdabcd', '11111111-1111-1111-1111-111111111111', 1, '09:40:00', '10:25:00', 3, true, 'Period 3'),
  ('12341234-1234-1234-1234-123412341234', '11111111-1111-1111-1111-111111111111', 2, '08:00:00', '08:45:00', 1, true, 'Period 1'),
  ('56785678-5678-5678-5678-567856785678', '11111111-1111-1111-1111-111111111111', 2, '08:50:00', '09:35:00', 2, true, 'Period 2')
ON CONFLICT (id) DO NOTHING;

-- 9. Create test class offerings
INSERT INTO class_offerings (id, term_id, class_id, course_id, periods_per_week, required_hours_per_term)
VALUES 
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 5, 90),
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 4, 72),
  ('cccc3333-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '88888888-8888-8888-8888-888888888888', 5, 90)
ON CONFLICT (id) DO NOTHING;

-- 10. Create test teaching assignments
INSERT INTO teaching_assignments (id, school_id, class_offering_id, teacher_id, assignment_type)
VALUES 
  ('dddd4444-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'manual'),
  ('eeee5555-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'manual')
ON CONFLICT (id) DO NOTHING;

-- 11. Create test holidays
INSERT INTO holidays (id, academic_year_id, date, reason)
VALUES 
  ('ffff6666-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', '2024-11-28', 'Thanksgiving'),
  ('abcd1234-abcd-abcd-abcd-abcdabcdabcd', '22222222-2222-2222-2222-222222222222', '2024-12-25', 'Christmas')
ON CONFLICT (id) DO NOTHING;

-- Now let's test each validation function

-- ============================================================================
-- TEST 1: Validate Teacher Workload (should pass)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 1: Testing teacher workload validation (should pass)...';
  
  -- Current workload for teacher 001: 5 periods (Algebra) = 5 total
  -- Adding Geometry (5 periods) = 10 total (under 40 limit)
  
  INSERT INTO teaching_assignments (id, school_id, class_offering_id, teacher_id, assignment_type)
  VALUES ('11112222-3333-4444-5555-666677778888', '11111111-1111-1111-1111-111111111111', 'cccc3333-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'manual');
  
  RAISE NOTICE '✅ Teacher workload test PASSED - teacher can be assigned additional course';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Teacher workload test FAILED: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 2: Validate Teacher Workload (should fail - exceeds 40 periods)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 2: Testing teacher workload validation (should fail - exceeds limit)...';
  
  -- Create additional class offerings to exceed 40 periods
  INSERT INTO class_offerings (id, term_id, class_id, course_id, periods_per_week, required_hours_per_term)
  VALUES 
    ('22223333-4444-5555-6666-777788889999', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 35, 630),
    ('33334444-5555-6666-7777-88889999aaaa', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777', 35, 630);
  
  -- Try to assign both to teacher 001 (would be 10 + 35 + 35 = 80 periods)
  INSERT INTO teaching_assignments (id, school_id, class_offering_id, teacher_id, assignment_type)
  VALUES ('44445555-6666-7777-8888-9999aaaabbbb', '11111111-1111-1111-1111-111111111111', '22223333-4444-5555-6666-777788889999', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'manual');
  
  RAISE NOTICE '❌ Teacher workload test FAILED - should have prevented assignment';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Teacher workload test PASSED - correctly prevented overloading: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 3: Validate Class Offering Requirements (should pass)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 3: Testing class offering requirements validation (should pass)...';
  
  -- 90 hours over ~15 weeks = 6 hours per week = 6 periods needed
  -- We have 5 periods, so this should be insufficient
  
  -- This should trigger validation and fail
  UPDATE class_offerings 
  SET periods_per_week = 3 
  WHERE id = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  
  RAISE NOTICE '❌ Class offering requirements test FAILED - should have prevented insufficient periods';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Class offering requirements test PASSED - correctly validated periods: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 4: Validate Time Slot Consistency (should pass)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 4: Testing time slot consistency validation (should pass)...';
  
  -- Try to create overlapping time slot
  INSERT INTO time_slots (id, school_id, day_of_week, start_time, end_time, period_number, is_teaching_period, slot_name)
  VALUES ('55556666-7777-8888-9999-aaaabbbbcccc', '11111111-1111-1111-1111-111111111111', 1, '08:20:00', '09:05:00', 99, true, 'Overlapping Period');
  
  RAISE NOTICE '❌ Time slot consistency test FAILED - should have prevented overlap';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Time slot consistency test PASSED - correctly prevented overlap: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 5: Validate Academic Calendar Consistency (should pass)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 5: Testing academic calendar consistency validation (should pass)...';
  
  -- Try to create term outside academic year
  INSERT INTO terms (id, academic_year_id, name, start_date, end_date, period_duration_minutes)
  VALUES ('66667777-8888-9999-aaaa-bbbbccccdddd', '22222222-2222-2222-2222-222222222222', 'Invalid Term', '2023-01-01', '2023-06-30', 45);
  
  RAISE NOTICE '❌ Academic calendar consistency test FAILED - should have prevented invalid dates';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Academic calendar consistency test PASSED - correctly validated dates: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 6: Validate Holiday Dates (should pass)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 6: Testing holiday dates validation (should pass)...';
  
  -- Try to create holiday outside academic year
  INSERT INTO holidays (id, academic_year_id, date, reason)
  VALUES ('77778888-9999-aaaa-bbbb-ccccddddeeee', '22222222-2222-2222-2222-222222222222', '2023-01-01', 'Invalid Holiday');
  
  RAISE NOTICE '❌ Holiday dates test FAILED - should have prevented invalid date';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Holiday dates test PASSED - correctly validated holiday date: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 7: Test prepare_timetable_data function
-- ============================================================================
DO $$
DECLARE
  result RECORD;
  count_rows INTEGER := 0;
BEGIN
  RAISE NOTICE 'TEST 7: Testing prepare_timetable_data function...';
  
  -- Test the function
  FOR result IN SELECT * FROM prepare_timetable_data('11111111-1111-1111-1111-111111111111') LIMIT 5
  LOOP
    count_rows := count_rows + 1;
    RAISE NOTICE 'Row %: Class Offering: %, Course: %, Teacher: %, Periods: %, Available Slots: %', 
      count_rows, 
      result.class_offering_id, 
      result.course_id, 
      result.teacher_id, 
      result.periods_per_week,
      jsonb_array_length(result.available_slots);
  END LOOP;
  
  IF count_rows > 0 THEN
    RAISE NOTICE '✅ prepare_timetable_data test PASSED - returned % rows', count_rows;
  ELSE
    RAISE NOTICE '❌ prepare_timetable_data test FAILED - no data returned';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ prepare_timetable_data test FAILED: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 8: Test Unique Constraints
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 8: Testing unique constraints...';
  
  -- Try to create duplicate term
  INSERT INTO terms (id, academic_year_id, name, start_date, end_date, period_duration_minutes)
  VALUES ('88889999-aaaa-bbbb-cccc-ddddeeeeffff', '22222222-2222-2222-2222-222222222222', 'Fall Term', '2024-09-01', '2024-12-20', 45);
  
  RAISE NOTICE '❌ Unique constraint test FAILED - should have prevented duplicate term';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Unique constraint test PASSED - correctly prevented duplicate: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 9: Test Class Offering Unique Constraint
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 9: Testing class offering unique constraint...';
  
  -- Try to create duplicate class offering
  INSERT INTO class_offerings (id, term_id, class_id, course_id, periods_per_week, required_hours_per_term)
  VALUES ('9999aaaa-bbbb-cccc-dddd-eeeeffff0000', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 5, 90);
  
  RAISE NOTICE '❌ Class offering unique constraint test FAILED - should have prevented duplicate';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Class offering unique constraint test PASSED - correctly prevented duplicate: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 10: Test Teaching Assignment Unique Constraint
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 10: Testing teaching assignment unique constraint...';
  
  -- Try to create duplicate teaching assignment
  INSERT INTO teaching_assignments (id, school_id, class_offering_id, teacher_id, assignment_type)
  VALUES ('aaaa0000-bbbb-1111-2222-333344445555', '11111111-1111-1111-1111-111111111111', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'manual');
  
  RAISE NOTICE '❌ Teaching assignment unique constraint test FAILED - should have prevented duplicate';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Teaching assignment unique constraint test PASSED - correctly prevented duplicate: %', SQLERRM;
END $$;

-- ============================================================================
-- CLEANUP: Remove test data
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Cleaning up test data...';
  
  -- Delete in reverse order to respect foreign key constraints
  DELETE FROM teaching_assignments WHERE id IN (
    'dddd4444-dddd-dddd-dddd-dddddddddddd',
    'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
    '11112222-3333-4444-5555-666677778888',
    '44445555-6666-7777-8888-9999aaaabbbb',
    'aaaa0000-bbbb-1111-2222-333344445555'
  );
  
  DELETE FROM class_offerings WHERE id IN (
    'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccc3333-cccc-cccc-cccc-cccccccccccc',
    '22223333-4444-5555-6666-777788889999',
    '33334444-5555-6666-7777-88889999aaaa',
    '9999aaaa-bbbb-cccc-dddd-eeeeffff0000'
  );
  
  DELETE FROM holidays WHERE id IN (
    'ffff6666-ffff-ffff-ffff-ffffffffffff',
    'abcd1234-abcd-abcd-abcd-abcdabcdabcd',
    '77778888-9999-aaaa-bbbb-ccccddddeeee'
  );
  
  DELETE FROM time_slots WHERE id IN (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'abcdabcd-abcd-abcd-abcd-abcdabcdabcd',
    '12341234-1234-1234-1234-123412341234',
    '56785678-5678-5678-5678-567856785678',
    '55556666-7777-8888-9999-aaaabbbbcccc'
  );
  
  DELETE FROM teachers WHERE id IN (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'dddddddd-dddd-dddd-dddd-dddddddddddd'
  );
  
  DELETE FROM classes WHERE id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  );
  
  DELETE FROM courses WHERE id IN (
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999'
  );
  
  DELETE FROM departments WHERE id IN (
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666'
  );
  
  DELETE FROM terms WHERE id IN (
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '66667777-8888-9999-aaaa-bbbbccccdddd',
    '88889999-aaaa-bbbb-cccc-ddddeeeeffff'
  );
  
  DELETE FROM academic_years WHERE id = '22222222-2222-2222-2222-222222222222';
  DELETE FROM schools WHERE id = '11111111-1111-1111-1111-111111111111';
  
  RAISE NOTICE '✅ Test data cleanup completed';
END $$; 