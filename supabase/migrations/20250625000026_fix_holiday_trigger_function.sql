-- Migration: Fix Holiday Trigger Function
-- Date: 2025-06-25
-- Description: Update the validate_holiday_dates function to work with academic_year_id instead of term_id

BEGIN;

-- Drop the old trigger first
DROP TRIGGER IF EXISTS trigger_validate_holiday_dates ON public.holidays;

-- Update the function to work with academic_year_id instead of term_id
CREATE OR REPLACE FUNCTION validate_holiday_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if holiday date falls within the academic year
    IF NOT EXISTS (
        SELECT 1 FROM public.academic_years 
        WHERE id = NEW.academic_year_id
        AND NEW.date >= start_date 
        AND NEW.date <= end_date
    ) THEN
        RAISE EXCEPTION 'Holiday date must fall within the academic year dates';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_validate_holiday_dates
BEFORE INSERT OR UPDATE ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION validate_holiday_dates();

COMMIT; 