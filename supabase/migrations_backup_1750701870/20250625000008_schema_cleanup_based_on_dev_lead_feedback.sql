-- Migration: Schema cleanup based on dev lead feedback

-- 1. Drop redundant 'classes' table if it exists
DROP TABLE IF EXISTS public.classes CASCADE;

-- 2. Drop both teacher_qualifications and teacher_departments
-- Note: teacher_qualifications referenced subjects which were dropped
-- teacher_departments can be recreated if needed for organizational structure
DROP TABLE IF EXISTS public.teacher_qualifications CASCADE;
DROP TABLE IF EXISTS public.teacher_departments CASCADE;

-- 3. Drop both teacher_availability and teacher_constraints, create a single teacher_time_constraints table
DROP TABLE IF EXISTS public.teacher_availability CASCADE;
DROP TABLE IF EXISTS public.teacher_constraints CASCADE;

CREATE TABLE IF NOT EXISTS public.teacher_time_constraints (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    time_slot_id uuid NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
    constraint_type text NOT NULL CHECK (constraint_type IN ('unavailable', 'preferred', 'avoid')),
    reason text,
    priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(teacher_id, time_slot_id)
);
COMMENT ON TABLE public.teacher_time_constraints IS 'Defines time-based constraints for teachers (unavailable, preferred, avoid, etc).';

-- 4. Remove ai_assigned_teacher_id and manual_assigned_teacher_id from class_offerings
ALTER TABLE public.class_offerings DROP COLUMN IF EXISTS ai_assigned_teacher_id;
ALTER TABLE public.class_offerings DROP COLUMN IF EXISTS manual_assigned_teacher_id;
ALTER TABLE public.class_offerings DROP COLUMN IF EXISTS assignment_notes;
ALTER TABLE public.class_offerings DROP COLUMN IF EXISTS assignment_date;

-- 5. Ensure all curriculum logic is in class_offerings, not subject_grade_mappings
-- (No action needed if subject_grade_mappings is only for generic mapping, not delivery)
-- Add comment to clarify
COMMENT ON TABLE public.subject_grade_mappings IS 'Maps subjects to grades for curriculum planning only. Actual delivery is defined in class_offerings.';

-- 6. Ensure teaching_assignments is the only place for teacher assignments
CREATE TABLE IF NOT EXISTS public.teaching_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    class_offering_id uuid NOT NULL REFERENCES public.class_offerings(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    assignment_type text DEFAULT 'manual' CHECK (assignment_type IN ('manual', 'ai')),
    assigned_at timestamp with time zone DEFAULT now(),
    UNIQUE(class_offering_id, teacher_id)
);
COMMENT ON TABLE public.teaching_assignments IS 'Links teachers to class offerings. Assignment_type can be manual or ai.';

-- 7. Add comments to clarify the new structure
COMMENT ON TABLE public.class_offerings IS 'Single source of truth for curriculum delivery: which courses are taught to which class sections during which terms.';
COMMENT ON TABLE public.teaching_assignments IS 'Links teachers to class offerings. Assignment_type can be manual or ai.'; 