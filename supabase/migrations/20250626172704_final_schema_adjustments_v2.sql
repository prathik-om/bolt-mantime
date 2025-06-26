-- Final Schema Adjustments V2
-- This migration addresses the remaining critical issues

-- Drop dependent views first
DROP MATERIALIZED VIEW IF EXISTS public.class_schedules_view;

-- 1. Fix classes.name to use a trigger
CREATE OR REPLACE FUNCTION update_class_name()
RETURNS TRIGGER AS $$
BEGIN
    SELECT grade_name || CASE 
        WHEN NEW.section IS NOT NULL THEN '-' || NEW.section 
        ELSE '' 
    END
    INTO NEW.name
    FROM public.grades 
    WHERE id = NEW.grade_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_class_name_trigger ON public.classes;

CREATE TRIGGER update_class_name_trigger
    BEFORE INSERT OR UPDATE OF grade_id, section
    ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION update_class_name();

-- 2. Convert timetable_generations.status to text with CHECK constraint
DO $$ BEGIN
    ALTER TABLE public.timetable_generations 
        ALTER COLUMN status TYPE text;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.timetable_generations
        DROP CONSTRAINT IF EXISTS timetable_generations_status_check;

    ALTER TABLE public.timetable_generations
        ADD CONSTRAINT timetable_generations_status_check 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Add any missing ON DELETE CASCADE constraints
