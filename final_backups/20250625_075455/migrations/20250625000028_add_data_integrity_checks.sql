-- Add data integrity checks and validation functions for CEO-identified concerns
-- This ensures single source of truth and consistency for OR-Tools integration

-- 1. Add check constraints for period duration consistency
ALTER TABLE public.time_slots 
ADD CONSTRAINT time_slots_duration_check 
CHECK (
  EXTRACT(EPOCH FROM (end_time::time - start_time::time)) / 60 >= 15 
  AND EXTRACT(EPOCH FROM (end_time::time - start_time::time)) / 60 <= 240
);

-- 2. Add check constraint for periods_per_week
ALTER TABLE public.class_offerings 
ADD CONSTRAINT class_offerings_periods_per_week_check 
CHECK (periods_per_week > 0 AND periods_per_week <= 50);

-- 3. Add check constraint for required_hours_per_term
ALTER TABLE public.class_offerings 
ADD CONSTRAINT class_offerings_required_hours_check 
CHECK (required_hours_per_term IS NULL OR required_hours_per_term >= 0);

-- 4. Add check constraint for period_duration_minutes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'terms_period_duration_check'
  ) THEN
    ALTER TABLE public.terms ADD CONSTRAINT terms_period_duration_check
    CHECK (period_duration_minutes IS NULL OR (period_duration_minutes >= 15 AND period_duration_minutes <= 240));
  END IF;
END $$;

-- 5. Add check constraint for school period duration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schools_period_duration_check'
  ) THEN
    ALTER TABLE public.schools ADD CONSTRAINT schools_period_duration_check
    CHECK (period_duration IS NULL OR (period_duration >= 15 AND period_duration <= 240));
  END IF;
END $$;

-- 6. Add check constraint for sessions per day
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schools_sessions_per_day_check'
  ) THEN
    ALTER TABLE public.schools ADD CONSTRAINT schools_sessions_per_day_check
    CHECK (sessions_per_day IS NULL OR (sessions_per_day >= 1 AND sessions_per_day <= 20));
  END IF;
END $$;

-- 7. Add check constraint for max periods per week
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_offerings_max_periods_check'
  ) THEN
    ALTER TABLE public.class_offerings ADD CONSTRAINT class_offerings_max_periods_check
    CHECK (periods_per_week >= 1 AND periods_per_week <= 20);
  END IF;
END $$;

-- 8. Add check constraint for grade level consistency
-- Note: Complex subquery constraints are not allowed in PostgreSQL
-- This validation should be handled by triggers or application logic

-- 9. Add check constraint for school consistency  
-- Note: Complex subquery constraints are not allowed in PostgreSQL
-- This validation should be handled by triggers or application logic

-- 10. Add check constraint for term date consistency
-- Note: Complex subquery constraints are not allowed in PostgreSQL
-- This validation should be handled by triggers or application logic

