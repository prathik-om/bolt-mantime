-- Add school-wide constraint columns to schools table
ALTER TABLE public.schools
ADD COLUMN max_lessons_per_day integer DEFAULT 8,
ADD COLUMN min_lessons_per_day integer DEFAULT 1,
ADD COLUMN max_consecutive_lessons integer DEFAULT 2,
ADD COLUMN break_required boolean DEFAULT true;

-- Add constraints
ALTER TABLE public.schools
ADD CONSTRAINT schools_max_lessons_check CHECK (max_lessons_per_day >= 1),
ADD CONSTRAINT schools_min_lessons_check CHECK (min_lessons_per_day >= 0),
ADD CONSTRAINT schools_max_consecutive_check CHECK (max_consecutive_lessons >= 1),
ADD CONSTRAINT schools_lessons_range_check CHECK (max_lessons_per_day >= min_lessons_per_day);

-- Add comments
COMMENT ON COLUMN public.schools.max_lessons_per_day IS 'Maximum number of lessons allowed per day';
COMMENT ON COLUMN public.schools.min_lessons_per_day IS 'Minimum number of lessons required per day';
COMMENT ON COLUMN public.schools.max_consecutive_lessons IS 'Maximum number of consecutive lessons allowed';
COMMENT ON COLUMN public.schools.break_required IS 'Whether a break is required between sessions'; 