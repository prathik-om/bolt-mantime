-- Migration: Apply unique constraints and data integrity checks
-- This migration adds comprehensive data validation and constraints for OR-Tools integration

-- Add unique constraints for core scheduling entities
-- This ensures data integrity and prevents duplicate entries

-- 1. Academic Years: Prevent duplicate academic years per school (already exists)
-- The constraint academic_years_school_id_name_key already exists

-- 2. Terms: Prevent duplicate terms per academic year
ALTER TABLE public.terms
ADD CONSTRAINT terms_academic_year_name_unique UNIQUE (academic_year_id, name);

-- 3. Time Slots: Prevent duplicate time slots per school per day (already exists)
-- The constraint time_slots_school_day_start_unique already exists

-- 4. Holidays: Prevent duplicate holidays per academic year
-- NOTE: This constraint will be added in a later migration after academic_year_id column is created
-- ALTER TABLE public.holidays
-- ADD CONSTRAINT holidays_academic_year_date_unique UNIQUE (academic_year_id, date);

-- 5. Class Offerings: Prevent duplicate course offerings per class per term
ALTER TABLE public.class_offerings
ADD CONSTRAINT class_offerings_term_class_course_unique UNIQUE (term_id, class_id, course_id);

-- 6. Teaching Assignments: Prevent duplicate teacher assignments per class offering
ALTER TABLE public.teaching_assignments
ADD CONSTRAINT teaching_assignments_class_offering_teacher_unique UNIQUE (class_offering_id, teacher_id);

-- 7. Create ENUM for timetable generation status
CREATE TYPE timetable_generation_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');

-- 8. Add validation for time slot consistency (using end_time instead of duration_minutes)
ALTER TABLE public.time_slots
ADD CONSTRAINT time_slots_end_after_start CHECK (end_time > start_time);

-- 9. Add validation for academic year dates (already exists)
-- The constraint academic_years_start_before_end already exists

-- 10. Add validation for class offering periods
ALTER TABLE public.class_offerings
ADD CONSTRAINT class_offerings_periods_reasonable CHECK (periods_per_week BETWEEN 1 AND 40);

-- 11. Add validation for teacher workload (simplified without subquery)
-- This will be handled by triggers instead of check constraints

-- Add comprehensive data integrity checks and validation functions
-- This ensures data quality and consistency for OR-Tools integration

-- 1. Function to validate teacher workload constraints
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

-- 2. Function to validate class offering requirements
CREATE OR REPLACE FUNCTION validate_class_offering_requirements()
RETURNS TRIGGER AS $$
DECLARE
    course_hours INTEGER;
    term_weeks INTEGER;
    required_periods INTEGER;
BEGIN
    -- Get course required hours
    SELECT required_hours_per_term INTO course_hours
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

-- 3. Function to validate time slot consistency (using end_time)
CREATE OR REPLACE FUNCTION validate_time_slot_consistency()
RETURNS TRIGGER AS $$
DECLARE
    overlapping_slots INTEGER;
BEGIN
    -- Check for overlapping time slots on the same day
    SELECT COUNT(*)
    INTO overlapping_slots
    FROM time_slots
    WHERE school_id = NEW.school_id 
    AND day_of_week = NEW.day_of_week
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
        (start_time, end_time) 
        OVERLAPS 
        (NEW.start_time, NEW.end_time)
    );
    
    IF overlapping_slots > 0 THEN
        RAISE EXCEPTION 'Time slot overlaps with existing slot on %', NEW.day_of_week;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to validate academic calendar consistency
CREATE OR REPLACE FUNCTION validate_academic_calendar_consistency()
RETURNS TRIGGER AS $$
DECLARE
    academic_start DATE;
    academic_end DATE;
