-- Migration: Fix Holidays and Add All Critical Constraints for OR-Tools
-- Date: 2025-06-25
-- Description: Comprehensive migration to fix holidays table and add all unique constraints
-- for OR-Tools integration and multi-school support

BEGIN;

-- ============================================================================
-- SECTION 1: FIX HOLIDAYS TABLE STRUCTURE
-- ============================================================================

-- Add academic_year_id column to holidays table
ALTER TABLE public.holidays 
ADD COLUMN IF NOT EXISTS academic_year_id UUID;

-- Add school_id column to holidays table (if not exists)
ALTER TABLE public.holidays 
ADD COLUMN IF NOT EXISTS school_id UUID;

-- Update school_id based on academic_year_id (if academic_year_id exists)
UPDATE public.holidays 
SET school_id = (
    SELECT ay.school_id 
    FROM public.academic_years ay 
    WHERE ay.id = holidays.academic_year_id
)
WHERE school_id IS NULL AND academic_year_id IS NOT NULL;

-- Make academic_year_id and school_id NOT NULL after data migration
ALTER TABLE public.holidays 
ALTER COLUMN academic_year_id SET NOT NULL;

ALTER TABLE public.holidays 
ALTER COLUMN school_id SET NOT NULL;

-- Drop the old term_id column
ALTER TABLE public.holidays 
DROP COLUMN IF EXISTS term_id;

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'holidays_academic_year_id_fkey'
    ) THEN
        ALTER TABLE public.holidays ADD CONSTRAINT holidays_academic_year_id_fkey 
        FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'holidays_school_id_fkey'
    ) THEN
        ALTER TABLE public.holidays ADD CONSTRAINT holidays_school_id_fkey 
        FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: ADD CRITICAL UNIQUE CONSTRAINTS FOR OR-TOOLS
-- ============================================================================

-- 1. Holidays: Multi-school support with academic year
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'holidays_school_academic_year_date_unique'
    ) THEN
        ALTER TABLE public.holidays ADD CONSTRAINT holidays_school_academic_year_date_unique 
        UNIQUE (school_id, academic_year_id, date);
    END IF;
END $$;

-- 2. Academic Years: Prevent duplicate names per school
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'academic_years_school_name_unique'
    ) THEN
        ALTER TABLE public.academic_years ADD CONSTRAINT academic_years_school_name_unique 
        UNIQUE (school_id, name);
    END IF;
END $$;

-- 3. Academic Years: Prevent overlapping dates per school
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'academic_years_school_dates_unique'
    ) THEN
        ALTER TABLE public.academic_years ADD CONSTRAINT academic_years_school_dates_unique 
        UNIQUE (school_id, start_date, end_date);
    END IF;
END $$;

-- 4. Terms: Prevent duplicate names per academic year
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'terms_academic_year_name_unique'
    ) THEN
        ALTER TABLE public.terms ADD CONSTRAINT terms_academic_year_name_unique 
        UNIQUE (academic_year_id, name);
    END IF;
END $$;

-- 5. Terms: Prevent overlapping dates per academic year
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'terms_academic_year_dates_unique'
    ) THEN
        ALTER TABLE public.terms ADD CONSTRAINT terms_academic_year_dates_unique 
        UNIQUE (academic_year_id, start_date, end_date);
    END IF;
END $$;

-- 6. Class Offerings: Prevent duplicate course offerings per class per term
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'class_offerings_term_class_course_unique'
    ) THEN
        ALTER TABLE public.class_offerings ADD CONSTRAINT class_offerings_term_class_course_unique 
        UNIQUE (term_id, class_id, course_id);
    END IF;
END $$;

-- 7. Teaching Assignments: Prevent duplicate teacher assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teaching_assignments_class_offering_teacher_unique'
    ) THEN
        ALTER TABLE public.teaching_assignments ADD CONSTRAINT teaching_assignments_class_offering_teacher_unique 
        UNIQUE (class_offering_id, teacher_id);
    END IF;
END $$;

-- 8. Time Slots: Prevent duplicate time slots per school per day
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'time_slots_school_day_time_unique'
    ) THEN
        ALTER TABLE public.time_slots ADD CONSTRAINT time_slots_school_day_time_unique 
        UNIQUE (school_id, day_of_week, start_time, end_time);
    END IF;
END $$;

-- 9. Time Slots: Prevent duplicate period numbers per school per day
CREATE UNIQUE INDEX IF NOT EXISTS time_slots_school_day_period_unique
ON public.time_slots (school_id, day_of_week, period_number)
WHERE period_number IS NOT NULL;

