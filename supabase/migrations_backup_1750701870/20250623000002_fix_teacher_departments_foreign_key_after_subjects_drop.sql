-- Fix teacher_departments foreign key constraint after subjects table was dropped
-- This migration adds back the foreign key constraint that was dropped when subjects table was removed

-- Add the foreign key constraint to reference departments table (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'teacher_departments_department_id_fkey'
    ) THEN
        ALTER TABLE "public"."teacher_departments" 
        ADD CONSTRAINT "teacher_departments_department_id_fkey" 
        FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;
    END IF;
END $$; 