-- Add teacher_departments table for mapping teachers to departments
-- This allows teachers to be assigned to departments and automatically qualify for all courses in that department

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_teacher_departments_teacher_id" ON "public"."teacher_departments"("teacher_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_departments_department_id" ON "public"."teacher_departments"("department_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_departments_is_primary" ON "public"."teacher_departments"("is_primary");

-- Enable RLS
ALTER TABLE "public"."teacher_departments" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view teacher departments in their school" ON "public"."teacher_departments"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "public"."teachers" t
        JOIN "public"."departments" d ON d.id = "public"."teacher_departments"."department_id"
        WHERE t.id = "public"."teacher_departments"."teacher_id"
        AND t.school_id = d.school_id
        AND d.school_id IN (
            SELECT school_id FROM "public"."profiles" WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Admins can manage teacher departments in their school" ON "public"."teacher_departments"
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM "public"."teachers" t
        JOIN "public"."departments" d ON d.id = "public"."teacher_departments"."department_id"
        WHERE t.id = "public"."teacher_departments"."teacher_id"
        AND t.school_id = d.school_id
        AND d.school_id IN (
            SELECT school_id FROM "public"."profiles" WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- Create trigger for updated_at
CREATE TRIGGER "update_teacher_departments_updated_at"
BEFORE UPDATE ON "public"."teacher_departments"
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Add comments
COMMENT ON TABLE "public"."teacher_departments" IS 'Maps teachers to departments. Teachers can be assigned to multiple departments, with one marked as primary.';
COMMENT ON COLUMN "public"."teacher_departments"."teacher_id" IS 'References the teacher';
COMMENT ON COLUMN "public"."teacher_departments"."department_id" IS 'References the department';
COMMENT ON COLUMN "public"."teacher_departments"."is_primary" IS 'Indicates if this is the teacher''s primary department'; 