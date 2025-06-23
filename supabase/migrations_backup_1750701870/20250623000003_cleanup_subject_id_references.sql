-- Cleanup migration: Remove all remaining subject_id references
-- This completes the migration from subjects to departments

-- Step 1: Drop unique constraints that reference subject_id
ALTER TABLE subject_grade_mappings DROP CONSTRAINT IF EXISTS subject_grade_mappings_subject_grade_unique;
ALTER TABLE teacher_qualifications DROP CONSTRAINT IF EXISTS teacher_qualifications_teacher_id_subject_id_key;

-- Step 2: Handle duplicate entries in subject_grade_mappings before creating unique constraint
-- Remove duplicates keeping only the first occurrence of each department_id + grade_level combination
DELETE FROM subject_grade_mappings 
WHERE id NOT IN (
  SELECT DISTINCT ON (department_id, grade_level) id
  FROM subject_grade_mappings 
  ORDER BY department_id, grade_level, id
);

-- Step 3: Ensure all rows have department_id values before creating constraints
UPDATE subject_grade_mappings 
SET department_id = (SELECT id FROM departments LIMIT 1) 
WHERE department_id IS NULL;

-- Step 4: Create new unique constraints using department_id
ALTER TABLE subject_grade_mappings 
ADD CONSTRAINT subject_grade_mappings_department_grade_unique 
UNIQUE (department_id, grade_level);

ALTER TABLE teacher_qualifications 
ADD CONSTRAINT teacher_qualifications_teacher_id_department_id_key 
UNIQUE (teacher_id, department_id);

-- Step 5: Drop the subject_id columns from all tables
ALTER TABLE courses DROP COLUMN IF EXISTS subject_id;
ALTER TABLE teacher_qualifications DROP COLUMN IF EXISTS subject_id;
ALTER TABLE subject_grade_mappings DROP COLUMN IF EXISTS subject_id;

-- Step 6: Make department_id NOT NULL where it should be required
-- First, ensure all rows have department_id values
UPDATE courses SET department_id = (SELECT id FROM departments WHERE departments.school_id = courses.school_id LIMIT 1) 
WHERE department_id IS NULL;

UPDATE teacher_qualifications SET department_id = (SELECT id FROM departments WHERE departments.school_id = (SELECT school_id FROM teachers WHERE teachers.id = teacher_qualifications.teacher_id) LIMIT 1) 
WHERE department_id IS NULL;

-- Now make the columns NOT NULL
ALTER TABLE courses ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE teacher_qualifications ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE subject_grade_mappings ALTER COLUMN department_id SET NOT NULL;

-- Step 7: Drop old indexes that reference subject_id
DROP INDEX IF EXISTS idx_subject_grade_mappings_subject;

-- Step 8: Create new indexes for department_id
CREATE INDEX IF NOT EXISTS idx_subject_grade_mappings_department ON subject_grade_mappings(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_teacher_qualifications_department_id ON teacher_qualifications(department_id); 