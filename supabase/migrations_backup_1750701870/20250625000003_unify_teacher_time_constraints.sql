-- Migration: Unify teacher_availability and teacher_constraints into teacher_time_constraints

-- 1. Create the new unified table
CREATE TABLE IF NOT EXISTS public.teacher_time_constraints (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    time_slot_id uuid NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
    constraint_type text NOT NULL CHECK (constraint_type IN ('unavailable', 'prefers', 'avoid')),
    reason text,
    priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT teacher_time_constraints_unique UNIQUE (teacher_id, time_slot_id, constraint_type)
);

COMMENT ON TABLE public.teacher_time_constraints IS 'Unified table for all teacher time slot constraints, both hard (unavailable) and soft (prefers/avoid).';
COMMENT ON COLUMN public.teacher_time_constraints.constraint_type IS 'unavailable = hard rule, prefers/avoid = soft preferences.';

-- 2. Migrate data from teacher_availability
INSERT INTO public.teacher_time_constraints (teacher_id, time_slot_id, constraint_type, reason, created_at)
SELECT teacher_id, timeslot_id, 
    CASE availability_type 
        WHEN 'unavailable' THEN 'unavailable' 
        WHEN 'preferred' THEN 'prefers' 
        ELSE 'prefers' 
    END,
    NULL, now()
FROM public.teacher_availability;

-- 3. Migrate data from teacher_constraints
INSERT INTO public.teacher_time_constraints (teacher_id, time_slot_id, constraint_type, reason, priority, created_at)
SELECT teacher_id, time_slot_id, 
    CASE constraint_type 
        WHEN 'unavailable' THEN 'unavailable' 
        WHEN 'preferred' THEN 'prefers' 
        WHEN 'avoid' THEN 'avoid' 
        ELSE 'prefers' 
    END,
    reason, priority, created_at
FROM public.teacher_constraints;

-- 4. Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_teacher_time_constraints_teacher ON public.teacher_time_constraints(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_time_constraints_time_slot ON public.teacher_time_constraints(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_teacher_time_constraints_type ON public.teacher_time_constraints(constraint_type);

-- 5. Drop old tables
DROP TABLE IF EXISTS public.teacher_availability CASCADE;
DROP TABLE IF EXISTS public.teacher_constraints CASCADE; 