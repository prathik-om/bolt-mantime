-- Migration: Add Breaks Management
-- Date: 2025-06-25
-- Description: Add breaks management for schools with duration and sequence

BEGIN;

-- Create breaks table
CREATE TABLE IF NOT EXISTS "public"."breaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_time" "time" NOT NULL,
    "end_time" "time" NOT NULL,
    "sequence" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "breaks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "breaks_time_check" CHECK ("start_time" < "end_time"),
    CONSTRAINT "breaks_sequence_positive" CHECK ("sequence" > 0)
);

-- Add foreign key constraint
ALTER TABLE "public"."breaks"
ADD CONSTRAINT "breaks_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;

-- Add unique constraint for sequence per school
ALTER TABLE "public"."breaks"
ADD CONSTRAINT "breaks_school_sequence_unique"
UNIQUE ("school_id", "sequence");

-- Add indexes for performance
CREATE INDEX "idx_breaks_school_active" ON "public"."breaks" ("school_id", "is_active");
CREATE INDEX "idx_breaks_sequence" ON "public"."breaks" ("school_id", "sequence");

-- Add comments
COMMENT ON TABLE "public"."breaks" IS 'Defines breaks (recess, lunch, etc.) for schools with sequence and timing';
COMMENT ON COLUMN "public"."breaks"."name" IS 'Name of the break (e.g., Morning Recess, Lunch Break)';
COMMENT ON COLUMN "public"."breaks"."start_time" IS 'Start time of the break';
COMMENT ON COLUMN "public"."breaks"."end_time" IS 'End time of the break';
COMMENT ON COLUMN "public"."breaks"."sequence" IS 'Order of the break in the daily schedule (1 = first break)';
COMMENT ON COLUMN "public"."breaks"."is_active" IS 'Whether this break is currently active';

-- Add RLS policies for breaks
ALTER TABLE "public"."breaks" ENABLE ROW LEVEL SECURITY;

-- Policy for viewing breaks in user's school
CREATE POLICY "Users can view breaks in their school" ON "public"."breaks"
FOR SELECT USING (
    "school_id" IN (
        SELECT "school_id" FROM "public"."profiles" 
        WHERE "id" = auth.uid()
    )
);

-- Policy for managing breaks (admin only)
CREATE POLICY "Admins can manage breaks in their school" ON "public"."breaks"
FOR ALL USING (
    "school_id" IN (
        SELECT "school_id" FROM "public"."profiles" 
        WHERE "id" = auth.uid() AND "role" = 'admin'
    )
);

-- Grant permissions
GRANT ALL ON TABLE "public"."breaks" TO "authenticated";
GRANT ALL ON TABLE "public"."breaks" TO "service_role";

-- Create function to get breaks for a school
CREATE OR REPLACE FUNCTION get_school_breaks(p_school_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    start_time TIME,
    end_time TIME,
    sequence INTEGER,
    is_active BOOLEAN,
    duration_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.start_time,
        b.end_time,
        b.sequence,
        b.is_active,
        EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60 as duration_minutes
    FROM "public"."breaks" b
    WHERE b.school_id = p_school_id
    AND b.is_active = true
    ORDER BY b.sequence;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate break timing
CREATE OR REPLACE FUNCTION validate_break_timing()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if break time overlaps with existing breaks
    IF EXISTS (
        SELECT 1 FROM "public"."breaks" b
        WHERE b.school_id = NEW.school_id
        AND b.id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND b.is_active = true
        AND (
            (NEW.start_time < b.end_time AND NEW.end_time > b.start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Break time overlaps with existing break';
    END IF;
    
    -- Check if break is within school hours
    IF EXISTS (
        SELECT 1 FROM "public"."schools" s
        WHERE s.id = NEW.school_id
        AND (
            NEW.start_time < s.start_time OR 
            NEW.end_time > s.end_time
        )
    ) THEN
        RAISE EXCEPTION 'Break time must be within school hours';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for break timing validation
CREATE TRIGGER trigger_validate_break_timing
BEFORE INSERT OR UPDATE ON "public"."breaks"
FOR EACH ROW EXECUTE FUNCTION validate_break_timing();

COMMIT; 