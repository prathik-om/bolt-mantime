-- Migration: Address Dev Lead Concerns
-- Date: 2025-06-25
-- Description: Comprehensive fixes for foreign keys, data consistency, business logic, and performance

BEGIN;

-- 1. ADD MISSING FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key constraint for scheduled_lessons.teaching_assignment_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'scheduled_lessons_teaching_assignment_id_fkey'
    ) THEN
        ALTER TABLE "public"."scheduled_lessons"
        ADD CONSTRAINT "scheduled_lessons_teaching_assignment_id_fkey"
        FOREIGN KEY ("teaching_assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for scheduled_lessons.timeslot_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'scheduled_lessons_timeslot_id_fkey'
    ) THEN
        ALTER TABLE "public"."scheduled_lessons"
        ADD CONSTRAINT "scheduled_lessons_timeslot_id_fkey"
        FOREIGN KEY ("timeslot_id") REFERENCES "public"."time_slots"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 2. ADDRESS DATA CONSISTENCY ISSUES
-- =====================================================

-- Note: Converting bigint ID to UUID would require careful migration strategy
-- For now, we'll keep the bigint ID but add a comment about future consideration
COMMENT ON COLUMN "public"."scheduled_lessons"."id" IS 'Consider migrating to UUID for consistency with other tables';

-- 3. ADD BUSINESS LOGIC CONSTRAINTS
-- =====================================================

-- Add check constraint for time_slots start_time < end_time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'time_slots_time_check'
    ) THEN
        ALTER TABLE "public"."time_slots"
        ADD CONSTRAINT "time_slots_time_check"
        CHECK ("start_time" < "end_time");
    END IF;
END $$;

-- Add check constraint for terms start_date < end_date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'terms_date_check'
    ) THEN
        ALTER TABLE "public"."terms"
        ADD CONSTRAINT "terms_date_check"
        CHECK ("start_date" < "end_date");
    END IF;
END $$;

-- Add check constraint for academic_years start_date < end_date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'academic_years_date_check'
    ) THEN
        ALTER TABLE "public"."academic_years"
        ADD CONSTRAINT "academic_years_date_check"
        CHECK ("start_date" < "end_date");
    END IF;
END $$;

-- Add check constraint for periods_per_week > 0
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'class_offerings_periods_check'
    ) THEN
        ALTER TABLE "public"."class_offerings"
        ADD CONSTRAINT "class_offerings_periods_check"
        CHECK ("periods_per_week" > 0);
    END IF;
END $$;

-- 4. PREVENT OVERLAPPING TIME SLOTS
-- =====================================================

-- Create function to check for overlapping time slots
CREATE OR REPLACE FUNCTION check_time_slot_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for overlapping time slots on the same day for the same school
    IF EXISTS (
        SELECT 1 FROM "public"."time_slots" ts
        WHERE ts.school_id = NEW.school_id
        AND ts.day_of_week = NEW.day_of_week
        AND ts.id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (NEW.start_time < ts.end_time AND NEW.end_time > ts.start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Time slot overlaps with existing slot on day %', NEW.day_of_week;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for time slot overlap prevention
DROP TRIGGER IF EXISTS trigger_check_time_slot_overlap ON "public"."time_slots";
CREATE TRIGGER trigger_check_time_slot_overlap
BEFORE INSERT OR UPDATE ON "public"."time_slots"
FOR EACH ROW EXECUTE FUNCTION check_time_slot_overlap();

-- 5. VALIDATE PERIODS_PER_WEEK AGAINST AVAILABLE TIME SLOTS
-- =====================================================

-- Create function to validate periods_per_week
CREATE OR REPLACE FUNCTION validate_periods_per_week()
RETURNS TRIGGER AS $$
DECLARE
    available_slots INTEGER;
    working_days TEXT[];
BEGIN
    -- Get working days for the school
    SELECT s.working_days INTO working_days
    FROM "public"."schools" s
    JOIN "public"."terms" t ON t.academic_year_id IN (
        SELECT ay.id FROM "public"."academic_years" ay WHERE ay.school_id = s.id
    )
    JOIN "public"."class_offerings" co ON co.term_id = t.id
    WHERE co.id = NEW.class_offering_id;
    
    -- Count available teaching time slots per week
    SELECT COUNT(*) INTO available_slots
    FROM "public"."time_slots" ts
    JOIN "public"."schools" s ON ts.school_id = s.id
    JOIN "public"."terms" t ON t.academic_year_id IN (
        SELECT ay.id FROM "public"."academic_years" ay WHERE ay.school_id = s.id
    )
    JOIN "public"."class_offerings" co ON co.term_id = t.id
    WHERE co.id = NEW.class_offering_id
    AND ts.is_teaching_period = true
    AND ts.day_of_week = ANY(
        ARRAY(
            SELECT CASE day
                WHEN 'monday' THEN 1
                WHEN 'tuesday' THEN 2
                WHEN 'wednesday' THEN 3
                WHEN 'thursday' THEN 4
                WHEN 'friday' THEN 5
                WHEN 'saturday' THEN 6
                WHEN 'sunday' THEN 7
            END
            FROM unnest(working_days) AS day
        )
    );
    
    -- Validate periods_per_week doesn't exceed available slots
    IF NEW.periods_per_week > available_slots THEN
        RAISE EXCEPTION 'periods_per_week (%) exceeds available teaching slots per week (%)', 
                       NEW.periods_per_week, available_slots;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for periods_per_week validation
DROP TRIGGER IF EXISTS trigger_validate_periods_per_week ON "public"."class_offerings";
CREATE TRIGGER trigger_validate_periods_per_week
BEFORE INSERT OR UPDATE ON "public"."class_offerings"
FOR EACH ROW EXECUTE FUNCTION validate_periods_per_week();

-- 6. ADD PERFORMANCE INDEXES
-- =====================================================

-- Composite index for classes (school_id, grade_level)
CREATE INDEX IF NOT EXISTS "idx_classes_school_grade" 
ON "public"."classes" ("school_id", "grade_level");

-- Composite index for teacher_time_constraints (teacher_id, constraint_type)
CREATE INDEX IF NOT EXISTS "idx_teacher_constraints_type" 
ON "public"."teacher_time_constraints" ("teacher_id", "constraint_type");

-- Composite index for scheduled_lessons (teaching_assignment_id, date)
CREATE INDEX IF NOT EXISTS "idx_scheduled_lessons_teaching_assignment_date" 
ON "public"."scheduled_lessons" ("teaching_assignment_id", "date");

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS "idx_time_slots_school_day" 
ON "public"."time_slots" ("school_id", "day_of_week");

CREATE INDEX IF NOT EXISTS "idx_teaching_assignments_teacher_school" 
ON "public"."teaching_assignments" ("teacher_id", "school_id");

-- 7. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE "public"."scheduled_lessons" IS 'Scheduled lessons with comprehensive validation';
COMMENT ON COLUMN "public"."scheduled_lessons"."id" IS 'Bigint ID - consider migration to UUID for consistency';
COMMENT ON CONSTRAINT "time_slots_time_check" ON "public"."time_slots" IS 'Ensures start_time is before end_time';
COMMENT ON CONSTRAINT "terms_date_check" ON "public"."terms" IS 'Ensures start_date is before end_date';
COMMENT ON CONSTRAINT "academic_years_date_check" ON "public"."academic_years" IS 'Ensures start_date is before end_date';
COMMENT ON CONSTRAINT "class_offerings_periods_check" ON "public"."class_offerings" IS 'Ensures periods_per_week is positive';

COMMIT; 