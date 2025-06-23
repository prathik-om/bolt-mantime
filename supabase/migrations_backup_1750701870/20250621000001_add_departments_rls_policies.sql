-- Add RLS policies for departments table
-- This migration adds the missing Row Level Security policies for the departments table

-- Enable RLS on departments table if not already enabled
ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;

-- Policy for viewing departments in user's school
CREATE POLICY "Users can view departments in their school" ON "public"."departments"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "public"."profiles" p
    WHERE p.id = auth.uid() 
    AND p.school_id = "public"."departments"."school_id"
  )
);

-- Policy for admins to manage departments in their school
CREATE POLICY "Admins can manage departments in their school" ON "public"."departments"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "public"."profiles" p
    WHERE p.id = auth.uid() 
    AND p.school_id = "public"."departments"."school_id"
    AND p.role = 'admin'
  )
); 