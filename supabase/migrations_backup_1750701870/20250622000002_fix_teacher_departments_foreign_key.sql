-- Fix teacher_departments foreign key to reference departments table
-- This aligns with our new department-based system

-- First, clean up any invalid references in teacher_departments
DELETE FROM teacher_departments 
WHERE department_id NOT IN (SELECT id FROM departments);

-- Drop the existing foreign key constraint
ALTER TABLE "public"."teacher_departments" 
DROP CONSTRAINT IF EXISTS "teacher_departments_department_id_fkey";

-- Add the correct foreign key constraint to reference departments table
ALTER TABLE "public"."teacher_departments" 
ADD CONSTRAINT "teacher_departments_department_id_fkey" 
FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE; 