-- =====================================================
-- SIMPLIFIED SCHEMA IMPROVEMENTS - NO COMPLEX JOINS
-- =====================================================

-- 1. CRITICAL: Add missing foreign key constraints
-- =====================================================

-- Fix scheduled_lessons to properly reference time_slots
ALTER TABLE "public"."scheduled_lessons" 
ADD CONSTRAINT "scheduled_lessons_timeslot_id_fkey" 
FOREIGN KEY ("timeslot_id") REFERENCES "public"."time_slots"("id") ON DELETE CASCADE;

-- Fix scheduled_lessons to reference teaching_assignments
ALTER TABLE "public"."scheduled_lessons" 
ADD CONSTRAINT "scheduled_lessons_teaching_assignment_id_fkey" 
FOREIGN KEY ("teaching_assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE CASCADE;

-- Add school_id to scheduled_lessons for better RLS and filtering
ALTER TABLE "public"."scheduled_lessons" 
ADD COLUMN "school_id" "uuid";

-- Update existing records (if any)
UPDATE "public"."scheduled_lessons" 
SET "school_id" = (
    SELECT ta.school_id 
    FROM "public"."teaching_assignments" ta 
    WHERE ta.id = "public"."scheduled_lessons"."teaching_assignment_id"
);

-- Make school_id NOT NULL after update
ALTER TABLE "public"."scheduled_lessons" 
ALTER COLUMN "school_id" SET NOT NULL;

-- Add foreign key for school_id
ALTER TABLE "public"."scheduled_lessons" 
ADD CONSTRAINT "scheduled_lessons_school_id_fkey" 
FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;

-- 2. SIMPLE PERFORMANCE INDEXES
-- =====================================================

-- Essential indexes only - no complex combinations
CREATE INDEX IF NOT EXISTS "idx_scheduled_lessons_date" 
ON "public"."scheduled_lessons" ("date");

CREATE INDEX IF NOT EXISTS "idx_scheduled_lessons_timeslot" 
ON "public"."scheduled_lessons" ("timeslot_id");

CREATE INDEX IF NOT EXISTS "idx_teaching_assignments_teacher" 
ON "public"."teaching_assignments" ("teacher_id");

CREATE INDEX IF NOT EXISTS "idx_class_offerings_term" 
ON "public"."class_offerings" ("term_id");

CREATE INDEX IF NOT EXISTS "idx_time_slots_school" 
ON "public"."time_slots" ("school_id");

-- 3. SIMPLE DATA INTEGRITY
-- =====================================================

-- Simple constraint to prevent double-booking teachers
CREATE UNIQUE INDEX IF NOT EXISTS "idx_teacher_timeslot_unique" 
ON "public"."scheduled_lessons" ("teaching_assignment_id", "date", "timeslot_id");

-- 4. SIMPLIFIED AI SCHEDULING FUNCTIONS
-- =====================================================

-- Simple function to get teacher's scheduled times for a date
CREATE OR REPLACE FUNCTION get_teacher_scheduled_times(
    p_teacher_id UUID,
    p_date DATE
) RETURNS TABLE(
    timeslot_id UUID,
    start_time TIME,
    end_time TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.timeslot_id,
        ts.start_time,
        ts.end_time
    FROM "public"."scheduled_lessons" sl
    JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
    JOIN "public"."time_slots" ts ON sl.timeslot_id = ts.id
    WHERE ta.teacher_id = p_teacher_id
    AND sl.date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Simple function to get teacher's time constraints
CREATE OR REPLACE FUNCTION get_teacher_constraints(
    p_teacher_id UUID
) RETURNS TABLE(
    time_slot_id UUID,
    constraint_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ttc.time_slot_id,
        ttc.constraint_type
    FROM "public"."teacher_time_constraints" ttc
    WHERE ttc.teacher_id = p_teacher_id;
END;
$$ LANGUAGE plpgsql;

-- Simple function to get class offerings for a term
CREATE OR REPLACE FUNCTION get_term_offerings(
    p_term_id UUID
) RETURNS TABLE(
    offering_id UUID,
    class_section_id UUID,
    course_id UUID,
    periods_per_week INTEGER,
    teacher_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.id as offering_id,
        co.class_section_id,
        co.course_id,
        co.periods_per_week,
        ta.teacher_id
    FROM "public"."class_offerings" co
    LEFT JOIN "public"."teaching_assignments" ta ON co.id = ta.class_offering_id
    WHERE co.term_id = p_term_id;
END;
$$ LANGUAGE plpgsql;

-- Simple function to get scheduled periods count for an offering
CREATE OR REPLACE FUNCTION get_offering_scheduled_count(
    p_offering_id UUID
) RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_result
    FROM "public"."scheduled_lessons" sl
    JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
    WHERE ta.class_offering_id = p_offering_id;
    
    RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql;

-- Simple function to check for teacher conflicts
CREATE OR REPLACE FUNCTION check_teacher_conflict(
    p_teacher_id UUID,
    p_date DATE,
    p_timeslot_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    conflict_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM "public"."scheduled_lessons" sl
        JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
        WHERE ta.teacher_id = p_teacher_id
        AND sl.date = p_date
        AND sl.timeslot_id = p_timeslot_id
    ) INTO conflict_exists;
    
    RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql;

-- 5. SIMPLE VALIDATION FUNCTIONS
-- =====================================================

-- Simple function to validate a single scheduled lesson
CREATE OR REPLACE FUNCTION validate_scheduled_lesson(
    p_teaching_assignment_id UUID,
    p_date DATE,
    p_timeslot_id UUID
) RETURNS TABLE(
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    teacher_id UUID;
    teacher_name TEXT;
    class_name TEXT;
    course_name TEXT;
BEGIN
    -- Get teacher info
    SELECT ta.teacher_id, 
           CONCAT(t.first_name, ' ', t.last_name),
           c.name,
           cr.name
    INTO teacher_id, teacher_name, class_name, course_name
    FROM "public"."teaching_assignments" ta
    JOIN "public"."teachers" t ON ta.teacher_id = t.id
    JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
    JOIN "public"."classes" c ON co.class_section_id = c.id
    JOIN "public"."courses" cr ON co.course_id = cr.id
    WHERE ta.id = p_teaching_assignment_id;
    
    -- Check for teacher conflict
    IF check_teacher_conflict(teacher_id, p_date, p_timeslot_id) THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Teacher ' || teacher_name || ' is already scheduled at this time'::TEXT;
        RETURN;
    END IF;
    
    -- Check for teacher time constraint
    IF EXISTS (
        SELECT 1 FROM "public"."teacher_time_constraints" ttc
        WHERE ttc.teacher_id = teacher_id
        AND ttc.time_slot_id = p_timeslot_id
        AND ttc.constraint_type = 'unavailable'
    ) THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Teacher ' || teacher_name || ' is unavailable at this time'::TEXT;
        RETURN;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT 
        TRUE::BOOLEAN,
        'Valid'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. SIMPLE PROGRESS TRACKING
-- =====================================================

-- Add simple progress tracking to timetable generations
ALTER TABLE "public"."timetable_generations" 
ADD COLUMN "scheduled_lessons" INTEGER DEFAULT 0,
ADD COLUMN "total_offerings" INTEGER;

-- Simple function to update generation progress
CREATE OR REPLACE FUNCTION update_generation_progress(
    p_term_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE "public"."timetable_generations" tg
    SET 
        scheduled_lessons = (
            SELECT COUNT(*) 
            FROM "public"."scheduled_lessons" sl
            JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
            JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
            WHERE co.term_id = p_term_id
        ),
        total_offerings = (
            SELECT COUNT(*) 
            FROM "public"."class_offerings" 
            WHERE term_id = p_term_id
        )
    WHERE tg.term_id = p_term_id;
END;
$$ LANGUAGE plpgsql;

-- 7. SIMPLE RLS POLICIES
-- =====================================================

-- Enable RLS on scheduled_lessons
ALTER TABLE "public"."scheduled_lessons" ENABLE ROW LEVEL SECURITY;

-- Simple policy for viewing scheduled lessons
CREATE POLICY "Users can view scheduled lessons in their school" ON "public"."scheduled_lessons"
FOR SELECT USING (
    school_id IN (
        SELECT school_id FROM "public"."profiles" 
        WHERE id = auth.uid()
    )
);

-- Simple policy for managing scheduled lessons (admin only)
CREATE POLICY "Admins can manage scheduled lessons in their school" ON "public"."scheduled_lessons"
FOR ALL USING (
    school_id IN (
        SELECT school_id FROM "public"."profiles" 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 8. SIMPLE TRIGGERS
-- =====================================================

-- Simple trigger to update generation progress
CREATE OR REPLACE FUNCTION trigger_update_generation_progress() RETURNS TRIGGER AS $$
DECLARE
    term_id UUID;
BEGIN
    -- Get term_id from the teaching assignment
    SELECT co.term_id INTO term_id
    FROM "public"."teaching_assignments" ta
    JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
    WHERE ta.id = COALESCE(NEW.teaching_assignment_id, OLD.teaching_assignment_id);
    
    -- Update progress
    PERFORM update_generation_progress(term_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generation_progress
AFTER INSERT OR DELETE ON "public"."scheduled_lessons"
FOR EACH ROW EXECUTE FUNCTION trigger_update_generation_progress();

-- 9. SIMPLE API HELPER FUNCTIONS
-- =====================================================

-- Function to get basic schedule data for a date range
CREATE OR REPLACE FUNCTION get_schedule_for_dates(
    p_start_date DATE,
    p_end_date DATE,
    p_school_id UUID
) RETURNS TABLE(
    date DATE,
    timeslot_id UUID,
    teacher_name TEXT,
    class_name TEXT,
    course_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.date,
        sl.timeslot_id,
        CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
        c.name as class_name,
        cr.name as course_name
    FROM "public"."scheduled_lessons" sl
    JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
    JOIN "public"."teachers" t ON ta.teacher_id = t.id
    JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
    JOIN "public"."classes" c ON co.class_section_id = c.id
    JOIN "public"."courses" cr ON co.course_id = cr.id
    WHERE sl.date BETWEEN p_start_date AND p_end_date
    AND sl.school_id = p_school_id
    ORDER BY sl.date, sl.timeslot_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get teacher workload summary
CREATE OR REPLACE FUNCTION get_teacher_workload(
    p_teacher_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE(
    date DATE,
    periods_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.date,
        COUNT(*) as periods_count
    FROM "public"."scheduled_lessons" sl
    JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
    WHERE ta.teacher_id = p_teacher_id
    AND sl.date BETWEEN p_start_date AND p_end_date
    GROUP BY sl.date
    ORDER BY sl.date;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION get_teacher_scheduled_times IS 'Simple function to get teacher scheduled times for a date';
COMMENT ON FUNCTION get_teacher_constraints IS 'Simple function to get teacher time constraints';
COMMENT ON FUNCTION get_term_offerings IS 'Simple function to get class offerings for a term';
COMMENT ON FUNCTION get_offering_scheduled_count IS 'Simple function to get scheduled periods count for an offering';
COMMENT ON FUNCTION check_teacher_conflict IS 'Simple function to check for teacher scheduling conflicts';
COMMENT ON FUNCTION validate_scheduled_lesson IS 'Simple function to validate a single scheduled lesson';
COMMENT ON FUNCTION update_generation_progress IS 'Simple function to update timetable generation progress';
COMMENT ON FUNCTION get_schedule_for_dates IS 'Simple function to get schedule data for a date range';
COMMENT ON FUNCTION get_teacher_workload IS 'Simple function to get teacher workload summary'; 