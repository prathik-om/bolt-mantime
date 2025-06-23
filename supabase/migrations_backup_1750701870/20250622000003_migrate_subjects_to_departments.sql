-- Migration: Migrate subjects table to departments table
-- This migration moves all data from subjects to departments and updates all references

-- Step 1: Migrate data from subjects to departments
INSERT INTO departments (id, name, code, description, school_id, created_at, updated_at)
SELECT 
    id,
    name,
    NULL as code, -- subjects table doesn't have code field
    NULL as description, -- subjects table doesn't have description field
    school_id,
    NOW() as created_at, -- subjects table doesn't have created_at field
    NOW() as updated_at  -- subjects table doesn't have updated_at field
FROM subjects
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update courses table to reference departments instead of subjects
-- First, add department_id column if it doesn't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE CASCADE;

-- Update department_id based on the old subject_id
UPDATE courses 
SET department_id = subject_id 
WHERE subject_id IS NOT NULL AND department_id IS NULL;

-- Step 3: Update teacher_qualifications table to reference departments
-- First, add department_id column if it doesn't exist
ALTER TABLE teacher_qualifications ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE CASCADE;

-- Update department_id based on the old subject_id
UPDATE teacher_qualifications 
SET department_id = subject_id 
WHERE subject_id IS NOT NULL AND department_id IS NULL;

-- Step 4: Update subject_grade_mappings table to reference departments
-- First, add department_id column if it doesn't exist
ALTER TABLE subject_grade_mappings ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE CASCADE;

-- Update department_id based on the old subject_id
UPDATE subject_grade_mappings 
SET department_id = subject_id 
WHERE subject_id IS NOT NULL AND department_id IS NULL AND subject_id IN (SELECT id FROM departments);

-- Step 5: Update teacher_departments table to reference departments
-- The teacher_departments table should already reference departments correctly
-- after the previous migration, but let's ensure the data is consistent
-- No action needed here as the foreign key constraint was already fixed

-- Step 6: Drop old foreign key constraints
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_subject_id_fkey;
ALTER TABLE teacher_qualifications DROP CONSTRAINT IF EXISTS teacher_qualifications_subject_id_fkey;
ALTER TABLE subject_grade_mappings DROP CONSTRAINT IF EXISTS subject_grade_mappings_subject_id_fkey;

-- Step 7: Add new foreign key constraints (only if they don't exist)
DO $$
BEGIN
    -- Add courses department_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'courses_department_id_fkey'
    ) THEN
        ALTER TABLE courses ADD CONSTRAINT courses_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;
    END IF;

    -- Add teacher_qualifications department_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'teacher_qualifications_department_id_fkey'
    ) THEN
        ALTER TABLE teacher_qualifications ADD CONSTRAINT teacher_qualifications_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;
    END IF;

    -- Add subject_grade_mappings department_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subject_grade_mappings_department_id_fkey'
    ) THEN
        ALTER TABLE subject_grade_mappings ADD CONSTRAINT subject_grade_mappings_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 8: Drop old columns (keep them for now to avoid breaking existing code)
-- We'll drop these in a separate migration after updating the application code
-- ALTER TABLE courses DROP COLUMN IF EXISTS subject_id;
-- ALTER TABLE teacher_qualifications DROP COLUMN IF EXISTS subject_id;
-- ALTER TABLE subject_grade_mappings DROP COLUMN IF EXISTS subject_id;

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_teacher_qualifications_department_id ON teacher_qualifications(department_id);
CREATE INDEX IF NOT EXISTS idx_subject_grade_mappings_department_id ON subject_grade_mappings(department_id);

-- Step 10: Update RLS policies for departments table (if not already present)
-- Enable RLS on departments table if not already enabled
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Policy for viewing departments in user's school
DROP POLICY IF EXISTS "Users can view departments in their school" ON departments;
CREATE POLICY "Users can view departments in their school" ON departments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.school_id = departments.school_id
  )
);

-- Policy for admins to manage departments in their school
DROP POLICY IF EXISTS "Admins can manage departments in their school" ON departments;
CREATE POLICY "Admins can manage departments in their school" ON departments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.school_id = departments.school_id
    AND p.role = 'admin'
  )
); 