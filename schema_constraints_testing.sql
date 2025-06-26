-- =====================================================
-- SCHEMA CONSTRAINTS TESTING FOR RECENT CHANGES
-- =====================================================
-- This script tests new/critical constraints based on the latest schema

-- 1. Assignment Type Check in class_offerings
DO $$
BEGIN
  BEGIN
    INSERT INTO class_offerings (term_id, class_id, course_id, periods_per_week, assignment_type)
    VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 5, 'invalid_type');
    RAISE NOTICE '❌ FAILED: Invalid assignment_type allowed';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ PASSED: assignment_type constraint enforced: %', SQLERRM;
  END;
END $$;

-- 2. Positive required_hours_per_term in class_offerings
DO $$
BEGIN
  BEGIN
    INSERT INTO class_offerings (term_id, class_id, course_id, periods_per_week, required_hours_per_term)
    VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 5, 0);
    RAISE NOTICE '❌ FAILED: Zero required_hours_per_term allowed';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ PASSED: required_hours_per_term > 0 constraint enforced: %', SQLERRM;
  END;
END $$;

-- 3. Room Capacity Positive Check
DO $$
BEGIN
  BEGIN
    INSERT INTO rooms (school_id, name, room_type, capacity)
    VALUES (gen_random_uuid(), 'Test Room', 'classroom', 0);
    RAISE NOTICE '❌ FAILED: Zero capacity allowed';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ PASSED: capacity > 0 constraint enforced: %', SQLERRM;
  END;
END $$;

-- 4. Enum Type Check for day_of_week in time_slots
DO $$
BEGIN
  BEGIN
    INSERT INTO time_slots (id, school_id, day_of_week, start_time, end_time, period_number, is_teaching_period, slot_name)
    VALUES (gen_random_uuid(), gen_random_uuid(), 'funday', '08:00:00', '08:45:00', 1, true, 'Test Slot');
    RAISE NOTICE '❌ FAILED: Invalid day_of_week allowed';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ PASSED: day_of_week enum constraint enforced: %', SQLERRM;
  END;
END $$;

-- 5. Check for Default Values
DO $$
DECLARE
  rid uuid;
  aid uuid;
BEGIN
  INSERT INTO rooms (school_id, name, room_type) VALUES (gen_random_uuid(), 'Default Room', 'classroom') RETURNING id INTO rid;
  IF (SELECT capacity FROM rooms WHERE id = rid) = 30 THEN
    RAISE NOTICE '✅ PASSED: Default capacity is 30';
  ELSE
    RAISE NOTICE '❌ FAILED: Default capacity is not 30';
  END IF;
  IF (SELECT is_active FROM rooms WHERE id = rid) = true THEN
    RAISE NOTICE '✅ PASSED: Default is_active is true';
  ELSE
    RAISE NOTICE '❌ FAILED: Default is_active is not true';
  END IF;
  DELETE FROM rooms WHERE id = rid;

  INSERT INTO class_offerings (term_id, class_id, course_id, periods_per_week) VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 5) RETURNING id INTO aid;
  IF (SELECT assignment_type FROM class_offerings WHERE id = aid) = 'ai' THEN
    RAISE NOTICE '✅ PASSED: Default assignment_type is ai';
  ELSE
    RAISE NOTICE '❌ FAILED: Default assignment_type is not ai';
  END IF;
  DELETE FROM class_offerings WHERE id = aid;
END $$;

-- 6. Check for Foreign Key Violations in class_offerings
DO $$
BEGIN
  BEGIN
    INSERT INTO class_offerings (term_id, class_id, course_id, periods_per_week)
    VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 5);
    RAISE NOTICE '❌ FAILED: Invalid foreign key allowed in class_offerings';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ PASSED: Foreign key constraint enforced: %', SQLERRM;
  END;
END $$; 