-- 11. Create function to validate period duration consistency
CREATE OR REPLACE FUNCTION validate_period_duration_consistency(school_id_param UUID)
RETURNS TABLE(
  validation_type TEXT,
  message TEXT,
  severity TEXT,
  details JSONB
) AS $$
BEGIN
  -- Check if time slots align with term period duration
  RETURN QUERY
  SELECT 
    'period_duration_mismatch'::TEXT as validation_type,
    'Time slot duration does not match term period duration'::TEXT as message,
    'warning'::TEXT as severity,
    jsonb_build_object(
      'term_id', t.id,
      'term_name', t.name,
      'term_period_duration', t.period_duration_minutes,
      'time_slot_id', ts.id,
      'time_slot_duration', EXTRACT(EPOCH FROM (ts.end_time::time - ts.start_time::time)) / 60,
      'day_of_week', ts.day_of_week,
      'start_time', ts.start_time,
      'end_time', ts.end_time
    ) as details
  FROM time_slots ts
  JOIN terms t ON t.academic_year_id IN (
    SELECT id FROM academic_years WHERE school_id = school_id_param
  )
  WHERE ts.school_id = school_id_param
  AND t.period_duration_minutes IS NOT NULL
  AND ABS(
    EXTRACT(EPOCH FROM (ts.end_time::time - ts.start_time::time)) / 60 - t.period_duration_minutes
  ) > 5; -- Allow 5 minute tolerance
  
  -- Check if class offerings have required hours when they should
  RETURN QUERY
  SELECT 
    'missing_required_hours'::TEXT as validation_type,
    'Class offering missing required hours per term'::TEXT as message,
    'error'::TEXT as severity,
    jsonb_build_object(
      'class_offering_id', co.id,
      'course_name', c.name,
      'class_name', cl.name,
      'term_name', t.name,
      'periods_per_week', co.periods_per_week
    ) as details
  FROM class_offerings co
  JOIN courses c ON c.id = co.course_id
  JOIN classes cl ON cl.id = co.class_id
  JOIN terms t ON t.id = co.term_id
  WHERE c.school_id = school_id_param
  AND co.required_hours_per_term IS NULL
  AND co.periods_per_week > 0;
  
  -- Check for inconsistent periods vs hours calculations
  RETURN QUERY
  SELECT 
    'inconsistent_hours_calculation'::TEXT as validation_type,
    'Periods per week and required hours are inconsistent'::TEXT as message,
    'warning'::TEXT as severity,
    jsonb_build_object(
      'class_offering_id', co.id,
      'course_name', c.name,
      'class_name', cl.name,
      'term_name', t.name,
      'periods_per_week', co.periods_per_week,
      'required_hours_per_term', co.required_hours_per_term,
      'term_period_duration', t.period_duration_minutes,
      'expected_hours', (co.periods_per_week * t.period_duration_minutes / 60.0) * 
        (EXTRACT(EPOCH FROM (t.end_date::date - t.start_date::date)) / (7 * 24 * 3600))
    ) as details
  FROM class_offerings co
  JOIN courses c ON c.id = co.course_id
  JOIN classes cl ON cl.id = co.class_id
  JOIN terms t ON t.id = co.term_id
  WHERE c.school_id = school_id_param
  AND co.required_hours_per_term IS NOT NULL
  AND t.period_duration_minutes IS NOT NULL
  AND ABS(
    co.required_hours_per_term - 
    (co.periods_per_week * t.period_duration_minutes / 60.0) * 
    (EXTRACT(EPOCH FROM (t.end_date::date - t.start_date::date)) / (7 * 24 * 3600))
  ) > 5; -- Allow 5 hour tolerance
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to auto-calculate required hours per term
CREATE OR REPLACE FUNCTION calculate_required_hours_per_term()
RETURNS TRIGGER AS $$
BEGIN
  -- If required_hours_per_term is NULL but we have periods_per_week and term duration
  IF NEW.required_hours_per_term IS NULL AND NEW.periods_per_week > 0 THEN
    SELECT 
      (NEW.periods_per_week * t.period_duration_minutes / 60.0) * 
      (EXTRACT(EPOCH FROM (t.end_date::date - t.start_date::date)) / (7 * 24 * 3600))
    INTO NEW.required_hours_per_term
    FROM terms t
    WHERE t.id = NEW.term_id
    AND t.period_duration_minutes IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger to auto-calculate required hours
CREATE TRIGGER auto_calculate_required_hours
  BEFORE INSERT OR UPDATE ON class_offerings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_required_hours_per_term();

-- 14. Create function to validate course hours distribution
CREATE OR REPLACE FUNCTION validate_course_hours_distribution(course_id_param UUID)
RETURNS TABLE(
  validation_type TEXT,
  message TEXT,
  severity TEXT,
  details JSONB
) AS $$
DECLARE
  course_record RECORD;
  total_terms INTEGER;
  expected_hours_per_term NUMERIC;
BEGIN
  -- Get course information
  SELECT * INTO course_record FROM courses WHERE id = course_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Count terms in the academic year
  SELECT COUNT(*) INTO total_terms
  FROM terms t
  JOIN academic_years ay ON ay.id = t.academic_year_id
  WHERE ay.school_id = course_record.school_id;
  
  -- Validate hours distribution
  IF course_record.hours_distribution_type = 'equal' AND course_record.total_hours_per_year IS NOT NULL THEN
    expected_hours_per_term := course_record.total_hours_per_year / total_terms;
    
    -- Check if class offerings match expected hours
    RETURN QUERY
    SELECT 
      'hours_distribution_mismatch'::TEXT as validation_type,
      'Class offering hours do not match course distribution'::TEXT as message,
      'warning'::TEXT as severity,
      jsonb_build_object(
        'course_id', course_record.id,
        'course_name', course_record.name,
        'distribution_type', course_record.hours_distribution_type,
        'total_hours_per_year', course_record.total_hours_per_year,
        'expected_hours_per_term', expected_hours_per_term,
        'total_terms', total_terms,
        'class_offering_id', co.id,
        'actual_hours_per_term', co.required_hours_per_term
      ) as details
    FROM class_offerings co
    WHERE co.course_id = course_id_param
    AND co.required_hours_per_term IS NOT NULL
    AND ABS(co.required_hours_per_term - expected_hours_per_term) > 2; -- Allow 2 hour tolerance
  END IF;
  
  -- Validate custom term hours
  IF course_record.hours_distribution_type = 'custom' AND course_record.term_hours IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      'custom_hours_mismatch'::TEXT as validation_type,
      'Class offering hours do not match custom term hours'::TEXT as message,
      'warning'::TEXT as severity,
      jsonb_build_object(
        'course_id', course_record.id,
        'course_name', course_record.name,
        'term_hours', course_record.term_hours,
        'class_offering_id', co.id,
        'term_id', co.term_id,
        'actual_hours_per_term', co.required_hours_per_term
      ) as details
    FROM class_offerings co
    WHERE co.course_id = course_id_param
    AND co.required_hours_per_term IS NOT NULL
    AND course_record.term_hours ? co.term_id::TEXT
    AND ABS(co.required_hours_per_term - (course_record.term_hours->>co.term_id::TEXT)::NUMERIC) > 2;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 15. Create function to get available teaching time for OR-Tools