DO $$ BEGIN
    ALTER TABLE public.timetable_generations
        DROP CONSTRAINT IF EXISTS timetable_generations_term_id_fkey;

    ALTER TABLE public.timetable_generations
        ADD CONSTRAINT timetable_generations_term_id_fkey 
        FOREIGN KEY (term_id) 
        REFERENCES public.terms(id) 
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Add any missing UNIQUE constraints
DO $$ BEGIN
    ALTER TABLE public.breaks
        DROP CONSTRAINT IF EXISTS breaks_school_sequence_unique;

    ALTER TABLE public.breaks
        ADD CONSTRAINT breaks_school_sequence_unique 
        UNIQUE (school_id, sequence);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.grade_subjects
        DROP CONSTRAINT IF EXISTS grade_subjects_unique;

    ALTER TABLE public.grade_subjects
        ADD CONSTRAINT grade_subjects_unique 
        UNIQUE (grade_id, subject_id, school_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.teacher_departments
        DROP CONSTRAINT IF EXISTS teacher_departments_unique;

    ALTER TABLE public.teacher_departments
        ADD CONSTRAINT teacher_departments_unique 
        UNIQUE (teacher_id, department_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.teacher_subject_qualifications
        DROP CONSTRAINT IF EXISTS teacher_subject_qualifications_unique;

    ALTER TABLE public.teacher_subject_qualifications
        ADD CONSTRAINT teacher_subject_qualifications_unique 
        UNIQUE (teacher_id, subject_id, grade_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.teaching_assignments
        DROP CONSTRAINT IF EXISTS teaching_assignments_unique;

    ALTER TABLE public.teaching_assignments
        ADD CONSTRAINT teaching_assignments_unique 
        UNIQUE (teacher_id, class_offering_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.time_slots
        DROP CONSTRAINT IF EXISTS time_slots_unique;

    ALTER TABLE public.time_slots
        ADD CONSTRAINT time_slots_unique 
        UNIQUE (school_id, day_of_week, start_time, end_time);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Recreate the materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.class_schedules_view AS
SELECT 
    te.id as timetable_entry_id,
    te.date,
    ts.start_time,
    ts.end_time,
    ts.day_of_week,
    c.name as class_name,
    c.id as class_id,
    t.full_name as teacher_name,
    t.id as teacher_id,
    s.name as subject_name,
    s.id as subject_id,
    tg.id as timetable_generation_id,
    tg.status as generation_status,
    co.term_id,
    co.id as class_offering_id
FROM 
    public.timetable_entries te
    JOIN public.time_slots ts ON te.timeslot_id = ts.id
    JOIN public.teaching_assignments ta ON te.teaching_assignment_id = ta.id
    JOIN public.teachers t ON ta.teacher_id = t.id
    JOIN public.class_offerings co ON ta.class_offering_id = co.id
    JOIN public.classes c ON co.class_id = c.id
    JOIN public.subjects s ON co.subject_id = s.id
    JOIN public.timetable_generations tg ON te.timetable_generation_id = tg.id
WITH NO DATA;

-- Add new ENUM types for better type safety
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assignment_type AS ENUM ('primary', 'substitute', 'assistant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subject_type AS ENUM ('core', 'elective', 'extra_curricular');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add comments for documentation
COMMENT ON TYPE user_role IS 'Defines possible user roles in the system';
COMMENT ON TYPE assignment_type IS 'Types of teaching assignments';
COMMENT ON TYPE subject_type IS 'Categories of subjects';

-- Create temporary columns with the new types
DO $$ BEGIN
    ALTER TABLE teaching_assignments ADD COLUMN assignment_type_new assignment_type;
    UPDATE teaching_assignments SET assignment_type_new = assignment_type::text::assignment_type;
    ALTER TABLE teaching_assignments DROP COLUMN assignment_type;
    ALTER TABLE teaching_assignments RENAME COLUMN assignment_type_new TO assignment_type;
    ALTER TABLE teaching_assignments ALTER COLUMN assignment_type SET DEFAULT 'primary'::assignment_type;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE subjects ADD COLUMN subject_type_new subject_type;
    UPDATE subjects SET subject_type_new = subject_type::text::subject_type;
    ALTER TABLE subjects DROP COLUMN subject_type;
    ALTER TABLE subjects RENAME COLUMN subject_type_new TO subject_type;
    ALTER TABLE subjects ALTER COLUMN subject_type SET DEFAULT 'core'::subject_type;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Add additional data integrity constraints
DO $$ BEGIN
    ALTER TABLE academic_years 
        ADD CONSTRAINT academic_years_dates_check 
        CHECK (end_date > start_date);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE terms 
        ADD CONSTRAINT terms_dates_check 
        CHECK (end_date > start_date);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create a trigger function to validate term dates against academic year
CREATE OR REPLACE FUNCTION validate_term_dates()
RETURNS TRIGGER AS $$
DECLARE
    academic_year_start date;
    academic_year_end date;
BEGIN
    SELECT start_date, end_date INTO academic_year_start, academic_year_end
    FROM academic_years
    WHERE id = NEW.academic_year_id;

    IF NEW.start_date < academic_year_start OR NEW.end_date > academic_year_end THEN
        RAISE EXCEPTION 'Term dates must be within the academic year dates';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_term_dates_trigger ON terms;

CREATE TRIGGER validate_term_dates_trigger
    BEFORE INSERT OR UPDATE ON terms
    FOR EACH ROW
    EXECUTE FUNCTION validate_term_dates();

DO $$ BEGIN
    ALTER TABLE time_slots 
        ADD CONSTRAINT time_slots_times_check 
        CHECK (end_time > start_time);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE time_slots 
        ADD CONSTRAINT time_slots_period_check 
        CHECK (period_number > 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE class_offerings 
        ADD CONSTRAINT class_offerings_periods_check 
        CHECK (periods_per_week > 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE class_offerings 
        ADD CONSTRAINT class_offerings_unique_per_term 
        UNIQUE (term_id, class_id, subject_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE teachers 
        ADD CONSTRAINT teachers_name_check 
        CHECK (first_name IS NOT NULL AND last_name IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add comments for documentation
COMMENT ON CONSTRAINT academic_years_dates_check ON academic_years IS 'Ensures academic year end date is after start date';
COMMENT ON CONSTRAINT terms_dates_check ON terms IS 'Ensures term end date is after start date';
COMMENT ON CONSTRAINT time_slots_times_check ON time_slots IS 'Ensures time slot end time is after start time';
COMMENT ON CONSTRAINT time_slots_period_check ON time_slots IS 'Ensures period numbers are positive';
COMMENT ON CONSTRAINT class_offerings_periods_check ON class_offerings IS 'Ensures positive number of periods per week';
COMMENT ON CONSTRAINT class_offerings_unique_per_term ON class_offerings IS 'Prevents duplicate class offerings in a term';
COMMENT ON CONSTRAINT teachers_name_check ON teachers IS 'Ensures teacher names are not null';

-- Add explicit foreign key actions
ALTER TABLE terms
    DROP CONSTRAINT IF EXISTS terms_academic_year_id_fkey,
    ADD CONSTRAINT terms_academic_year_id_fkey 
    FOREIGN KEY (academic_year_id) 
    REFERENCES academic_years(id) 
    ON DELETE CASCADE;

ALTER TABLE class_offerings
    DROP CONSTRAINT IF EXISTS class_offerings_term_id_fkey,
    ADD CONSTRAINT class_offerings_term_id_fkey 
    FOREIGN KEY (term_id) 
    REFERENCES terms(id) 
    ON DELETE CASCADE;

ALTER TABLE teaching_assignments
    DROP CONSTRAINT IF EXISTS teaching_assignments_class_offering_id_fkey,
    ADD CONSTRAINT teaching_assignments_class_offering_id_fkey 
    FOREIGN KEY (class_offering_id) 
    REFERENCES class_offerings(id) 
    ON DELETE CASCADE;

ALTER TABLE timetable_entries
    DROP CONSTRAINT IF EXISTS timetable_entries_teaching_assignment_id_fkey,
    ADD CONSTRAINT timetable_entries_teaching_assignment_id_fkey 
    FOREIGN KEY (teaching_assignment_id) 
    REFERENCES teaching_assignments(id) 
    ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON CONSTRAINT terms_academic_year_id_fkey ON terms IS 'Cascade deletes from academic years to terms';
COMMENT ON CONSTRAINT class_offerings_term_id_fkey ON class_offerings IS 'Cascade deletes from terms to class offerings';
COMMENT ON CONSTRAINT teaching_assignments_class_offering_id_fkey ON teaching_assignments IS 'Cascade deletes from class offerings to teaching assignments';
COMMENT ON CONSTRAINT timetable_entries_teaching_assignment_id_fkey ON timetable_entries IS 'Cascade deletes from teaching assignments to timetable entries'; 