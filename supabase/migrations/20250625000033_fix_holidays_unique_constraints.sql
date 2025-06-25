-- Migration: Fix Holidays Unique Constraints
-- Date: 2025-06-25
-- Description: Drop incorrect unique constraints on holidays table and keep only the correct multi-school constraint

BEGIN;

-- Drop the incorrect unique constraints that would cause data integrity issues
-- in a multi-school, multi-academic-year system

-- 1. Drop UNIQUE (date) - this prevents the same date from being a holiday 
--    in more than one school or academic year (INCORRECT)
ALTER TABLE public.holidays DROP CONSTRAINT IF EXISTS holidays_date_key;

-- 2. Drop UNIQUE (school_id, date) - this prevents the same date from being 
--    a holiday in the same school for different academic years (INCORRECT)
ALTER TABLE public.holidays DROP CONSTRAINT IF EXISTS holidays_school_date_unique;

-- 3. Keep only the correct constraint: UNIQUE (school_id, academic_year_id, date)
--    This allows each school to have its own holidays per academic year

-- Verify the correct constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'holidays_school_academic_year_date_unique'
        AND conrelid = 'public.holidays'::regclass
    ) THEN
        RAISE EXCEPTION 'The correct holidays constraint is missing: holidays_school_academic_year_date_unique';
    END IF;
    
    RAISE NOTICE '✅ Correct holidays constraint verified: UNIQUE (school_id, academic_year_id, date)';
END $$;

-- Verify no incorrect constraints remain
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conrelid = 'public.holidays'::regclass 
    AND contype = 'u'
    AND conname NOT IN ('holidays_school_academic_year_date_unique');
    
    IF constraint_count > 0 THEN
        RAISE EXCEPTION 'Found % incorrect unique constraints on holidays table', constraint_count;
    END IF;
    
    RAISE NOTICE '✅ No incorrect unique constraints found on holidays table';
END $$;

COMMIT; 