-- ============================================================================
-- SECTION 3: ADD SUPPORTING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for holidays
CREATE INDEX IF NOT EXISTS idx_holidays_school_academic_year 
ON public.holidays (school_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_holidays_date 
ON public.holidays (date);

-- Indexes for academic years
CREATE INDEX IF NOT EXISTS idx_academic_years_school 
ON public.academic_years (school_id);

-- Indexes for terms
CREATE INDEX IF NOT EXISTS idx_terms_academic_year 
ON public.terms (academic_year_id);

-- Indexes for class offerings
CREATE INDEX IF NOT EXISTS idx_class_offerings_term_class 
ON public.class_offerings (term_id, class_id);

-- Indexes for teaching assignments
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_class_offering 
ON public.teaching_assignments (class_offering_id);

-- Indexes for time slots
CREATE INDEX IF NOT EXISTS idx_time_slots_school_day 
ON public.time_slots (school_id, day_of_week);

-- ============================================================================
-- SECTION 4: VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== VERIFYING UNIQUE CONSTRAINTS FOR OR-TOOLS ===';
    
    -- Check holidays constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'holidays_school_academic_year_date_unique'
    ) THEN
        RAISE NOTICE '✅ holidays_school_academic_year_date_unique: UNIQUE (school_id, academic_year_id, date) on holidays';
    ELSE
        RAISE NOTICE '❌ holidays_school_academic_year_date_unique: MISSING';
    END IF;
    
    -- Check academic years constraints
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'academic_years_school_name_unique'
    ) THEN
        RAISE NOTICE '✅ academic_years_school_name_unique: UNIQUE (school_id, name) on academic_years';
    ELSE
        RAISE NOTICE '❌ academic_years_school_name_unique: MISSING';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'academic_years_school_dates_unique'
    ) THEN
        RAISE NOTICE '✅ academic_years_school_dates_unique: UNIQUE (school_id, start_date, end_date) on academic_years';
    ELSE
        RAISE NOTICE '❌ academic_years_school_dates_unique: MISSING';
    END IF;
    
    -- Check terms constraints
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'terms_academic_year_name_unique'
    ) THEN
        RAISE NOTICE '✅ terms_academic_year_name_unique: UNIQUE (academic_year_id, name) on terms';
    ELSE
        RAISE NOTICE '❌ terms_academic_year_name_unique: MISSING';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'terms_academic_year_dates_unique'
    ) THEN
        RAISE NOTICE '✅ terms_academic_year_dates_unique: UNIQUE (academic_year_id, start_date, end_date) on terms';
    ELSE
        RAISE NOTICE '❌ terms_academic_year_dates_unique: MISSING';
    END IF;
    
    -- Check class offerings constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'class_offerings_term_class_course_unique'
    ) THEN
        RAISE NOTICE '✅ class_offerings_term_class_course_unique: UNIQUE (term_id, class_id, course_id) on class_offerings';
    ELSE
        RAISE NOTICE '❌ class_offerings_term_class_course_unique: MISSING';
    END IF;
    
    -- Check teaching assignments constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'teaching_assignments_class_offering_teacher_unique'
    ) THEN
        RAISE NOTICE '✅ teaching_assignments_class_offering_teacher_unique: UNIQUE (class_offering_id, teacher_id) on teaching_assignments';
    ELSE
        RAISE NOTICE '❌ teaching_assignments_class_offering_teacher_unique: MISSING';
    END IF;
    
    -- Check time slots constraints
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'time_slots_school_day_time_unique'
    ) THEN
        RAISE NOTICE '✅ time_slots_school_day_time_unique: UNIQUE (school_id, day_of_week, start_time, end_time) on time_slots';
    ELSE
        RAISE NOTICE '❌ time_slots_school_day_time_unique: MISSING';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'time_slots_school_day_period_unique'
    ) THEN
        RAISE NOTICE '✅ time_slots_school_day_period_unique: UNIQUE (school_id, day_of_week, period_number) on time_slots';
    ELSE
        RAISE NOTICE '❌ time_slots_school_day_period_unique: MISSING';
    END IF;
    
    RAISE NOTICE '=== OR-TOOLS CONSTRAINTS VERIFICATION COMPLETE ===';
END $$;

-- ============================================================================
-- SECTION 5: CLEANUP - REMOVE ANY TRACES OF CLASS_SECTION_ID
-- ============================================================================

-- Verify no class_section_id references exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'class_offerings' 
        AND column_name = 'class_section_id'
    ) THEN
        RAISE EXCEPTION 'class_section_id still exists in class_offerings table';
    END IF;
    
    RAISE NOTICE '✅ No traces of class_section_id found - using class_id consistently';
END $$;

COMMIT; 