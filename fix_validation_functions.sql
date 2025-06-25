-- Fix validation functions to match actual schema
-- This addresses the issues found in the validation tests

-- 1. Fix the validate_class_offering_requirements function to use correct column name
CREATE OR REPLACE FUNCTION validate_class_offering_requirements()
RETURNS TRIGGER AS $$
DECLARE
    course_hours INTEGER;
    term_weeks INTEGER;
    required_periods INTEGER;
BEGIN
    -- Get course required hours (use total_hours_per_year instead of required_hours_per_term)
    SELECT total_hours_per_year INTO course_hours
    FROM courses WHERE id = NEW.course_id;
    
    -- Get term duration in weeks
    SELECT EXTRACT(EPOCH FROM (end_date - start_date)) / (7 * 24 * 60 * 60) INTO term_weeks
    FROM terms WHERE id = NEW.term_id;
    
    -- Calculate required periods per week
    IF course_hours IS NOT NULL AND term_weeks > 0 THEN
        required_periods := CEIL(course_hours::DECIMAL / term_weeks);
        
        -- Check if periods_per_week matches required hours
        IF NEW.periods_per_week < required_periods THEN
            RAISE EXCEPTION 'Periods per week (%) is insufficient for required hours (%). Need at least % periods per week', 
                NEW.periods_per_week, course_hours, required_periods;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix the prepare_timetable_data function to use correct column name
CREATE OR REPLACE FUNCTION prepare_timetable_data(school_uuid UUID)
RETURNS TABLE (
    class_offering_id UUID,
    course_id UUID,
    class_id UUID,
    teacher_id UUID,
    periods_per_week INTEGER,
    required_hours INTEGER,
    term_start DATE,
    term_end DATE,
    available_slots JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.id as class_offering_id,
        co.course_id,
        co.class_id,
        ta.teacher_id,
        co.periods_per_week,
        c.total_hours_per_year,  -- Use correct column name
        t.start_date as term_start,
        t.end_date as term_end,
        jsonb_agg(
            jsonb_build_object(
                'day_of_week', ts.day_of_week,
                'start_time', ts.start_time,
                'end_time', ts.end_time,
                'period_number', ts.period_number
            )
        ) as available_slots
    FROM class_offerings co
    JOIN courses c ON co.course_id = c.id
    JOIN terms t ON co.term_id = t.id
    JOIN teaching_assignments ta ON co.id = ta.class_offering_id
    CROSS JOIN time_slots ts
    WHERE c.school_id = school_uuid
    AND ts.school_id = school_uuid
    AND t.academic_year_id IN (
        SELECT id FROM academic_years WHERE school_id = school_uuid AND is_active = true
    )
    GROUP BY co.id, co.course_id, co.class_id, ta.teacher_id, co.periods_per_week, 
             c.total_hours_per_year, t.start_date, t.end_date;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the class_offerings periods constraint to allow 1-40 periods (not 1-20)
ALTER TABLE public.class_offerings 
DROP CONSTRAINT IF EXISTS class_offerings_periods_reasonable;

ALTER TABLE public.class_offerings
ADD CONSTRAINT class_offerings_periods_reasonable CHECK (periods_per_week BETWEEN 1 AND 40);

-- 4. Update the teacher workload validation to use 40 periods max
CREATE OR REPLACE FUNCTION validate_teacher_workload()
RETURNS TRIGGER AS $$
DECLARE
    teacher_workload INTEGER;
BEGIN
    -- Calculate current teacher workload
    SELECT COALESCE(SUM(co.periods_per_week), 0)
    INTO teacher_workload
    FROM class_offerings co
    JOIN teaching_assignments ta ON co.id = ta.class_offering_id
    WHERE ta.teacher_id = NEW.teacher_id;
    
    -- Check if new assignment would exceed 40 periods per week
    IF teacher_workload > 40 THEN
        RAISE EXCEPTION 'Teacher workload would exceed 40 periods per week. Current: %, Max: 40', teacher_workload;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Add comments for documentation
COMMENT ON FUNCTION validate_class_offering_requirements() IS 'Validates class offering periods match required course hours (using total_hours_per_year)';
COMMENT ON FUNCTION prepare_timetable_data(UUID) IS 'Prepares structured data for OR-Tools timetable generation (using total_hours_per_year)';
COMMENT ON FUNCTION validate_teacher_workload() IS 'Validates teacher workload does not exceed 40 periods per week'; 