CREATE OR REPLACE FUNCTION get_available_teaching_time(term_id_param UUID)
RETURNS TABLE(
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  period_number INTEGER,
  slot_id UUID,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.day_of_week,
    ts.start_time,
    ts.end_time,
    ts.period_number,
    ts.id as slot_id,
    CASE 
      WHEN h.id IS NOT NULL THEN FALSE -- Holiday
      WHEN ts.is_teaching_period = FALSE THEN FALSE -- Break period
      ELSE TRUE -- Available for teaching
    END as is_available
  FROM time_slots ts
  JOIN terms t ON t.id = term_id_param
  JOIN academic_years ay ON ay.id = t.academic_year_id
  LEFT JOIN holidays h ON h.date BETWEEN t.start_date AND t.end_date
    AND EXTRACT(DOW FROM h.date) = ts.day_of_week
    AND h.school_id = ts.school_id
  WHERE ts.school_id = ay.school_id
  ORDER BY ts.day_of_week, ts.start_time;
END;
$$ LANGUAGE plpgsql;

-- 16. Create function to validate teacher workload constraints
CREATE OR REPLACE FUNCTION validate_teacher_workload_constraints(term_id_param UUID)
RETURNS TABLE(
  teacher_id UUID,
  teacher_name TEXT,
  current_periods INTEGER,
  max_periods INTEGER,
  available_periods INTEGER,
  is_overloaded BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as teacher_id,
    (t.first_name || ' ' || t.last_name) as teacher_name,
    COALESCE(SUM(co.periods_per_week), 0) as current_periods,
    COALESCE(t.max_periods_per_week, 0) as max_periods,
    GREATEST(0, COALESCE(t.max_periods_per_week, 0) - COALESCE(SUM(co.periods_per_week), 0)) as available_periods,
    CASE 
      WHEN t.max_periods_per_week IS NOT NULL 
      AND SUM(co.periods_per_week) > t.max_periods_per_week 
      THEN TRUE 
      ELSE FALSE 
    END as is_overloaded
  FROM teachers t
  LEFT JOIN teaching_assignments ta ON ta.teacher_id = t.id
  LEFT JOIN class_offerings co ON co.id = ta.class_offering_id AND co.term_id = term_id_param
  WHERE t.school_id = (SELECT ay.school_id FROM terms tr JOIN academic_years ay ON ay.id = tr.academic_year_id WHERE tr.id = term_id_param)
  GROUP BY t.id, t.first_name, t.last_name, t.max_periods_per_week
  ORDER BY is_overloaded DESC, current_periods DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION validate_period_duration_consistency(UUID) IS 'Validates consistency between time slots and term period durations';
COMMENT ON FUNCTION calculate_required_hours_per_term() IS 'Auto-calculates required hours per term based on periods per week and term duration';
COMMENT ON FUNCTION validate_course_hours_distribution(UUID) IS 'Validates course hours distribution against class offerings';
COMMENT ON FUNCTION get_available_teaching_time(UUID) IS 'Gets available teaching time slots for OR-Tools, excluding holidays and breaks';
COMMENT ON FUNCTION validate_teacher_workload_constraints(UUID) IS 'Validates teacher workload constraints for a specific term';

-- 1. Validate class offerings have valid class references
CREATE OR REPLACE FUNCTION validate_class_offerings_integrity()
RETURNS TABLE(issue_type TEXT, description TEXT, record_id UUID) AS $$
BEGIN
    -- Check for orphaned class offerings
    RETURN QUERY
    SELECT 
        'orphaned_class_offering'::TEXT,
        'Class offering references non-existent class'::TEXT,
        co.id
    FROM class_offerings co
    LEFT JOIN classes c ON c.id = co.class_id
    WHERE c.id IS NULL;
    
    -- Check for orphaned class offerings (no valid term)
    RETURN QUERY
    SELECT 
        'orphaned_class_offering'::TEXT,
        'Class offering references non-existent term'::TEXT,
        co.id
    FROM class_offerings co
    LEFT JOIN terms t ON t.id = co.term_id
    WHERE t.id IS NULL;
    
    -- Check for orphaned class offerings (no valid course)
    RETURN QUERY
    SELECT 
        'orphaned_class_offering'::TEXT,
        'Class offering references non-existent course'::TEXT,
        co.id
    FROM class_offerings co
    LEFT JOIN courses c ON c.id = co.course_id
    WHERE c.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Validate teaching assignments have valid references
CREATE OR REPLACE FUNCTION validate_teaching_assignments_integrity()
RETURNS TABLE(issue_type TEXT, description TEXT, record_id UUID) AS $$
BEGIN
    -- Check for orphaned teaching assignments
    RETURN QUERY
    SELECT 
        'orphaned_teaching_assignment'::TEXT,
        'Teaching assignment references non-existent class offering'::TEXT,
        ta.id
    FROM teaching_assignments ta
    LEFT JOIN class_offerings co ON co.id = ta.class_offering_id
    WHERE co.id IS NULL;
    
    -- Check for orphaned teaching assignments (no valid teacher)
    RETURN QUERY
    SELECT 
        'orphaned_teaching_assignment'::TEXT,
        'Teaching assignment references non-existent teacher'::TEXT,
        ta.id
    FROM teaching_assignments ta
    LEFT JOIN teachers t ON t.id = ta.teacher_id
    WHERE t.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Validate scheduled lessons have valid references
CREATE OR REPLACE FUNCTION validate_scheduled_lessons_integrity()
RETURNS TABLE(issue_type TEXT, description TEXT, record_id UUID) AS $$
BEGIN
    -- Check for orphaned scheduled lessons
    RETURN QUERY
    SELECT 
        'orphaned_scheduled_lesson'::TEXT,
        'Scheduled lesson references non-existent class offering'::TEXT,
        sl.id
    FROM scheduled_lessons sl
    LEFT JOIN class_offerings co ON co.id = sl.class_offering_id
    WHERE co.id IS NULL;
    
    -- Check for orphaned scheduled lessons (no valid time slot)
    RETURN QUERY
    SELECT 
        'orphaned_scheduled_lesson'::TEXT,
        'Scheduled lesson references non-existent time slot'::TEXT,
        sl.id
    FROM scheduled_lessons sl
    LEFT JOIN time_slots ts ON ts.id = sl.time_slot_id
    WHERE ts.id IS NULL;
    
    -- Check for orphaned scheduled lessons (no valid room)
    RETURN QUERY
    SELECT 
        'orphaned_scheduled_lesson'::TEXT,
        'Scheduled lesson references non-existent room'::TEXT,
        sl.id
    FROM scheduled_lessons sl
    LEFT JOIN rooms r ON r.id = sl.room_id
    WHERE r.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Validate cross-reference consistency
CREATE OR REPLACE FUNCTION validate_cross_references()
RETURNS TABLE(issue_type TEXT, description TEXT, record_id UUID) AS $$
BEGIN
    -- Check for grade level mismatches between classes and courses
    RETURN QUERY
    SELECT 
        'grade_level_mismatch'::TEXT,
        'Class and course have different grade levels'::TEXT,
        co.id
    FROM class_offerings co
    JOIN classes cl ON cl.id = co.class_id
    JOIN courses c ON c.id = co.course_id
    WHERE cl.grade_level != c.grade_level;
    
    -- Check for school consistency issues
    RETURN QUERY
    SELECT 
        'school_mismatch'::TEXT,
        'Class and course belong to different schools'::TEXT,
        co.id
    FROM class_offerings co
    JOIN classes cl ON cl.id = co.class_id
    JOIN courses c ON c.id = co.course_id
    WHERE cl.school_id != c.school_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Comprehensive validation function
CREATE OR REPLACE FUNCTION validate_all_data_integrity()
RETURNS TABLE(validation_type TEXT, message TEXT, record_id UUID) AS $$
BEGIN
    -- Run all validation functions
    RETURN QUERY SELECT * FROM validate_class_offerings_integrity();
    RETURN QUERY SELECT * FROM validate_teaching_assignments_integrity();
    RETURN QUERY SELECT * FROM validate_scheduled_lessons_integrity();
    RETURN QUERY SELECT * FROM validate_cross_references();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_class_offerings_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_teaching_assignments_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_scheduled_lessons_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_cross_references() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_all_data_integrity() TO authenticated; 