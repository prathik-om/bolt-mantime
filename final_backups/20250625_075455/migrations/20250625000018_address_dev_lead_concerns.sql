-- Migration to address dev lead concerns about data integrity and performance
-- This migration adds missing foreign keys, constraints, indexes, and validations

BEGIN;

-- 1. Add missing foreign key constraints

-- Add foreign key constraint for holidays.term_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'holidays_term_id_fkey' 
        AND table_name = 'holidays'
    ) THEN
        ALTER TABLE public.holidays 
        ADD CONSTRAINT holidays_term_id_fkey 
        FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for time_slots.school_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'time_slots_school_id_fkey' 
        AND table_name = 'time_slots'
    ) THEN
        ALTER TABLE public.time_slots 
        ADD CONSTRAINT time_slots_school_id_fkey 
        FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for timetable_generations.term_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'timetable_generations_term_id_fkey' 
        AND table_name = 'timetable_generations'
    ) THEN
        ALTER TABLE public.timetable_generations 
        ADD CONSTRAINT timetable_generations_term_id_fkey 
        FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Add missing unique constraints

-- Add unique constraint for teacher_departments (teacher_id, department_id)
-- Note: This already exists as "teacher_departments_teacher_department_unique"

-- 3. Add missing check constraints for date validation

-- Add check constraint for academic_years start_date < end_date
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'academic_years_date_check'
    ) THEN
        ALTER TABLE public.academic_years 
        ADD CONSTRAINT academic_years_date_check 
        CHECK (start_date < end_date);
    END IF;
END $$;

-- Add check constraint for terms start_date < end_date
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'terms_date_check'
    ) THEN
        ALTER TABLE public.terms 
        ADD CONSTRAINT terms_date_check 
        CHECK (start_date < end_date);
    END IF;
END $$;

-- 4. Add performance indexes

-- Add index for classes (school_id, grade_level) for frequently queried combinations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_classes_school_grade' 
        AND tablename = 'classes'
    ) THEN
        CREATE INDEX idx_classes_school_grade ON public.classes(school_id, grade_level);
    END IF;
END $$;

-- Add index for scheduled_lessons (date, timeslot_id) for efficient filtering
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_scheduled_lessons_date_timeslot' 
        AND tablename = 'scheduled_lessons'
    ) THEN
        CREATE INDEX idx_scheduled_lessons_date_timeslot ON public.scheduled_lessons(date, timeslot_id);
    END IF;
END $$;

-- Add index for scheduled_lessons (teaching_assignment_id) for efficient joins
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_scheduled_lessons_teaching_assignment' 
        AND tablename = 'scheduled_lessons'
    ) THEN
        CREATE INDEX idx_scheduled_lessons_teaching_assignment ON public.scheduled_lessons(teaching_assignment_id);
    END IF;
END $$;

-- Add index for time_slots (school_id, day_of_week) for efficient filtering
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_time_slots_school_day' 
        AND tablename = 'time_slots'
    ) THEN
        CREATE INDEX idx_time_slots_school_day ON public.time_slots(school_id, day_of_week);
    END IF;
END $$;

-- 5. Add function to prevent time slot overlaps at database level
CREATE OR REPLACE FUNCTION validate_time_slot_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for overlapping time slots within the same school and day
    IF EXISTS (
        SELECT 1 FROM public.time_slots 
        WHERE school_id = NEW.school_id 
        AND day_of_week = NEW.day_of_week
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (NEW.start_time < end_time AND NEW.end_time > start_time)
            OR (start_time < NEW.end_time AND end_time > NEW.start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Time slot overlaps with existing slot for school % on day %', NEW.school_id, NEW.day_of_week;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for time slot overlap validation
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_validate_time_slot_overlap'
    ) THEN
        CREATE TRIGGER trigger_validate_time_slot_overlap
        BEFORE INSERT OR UPDATE ON public.time_slots
        FOR EACH ROW
        EXECUTE FUNCTION validate_time_slot_overlap();
    END IF;
END $$;

-- 6. Add function to validate term dates within academic year
CREATE OR REPLACE FUNCTION validate_term_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if term dates fall within the academic year
    IF NOT EXISTS (
        SELECT 1 FROM public.academic_years 
        WHERE id = NEW.academic_year_id
        AND NEW.start_date >= start_date 
        AND NEW.end_date <= end_date
    ) THEN
        RAISE EXCEPTION 'Term dates must fall within the academic year dates';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for term date validation
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_validate_term_dates'
    ) THEN
        CREATE TRIGGER trigger_validate_term_dates
        BEFORE INSERT OR UPDATE ON public.terms
        FOR EACH ROW
        EXECUTE FUNCTION validate_term_dates();
    END IF;
END $$;

-- 7. Add function to ensure profiles.school_id is not null for admin users
CREATE OR REPLACE FUNCTION validate_admin_school_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure admin users have a school_id
    IF NEW.role = 'admin' AND NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Admin users must have a school_id';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for admin school_id validation
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_validate_admin_school_id'
    ) THEN
        CREATE TRIGGER trigger_validate_admin_school_id
        BEFORE INSERT OR UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION validate_admin_school_id();
    END IF;
END $$;

-- 8. Add function to validate holiday dates within term
CREATE OR REPLACE FUNCTION validate_holiday_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if holiday date falls within the term
    IF NOT EXISTS (
        SELECT 1 FROM public.terms 
        WHERE id = NEW.term_id
        AND NEW.date >= start_date 
        AND NEW.date <= end_date
    ) THEN
        RAISE EXCEPTION 'Holiday date must fall within the term dates';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for holiday date validation
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_validate_holiday_dates'
    ) THEN
        CREATE TRIGGER trigger_validate_holiday_dates
        BEFORE INSERT OR UPDATE ON public.holidays
        FOR EACH ROW
        EXECUTE FUNCTION validate_holiday_dates();
    END IF;
END $$;

-- 9. Add function to prevent duplicate teacher-department assignments
-- Note: This is already handled by the unique constraint, but we can add additional validation

-- 10. Add function to validate scheduled lesson dates within term
CREATE OR REPLACE FUNCTION validate_scheduled_lesson_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if scheduled lesson date falls within the term of the teaching assignment
    IF NOT EXISTS (
        SELECT 1 FROM public.teaching_assignments ta
        JOIN public.class_offerings co ON ta.class_offering_id = co.id
        JOIN public.terms t ON co.term_id = t.id
        WHERE ta.id = NEW.teaching_assignment_id
        AND NEW.date >= t.start_date 
        AND NEW.date <= t.end_date
    ) THEN
        RAISE EXCEPTION 'Scheduled lesson date must fall within the term dates';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for scheduled lesson date validation
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_validate_scheduled_lesson_dates'
    ) THEN
        CREATE TRIGGER trigger_validate_scheduled_lesson_dates
        BEFORE INSERT OR UPDATE ON public.scheduled_lessons
        FOR EACH ROW
        EXECUTE FUNCTION validate_scheduled_lesson_dates();
    END IF;
END $$;

-- 11. Add comments for documentation
COMMENT ON TABLE public.holidays IS 'Holidays table with foreign key constraint to terms';
COMMENT ON TABLE public.time_slots IS 'Time slots table with foreign key constraint to schools and overlap prevention';
COMMENT ON TABLE public.timetable_generations IS 'Timetable generations table with foreign key constraint to terms';
COMMENT ON TABLE public.profiles IS 'User profiles table with school_id validation for admin users';
COMMENT ON TABLE public.scheduled_lessons IS 'Scheduled lessons table with bigint ID for performance';

COMMIT; 