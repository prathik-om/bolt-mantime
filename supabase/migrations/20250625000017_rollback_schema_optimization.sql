-- Rollback Migration: Schema Optimization for AI Scheduling
-- Date: 2025-06-25
-- Description: Rollback for schema optimization changes
-- Use this if you need to undo the previous migration

-- Start transaction
BEGIN;

-- 1. REMOVE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_generation_progress ON "public"."scheduled_lessons";
DROP FUNCTION IF EXISTS trigger_update_generation_progress();

-- 2. REMOVE RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view scheduled lessons in their school" ON "public"."scheduled_lessons";
DROP POLICY IF EXISTS "Admins can manage scheduled lessons in their school" ON "public"."scheduled_lessons";

-- 3. REMOVE FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS get_teacher_scheduled_times(UUID, DATE);
DROP FUNCTION IF EXISTS get_teacher_constraints(UUID);
DROP FUNCTION IF EXISTS get_term_offerings(UUID);
DROP FUNCTION IF EXISTS get_offering_scheduled_count(UUID);
DROP FUNCTION IF EXISTS check_teacher_conflict(UUID, DATE, UUID);
DROP FUNCTION IF EXISTS validate_scheduled_lesson(UUID, DATE, UUID);
DROP FUNCTION IF EXISTS update_generation_progress(UUID);
DROP FUNCTION IF EXISTS get_schedule_for_dates(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS get_teacher_workload(UUID, DATE, DATE);

-- 4. REMOVE INDEXES
-- =====================================================

DROP INDEX IF EXISTS "idx_scheduled_lessons_date";
DROP INDEX IF EXISTS "idx_scheduled_lessons_timeslot";
DROP INDEX IF EXISTS "idx_teaching_assignments_teacher";
DROP INDEX IF EXISTS "idx_class_offerings_term";
DROP INDEX IF EXISTS "idx_time_slots_school";
DROP INDEX IF EXISTS "idx_teacher_timeslot_unique";

-- 5. REMOVE FOREIGN KEY CONSTRAINTS
-- =====================================================

ALTER TABLE "public"."scheduled_lessons" 
DROP CONSTRAINT IF EXISTS "scheduled_lessons_timeslot_id_fkey";

ALTER TABLE "public"."scheduled_lessons" 
DROP CONSTRAINT IF EXISTS "scheduled_lessons_teaching_assignment_id_fkey";

ALTER TABLE "public"."scheduled_lessons" 
DROP CONSTRAINT IF EXISTS "scheduled_lessons_school_id_fkey";

-- 6. REMOVE ADDED COLUMNS
-- =====================================================

-- Remove progress tracking columns from timetable_generations
ALTER TABLE "public"."timetable_generations" 
DROP COLUMN IF EXISTS "scheduled_lessons";

ALTER TABLE "public"."timetable_generations" 
DROP COLUMN IF EXISTS "total_offerings";

-- Remove school_id from scheduled_lessons (only if it was added by the migration)
-- Note: This is dangerous if school_id was used elsewhere, so we'll check first
DO $$
BEGIN
    -- Only remove school_id if it was added by our migration
    -- You may want to comment this out if school_id is used elsewhere
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scheduled_lessons' 
        AND column_name = 'school_id'
    ) THEN
        -- Check if there are any references to school_id before removing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'scheduled_lessons_school_id_fkey'
        ) THEN
            ALTER TABLE "public"."scheduled_lessons" DROP COLUMN "school_id";
        END IF;
    END IF;
END $$;

-- Commit transaction
COMMIT; 