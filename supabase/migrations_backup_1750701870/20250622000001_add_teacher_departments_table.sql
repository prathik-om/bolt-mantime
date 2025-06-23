-- Add teacher_departments table for many-to-many relationship between teachers and departments
-- This migration creates the missing teacher_departments table

-- Create teacher_departments table
CREATE TABLE IF NOT EXISTS "public"."teacher_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "teacher_departments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teacher_departments_teacher_department_unique" UNIQUE ("teacher_id", "department_id")
);

-- Add foreign key constraints
ALTER TABLE "public"."teacher_departments" 
ADD CONSTRAINT "teacher_departments_teacher_id_fkey" 
FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE CASCADE;

ALTER TABLE "public"."teacher_departments" 
ADD CONSTRAINT "teacher_departments_department_id_fkey" 
FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_teacher_departments_teacher_id" ON "public"."teacher_departments"("teacher_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_departments_department_id" ON "public"."teacher_departments"("department_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_departments_is_primary" ON "public"."teacher_departments"("is_primary");

-- Enable RLS
ALTER TABLE "public"."teacher_departments" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view teacher departments in their school" ON "public"."teacher_departments"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "public"."profiles" p
    JOIN "public"."teachers" t ON t.id = "public"."teacher_departments"."teacher_id"
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
  )
);

CREATE POLICY "Admins can manage teacher departments in their school" ON "public"."teacher_departments"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "public"."profiles" p
    JOIN "public"."teachers" t ON t.id = "public"."teacher_departments"."teacher_id"
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
    AND p.role = 'admin'
  )
);

-- Add trigger to update updated_at column
CREATE TRIGGER "update_teacher_departments_updated_at" 
BEFORE UPDATE ON "public"."teacher_departments" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"(); 