-- Migration: Refine Timetable Constraints
-- Date: 2025-06-25
-- Description: Refines and enhances timetable constraints

BEGIN;

-- 1. Add additional indexes for better performance
-- =====================================================
CREATE INDEX IF NOT EXISTS "idx_scheduled_lessons_date"
ON "public"."scheduled_lessons" ("date");

CREATE INDEX IF NOT EXISTS "idx_scheduled_lessons_timeslot"
ON "public"."scheduled_lessons" ("timeslot_id");

-- 2. Add helpful comments
-- =====================================================
COMMENT ON TABLE "public"."scheduled_lessons" 
IS 'Stores individual lesson schedules with versioning support through timetable_generation_id';

COMMENT ON COLUMN "public"."scheduled_lessons"."date" 
IS 'The date when this lesson is scheduled';

COMMENT ON COLUMN "public"."scheduled_lessons"."timeslot_id" 
IS 'Reference to the time slot when this lesson occurs';

COMMENT ON COLUMN "public"."scheduled_lessons"."teaching_assignment_id" 
IS 'Reference to the teaching assignment this lesson belongs to';

COMMIT; 