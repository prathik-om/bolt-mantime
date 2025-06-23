ALTER TABLE public.schools
ADD COLUMN sessions_per_day INTEGER DEFAULT 8,
ADD COLUMN working_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']; 