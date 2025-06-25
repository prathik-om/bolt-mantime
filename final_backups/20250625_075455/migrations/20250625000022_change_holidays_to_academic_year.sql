-- Migration: Change Holidays to Link to Academic Year Instead of Term
-- Date: 2025-06-25
-- Description: Simplify holidays management by linking to academic year instead of term

BEGIN;

-- First, add the new academic_year_id column
ALTER TABLE "public"."holidays" 
ADD COLUMN "academic_year_id" "uuid";

-- Add the new school_id column
ALTER TABLE "public"."holidays"
ADD COLUMN "school_id" "uuid";

-- Update existing holidays to link to academic year through terms
UPDATE "public"."holidays" 
SET "academic_year_id" = (
    SELECT "academic_year_id" 
    FROM "public"."terms" 
    WHERE "terms"."id" = "holidays"."term_id"
);

-- Populate school_id from academic_years
UPDATE "public"."holidays"
SET "school_id" = (
    SELECT "school_id"
    FROM "public"."academic_years"
    WHERE "academic_years"."id" = "holidays"."academic_year_id"
);

-- Make academic_year_id and school_id NOT NULL after populating them
ALTER TABLE "public"."holidays" 
ALTER COLUMN "academic_year_id" SET NOT NULL;
ALTER TABLE "public"."holidays" 
ALTER COLUMN "school_id" SET NOT NULL;

-- Add foreign key constraint for academic_year_id
ALTER TABLE "public"."holidays"
ADD CONSTRAINT "holidays_academic_year_id_fkey"
FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE CASCADE;

-- Add foreign key constraint for school_id
ALTER TABLE "public"."holidays"
ADD CONSTRAINT "holidays_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX "idx_holidays_academic_year" ON "public"."holidays" ("academic_year_id");
CREATE INDEX "idx_holidays_school" ON "public"."holidays" ("school_id");

-- Drop the old RLS policies that depend on term_id
DROP POLICY IF EXISTS "Users can view holidays for their school" ON "public"."holidays";
DROP POLICY IF EXISTS "Users can create holidays for their school" ON "public"."holidays";
DROP POLICY IF EXISTS "Users can update holidays for their school" ON "public"."holidays";
DROP POLICY IF EXISTS "Users can delete holidays for their school" ON "public"."holidays";

-- Drop the old term_id column
ALTER TABLE "public"."holidays" 
DROP COLUMN "term_id";

-- Drop the old foreign key constraint (if it exists)
ALTER TABLE "public"."holidays" 
DROP CONSTRAINT IF EXISTS "holidays_term_id_fkey";

-- Update comments
COMMENT ON COLUMN "public"."holidays"."academic_year_id" IS 'References the academic year this holiday belongs to';
COMMENT ON COLUMN "public"."holidays"."school_id" IS 'References the school this holiday belongs to';

-- Update the set_holiday_school_id function to work with academic_year_id
CREATE OR REPLACE FUNCTION "public"."set_holiday_school_id"()
RETURNS "trigger" AS $$
BEGIN
    -- Set school_id based on academic_year_id
    NEW.school_id = (
        SELECT "school_id" 
        FROM "public"."academic_years" 
        WHERE "id" = NEW.academic_year_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate RLS policies for the new structure
CREATE POLICY "Users can view holidays for their school" ON "public"."holidays"
FOR SELECT USING (
    "school_id" IN (
        SELECT "school_id" FROM "public"."profiles" 
        WHERE "id" = auth.uid()
    )
);

CREATE POLICY "Users can create holidays for their school" ON "public"."holidays"
FOR INSERT WITH CHECK (
    "school_id" IN (
        SELECT "school_id" FROM "public"."profiles" 
        WHERE "id" = auth.uid() AND "role" = 'admin'
    )
);

CREATE POLICY "Users can update holidays for their school" ON "public"."holidays"
FOR UPDATE USING (
    "school_id" IN (
        SELECT "school_id" FROM "public"."profiles" 
        WHERE "id" = auth.uid() AND "role" = 'admin'
    )
);

CREATE POLICY "Users can delete holidays for their school" ON "public"."holidays"
FOR DELETE USING (
    "school_id" IN (
        SELECT "school_id" FROM "public"."profiles" 
        WHERE "id" = auth.uid() AND "role" = 'admin'
    )
);

COMMIT; 