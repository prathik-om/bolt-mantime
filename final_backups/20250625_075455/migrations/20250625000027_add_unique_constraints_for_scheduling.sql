-- Add unique constraints for core scheduling entities
-- This is critical for data integrity and OR-Tools solver integration

-- 1. Academic Years: Prevent duplicate names and overlapping periods per school
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'academic_years_school_name_unique'
  ) THEN
    ALTER TABLE public.academic_years ADD CONSTRAINT academic_years_school_name_unique UNIQUE (school_id, name);
  END IF;
END $$;

ALTER TABLE public.academic_years 
ADD CONSTRAINT academic_years_school_dates_unique UNIQUE (school_id, start_date, end_date);

-- 2. Terms: Prevent duplicate names and overlapping periods within academic year
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'terms_academic_year_name_unique'
  ) THEN
    ALTER TABLE public.terms ADD CONSTRAINT terms_academic_year_name_unique UNIQUE (academic_year_id, name);
  END IF;
END $$;

ALTER TABLE public.terms 
ADD CONSTRAINT terms_academic_year_dates_unique UNIQUE (academic_year_id, start_date, end_date);

-- 3. Time Slots: Critical for scheduling - prevent ambiguous time periods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_slots_school_day_time_unique'
  ) THEN
    ALTER TABLE public.time_slots ADD CONSTRAINT time_slots_school_day_time_unique UNIQUE (school_id, day_of_week, start_time, end_time);
  END IF;
END $$;

ALTER TABLE public.time_slots 
ADD CONSTRAINT time_slots_school_day_period_unique UNIQUE (school_id, day_of_week, period_number);

-- 4. Holidays: School-specific holidays
-- First, drop the existing unique constraint if it exists
ALTER TABLE public.holidays 
DROP CONSTRAINT IF EXISTS holidays_date_unique;

-- Add school-specific unique constraint
ALTER TABLE public.holidays 
ADD CONSTRAINT holidays_school_date_unique UNIQUE (school_id, date);

-- 5. Class Offerings: Prevent duplicate course offerings per class per term
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_offerings_term_class_course_unique'
  ) THEN
    ALTER TABLE public.class_offerings ADD CONSTRAINT class_offerings_term_class_course_unique UNIQUE (term_id, class_id, course_id);
  END IF;
END $$;

-- 6. Teaching Assignments: One teacher per class offering (for MVP)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teaching_assignments_class_offering_teacher_unique'
  ) THEN
    ALTER TABLE public.teaching_assignments ADD CONSTRAINT teaching_assignments_class_offering_teacher_unique UNIQUE (class_offering_id, teacher_id);
  END IF;
END $$;

-- 7. Create ENUM for timetable generation status
CREATE TYPE timetable_status AS ENUM ('draft', 'generating', 'completed', 'failed', 'published');

-- Update the timetable_generations table to use the ENUM
ALTER TABLE public.timetable_generations ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.timetable_generations ALTER COLUMN status TYPE timetable_status USING status::timetable_status;
ALTER TABLE public.timetable_generations ALTER COLUMN status SET DEFAULT 'draft';

-- Add comments for documentation
COMMENT ON CONSTRAINT academic_years_school_name_unique ON public.academic_years IS 'Prevents duplicate academic year names within a school';
COMMENT ON CONSTRAINT academic_years_school_dates_unique ON public.academic_years IS 'Prevents overlapping academic year periods within a school';
COMMENT ON CONSTRAINT terms_academic_year_name_unique ON public.terms IS 'Prevents duplicate term names within an academic year';
COMMENT ON CONSTRAINT terms_academic_year_dates_unique ON public.terms IS 'Prevents overlapping term periods within an academic year';
COMMENT ON CONSTRAINT time_slots_school_day_time_unique ON public.time_slots IS 'Prevents ambiguous time periods for scheduling';
COMMENT ON CONSTRAINT time_slots_school_day_period_unique ON public.time_slots IS 'Ensures unique period numbers per day for scheduling';
COMMENT ON CONSTRAINT holidays_school_date_unique ON public.holidays IS 'School-specific holidays - same date can be holiday for one school but not another';
COMMENT ON CONSTRAINT class_offerings_term_class_course_unique ON public.class_offerings IS 'Prevents duplicate course offerings per class per term';
COMMENT ON CONSTRAINT teaching_assignments_class_offering_teacher_unique ON public.teaching_assignments IS 'One teacher per class offering (MVP assumption)';
COMMENT ON TYPE timetable_status IS 'Status enum for timetable generation process - critical for OR-Tools integration';

-- 8. Departments: Prevent duplicate names within same school
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departments_school_name_unique'
  ) THEN
    ALTER TABLE public.departments ADD CONSTRAINT departments_school_name_unique UNIQUE (school_id, name);
  END IF;
END $$;

-- 9. Courses: Prevent duplicate names within same school and grade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_school_grade_name_unique'
  ) THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_school_grade_name_unique UNIQUE (school_id, grade_level, name);
  END IF;
END $$;

-- 10. Rooms: Prevent duplicate names within same school
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rooms_school_name_unique'
  ) THEN
    ALTER TABLE public.rooms ADD CONSTRAINT rooms_school_name_unique UNIQUE (school_id, name);
  END IF;
END $$;

-- 11. Teachers: Prevent duplicate names within same school
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teachers_school_name_unique'
  ) THEN
    ALTER TABLE public.teachers ADD CONSTRAINT teachers_school_name_unique UNIQUE (school_id, first_name, last_name);
  END IF;
END $$;

-- 12. Classes: Prevent duplicate names within same school and grade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_school_grade_name_unique'
  ) THEN
    ALTER TABLE public.classes ADD CONSTRAINT classes_school_grade_name_unique UNIQUE (school_id, grade_level, name);
  END IF;
END $$; 