BEGIN
    -- Get academic year dates
    SELECT start_date, end_date 
    INTO academic_start, academic_end
    FROM academic_years 
    WHERE id = NEW.academic_year_id;
    
    -- Validate term dates are within academic year
    IF NEW.start_date < academic_start OR NEW.end_date > academic_end THEN
        RAISE EXCEPTION 'Term dates must be within academic year (% to %)', academic_start, academic_end;
    END IF;
    
    -- Validate term start is before end
    IF NEW.start_date >= NEW.end_date THEN
        RAISE EXCEPTION 'Term start date must be before end date';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to validate holiday dates
CREATE OR REPLACE FUNCTION validate_holiday_dates()
RETURNS TRIGGER AS $$
DECLARE
    academic_start DATE;
    academic_end DATE;
BEGIN
    -- Get academic year dates
    SELECT start_date, end_date 
    INTO academic_start, academic_end
    FROM academic_years 
    WHERE id = NEW.academic_year_id;
    
    -- Validate holiday is within academic year
    IF NEW.date < academic_start OR NEW.date > academic_end THEN
        RAISE EXCEPTION 'Holiday date must be within academic year (% to %)', academic_start, academic_end;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to prepare data for OR-Tools
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
        c.required_hours_per_term,
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
             c.required_hours_per_term, t.start_date, t.end_date;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for data validation
DROP TRIGGER IF EXISTS trigger_validate_teacher_workload ON teaching_assignments;
CREATE TRIGGER trigger_validate_teacher_workload
    BEFORE INSERT OR UPDATE ON teaching_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_teacher_workload();

DROP TRIGGER IF EXISTS trigger_validate_class_offering_requirements ON class_offerings;
CREATE TRIGGER trigger_validate_class_offering_requirements
    BEFORE INSERT OR UPDATE ON class_offerings
    FOR EACH ROW
    EXECUTE FUNCTION validate_class_offering_requirements();

DROP TRIGGER IF EXISTS trigger_validate_time_slot_consistency ON time_slots;
CREATE TRIGGER trigger_validate_time_slot_consistency
    BEFORE INSERT OR UPDATE ON time_slots
    FOR EACH ROW
    EXECUTE FUNCTION validate_time_slot_consistency();

DROP TRIGGER IF EXISTS trigger_validate_academic_calendar_consistency ON terms;
CREATE TRIGGER trigger_validate_academic_calendar_consistency
    BEFORE INSERT OR UPDATE ON terms
    FOR EACH ROW
    EXECUTE FUNCTION validate_academic_calendar_consistency();

DROP TRIGGER IF EXISTS trigger_validate_holiday_dates ON holidays;
CREATE TRIGGER trigger_validate_holiday_dates
    BEFORE INSERT OR UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION validate_holiday_dates();

-- 8. Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_teacher_workload 
ON teaching_assignments (teacher_id, class_offering_id);

CREATE INDEX IF NOT EXISTS idx_class_offerings_term_course 
ON class_offerings (term_id, course_id);

CREATE INDEX IF NOT EXISTS idx_time_slots_school_day_time 
ON time_slots (school_id, day_of_week, start_time);

CREATE INDEX IF NOT EXISTS idx_terms_academic_year_dates 
ON terms (academic_year_id, start_date, end_date);

-- CREATE INDEX IF NOT EXISTS idx_holidays_academic_year_date ON holidays (academic_year_id, date);

-- 9. Add comments for documentation
COMMENT ON FUNCTION validate_teacher_workload() IS 'Validates teacher workload does not exceed 40 periods per week';
COMMENT ON FUNCTION validate_class_offering_requirements() IS 'Validates class offering periods match required course hours';
COMMENT ON FUNCTION validate_time_slot_consistency() IS 'Validates time slots do not overlap on the same day';
COMMENT ON FUNCTION validate_academic_calendar_consistency() IS 'Validates term dates are within academic year bounds';
COMMENT ON FUNCTION validate_holiday_dates() IS 'Validates holiday dates are within academic year';
COMMENT ON FUNCTION prepare_timetable_data(UUID) IS 'Prepares structured data for OR-Tools timetable generation';
