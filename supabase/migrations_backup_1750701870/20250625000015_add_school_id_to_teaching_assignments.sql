-- Migration: Add school_id to teaching_assignments table

-- Add school_id column to teaching_assignments table
ALTER TABLE public.teaching_assignments 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_school_id 
ON public.teaching_assignments(school_id);

-- Add comment
COMMENT ON COLUMN public.teaching_assignments.school_id IS 'References the school this assignment belongs to for easier filtering and RLS';

-- Create trigger to automatically set school_id based on teacher's school
CREATE OR REPLACE FUNCTION public.set_teaching_assignment_school_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set school_id based on teacher's school
    SELECT t.school_id INTO NEW.school_id
    FROM public.teachers t
    WHERE t.id = NEW.teacher_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_teaching_assignment_school_id ON public.teaching_assignments;
CREATE TRIGGER trigger_set_teaching_assignment_school_id
    BEFORE INSERT OR UPDATE ON public.teaching_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_teaching_assignment_school_id();

-- Update existing records to set school_id
UPDATE public.teaching_assignments 
SET school_id = t.school_id
FROM public.teachers t
WHERE teaching_assignments.teacher_id = t.id
AND teaching_assignments.school_id IS NULL;

-- Make school_id NOT NULL after updating existing records
ALTER TABLE public.teaching_assignments 
ALTER COLUMN school_id SET NOT NULL; 