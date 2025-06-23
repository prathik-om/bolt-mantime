-- Migration: Rename class_section_id to class_id for consistency
-- This migration renames the column to match the table name (classes) and removes confusion

-- 1. Drop existing constraints and indexes
ALTER TABLE public.class_offerings 
DROP CONSTRAINT IF EXISTS class_offerings_class_id_fkey;

ALTER TABLE public.class_offerings 
DROP CONSTRAINT IF EXISTS class_offerings_term_id_class_section_id_course_id_key;

DROP INDEX IF EXISTS idx_class_offerings_class_term;

-- 2. Rename the column
ALTER TABLE public.class_offerings 
RENAME COLUMN class_section_id TO class_id;

-- 3. Recreate constraints with new column name
-- ALTER TABLE public.class_offerings 
-- ADD CONSTRAINT class_offerings_class_id_fkey 
-- FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

ALTER TABLE public.class_offerings 
ADD CONSTRAINT class_offerings_term_id_class_id_course_id_key 
UNIQUE (term_id, class_id, course_id);

-- 4. Recreate index with new column name
CREATE INDEX idx_class_offerings_class_term ON public.class_offerings (class_id, term_id);

-- 5. Update column comment
COMMENT ON COLUMN public.class_offerings.class_id IS 
'References the class (e.g., Grade 9-A) that will take this course.
This column links to the classes table.'; 