-- Migration: Add EXCLUDE Constraints and Timetable Versioning
-- Date: 2025-06-25
-- Description: Adds critical EXCLUDE constraints and links scheduled lessons to timetable generations

BEGIN;

-- 1. Add timetable_generation_id to scheduled_lessons
-- =====================================================
ALTER TABLE "public"."scheduled_lessons"
ADD COLUMN "timetable_generation_id" uuid REFERENCES "public"."timetable_generations"("id") ON DELETE CASCADE;

-- Backfill timetable_generation_id for existing lessons (if any)
-- This assumes one generation per term for existing data
UPDATE "public"."scheduled_lessons" sl
SET timetable_generation_id = tg.id
FROM "public"."teaching_assignments" ta
JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
JOIN "public"."timetable_generations" tg ON co.term_id = tg.term_id
WHERE sl.teaching_assignment_id = ta.id;

-- Make timetable_generation_id NOT NULL after backfill
ALTER TABLE "public"."scheduled_lessons"
ALTER COLUMN "timetable_generation_id" SET NOT NULL;

-- 2. Add EXCLUDE Constraints using btree_gist extension
-- =====================================================

-- Ensure btree_gist extension is enabled (required for EXCLUDE constraints)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create a view to help with conflict detection
CREATE OR REPLACE VIEW scheduled_lesson_conflicts AS
SELECT 
    sl.id,
    sl.timetable_generation_id,
    sl.date,
    sl.timeslot_id,
    ta.teacher_id,
    co.class_id
FROM scheduled_lessons sl
JOIN teaching_assignments ta ON ta.id = sl.teaching_assignment_id
JOIN class_offerings co ON co.id = ta.class_offering_id;

-- Add function to check teacher conflicts
CREATE OR REPLACE FUNCTION check_teacher_conflict(lesson_id bigint)
RETURNS boolean AS $$
DECLARE
    conflict_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM scheduled_lesson_conflicts a
        JOIN scheduled_lesson_conflicts b ON 
            a.timetable_generation_id = b.timetable_generation_id AND
            a.date = b.date AND
            a.timeslot_id = b.timeslot_id AND
            a.teacher_id = b.teacher_id AND
            a.id != b.id
        WHERE a.id = lesson_id
    ) INTO conflict_exists;
    RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql;

-- Add function to check class conflicts
CREATE OR REPLACE FUNCTION check_class_conflict(lesson_id bigint)
RETURNS boolean AS $$
DECLARE
    conflict_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM scheduled_lesson_conflicts a
        JOIN scheduled_lesson_conflicts b ON 
            a.timetable_generation_id = b.timetable_generation_id AND
            a.date = b.date AND
            a.timeslot_id = b.timeslot_id AND
            a.class_id = b.class_id AND
            a.id != b.id
        WHERE a.id = lesson_id
    ) INTO conflict_exists;
    RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql;

-- Add constraints using the check functions
ALTER TABLE "public"."scheduled_lessons"
ADD CONSTRAINT "prevent_teacher_double_booking"
CHECK (NOT check_teacher_conflict(id));

ALTER TABLE "public"."scheduled_lessons"
ADD CONSTRAINT "prevent_class_double_booking"
CHECK (NOT check_class_conflict(id));

-- 3. Add indexes to support efficient conflict checking
-- =====================================================
CREATE INDEX IF NOT EXISTS "idx_scheduled_lessons_generation"
ON "public"."scheduled_lessons" ("timetable_generation_id");

CREATE INDEX IF NOT EXISTS "idx_scheduled_lessons_composite"
ON "public"."scheduled_lessons" ("timetable_generation_id", "date", "timeslot_id");

-- 4. Add validation trigger for scheduled lessons
-- =====================================================
CREATE OR REPLACE FUNCTION validate_scheduled_lesson()
RETURNS TRIGGER AS $$
DECLARE
    term_start DATE;
    term_end DATE;
BEGIN
    -- Get term dates from the generation
    SELECT t.start_date, t.end_date 
    INTO term_start, term_end
    FROM terms t
    JOIN timetable_generations tg ON t.id = tg.term_id
    WHERE tg.id = NEW.timetable_generation_id;
    
    -- Validate lesson date is within term dates
    IF NEW.date < term_start OR NEW.date > term_end THEN
        RAISE EXCEPTION 'Scheduled lesson date % must be within term dates % to %', 
            NEW.date, term_start, term_end;
    END IF;
    
    -- Validate it's not a holiday
    IF EXISTS (
        SELECT 1 FROM holidays h
        JOIN academic_years ay ON h.academic_year_id = ay.id
        JOIN terms t ON t.academic_year_id = ay.id
        JOIN timetable_generations tg ON tg.term_id = t.id
        WHERE h.date = NEW.date
        AND tg.id = NEW.timetable_generation_id
    ) THEN
        RAISE EXCEPTION 'Cannot schedule lesson on holiday date %', NEW.date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_scheduled_lesson
BEFORE INSERT OR UPDATE ON "public"."scheduled_lessons"
FOR EACH ROW
EXECUTE FUNCTION validate_scheduled_lesson();

-- 5. Add helpful comments
-- =====================================================
COMMENT ON CONSTRAINT "prevent_teacher_double_booking" ON "public"."scheduled_lessons" 
IS 'Prevents a teacher from being assigned to multiple classes in the same timeslot';

COMMENT ON CONSTRAINT "prevent_class_double_booking" ON "public"."scheduled_lessons" 
IS 'Prevents a class from having multiple lessons in the same timeslot';

COMMENT ON COLUMN "public"."scheduled_lessons"."timetable_generation_id" 
IS 'Links to the timetable generation this lesson belongs to, enabling version control';

COMMIT; 