-- =====================================================
-- SCHEMA IMPROVEMENTS FOR AI SCHEDULING OPTIMIZATION
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

-- 2. OPTIMIZE FOR AI SCHEDULING
-- =====================================================

-- Add indexes for AI scheduling queries
CREATE INDEX IF NOT EXISTS "idx_scheduled_lessons_date_timeslot" 
ON "public"."scheduled_lessons" ("date", "timeslot_id");

CREATE INDEX IF NOT EXISTS "idx_scheduled_lessons_teacher_date" 
ON "public"."scheduled_lessons" ("teaching_assignment_id", "date");

CREATE INDEX IF NOT EXISTS "idx_time_slots_school_day" 
ON "public"."time_slots" ("school_id", "day_of_week", "start_time");

CREATE INDEX IF NOT EXISTS "idx_teaching_assignments_teacher" 
ON "public"."teaching_assignments" ("teacher_id", "school_id");

CREATE INDEX IF NOT EXISTS "idx_class_offerings_term_class" 
ON "public"."class_offerings" ("term_id", "class_section_id");

-- 3. ENHANCE DATA INTEGRITY
-- =====================================================

-- Add constraint to ensure scheduled lessons are within term dates
ALTER TABLE "public"."scheduled_lessons" 
ADD CONSTRAINT "scheduled_lessons_date_within_term" 
CHECK (
    EXISTS (
        SELECT 1 FROM "public"."teaching_assignments" ta
        JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
        JOIN "public"."terms" t ON co.term_id = t.id
        WHERE ta.id = "public"."scheduled_lessons"."teaching_assignment_id"
        AND "public"."scheduled_lessons"."date" BETWEEN t.start_date AND t.end_date
    )
);

-- Add constraint to prevent double-booking teachers
CREATE UNIQUE INDEX IF NOT EXISTS "idx_teacher_timeslot_unique" 
ON "public"."scheduled_lessons" ("teaching_assignment_id", "date", "timeslot_id");

-- 4. ADD AI SCHEDULING HELPER FUNCTIONS
-- =====================================================

-- Function to get available time slots for a teacher on a specific date
CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_teacher_id UUID,
    p_date DATE,
    p_school_id UUID
) RETURNS TABLE(
    time_slot_id UUID,
    day_of_week INTEGER,
    start_time TIME,
    end_time TIME,
    period_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.day_of_week,
        ts.start_time,
        ts.end_time,
        ts.period_number
    FROM "public"."time_slots" ts
    WHERE ts.school_id = p_school_id
    AND ts.day_of_week = EXTRACT(DOW FROM p_date)
    AND ts.is_teaching_period = true
    AND NOT EXISTS (
        -- Check if teacher is already scheduled at this time
        SELECT 1 FROM "public"."scheduled_lessons" sl
        JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
        WHERE ta.teacher_id = p_teacher_id
        AND sl.date = p_date
        AND sl.timeslot_id = ts.id
    )
    AND NOT EXISTS (
        -- Check teacher time constraints
        SELECT 1 FROM "public"."teacher_time_constraints" ttc
        WHERE ttc.teacher_id = p_teacher_id
        AND ttc.time_slot_id = ts.id
        AND ttc.constraint_type = 'unavailable'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get curriculum requirements for AI scheduling
CREATE OR REPLACE FUNCTION get_curriculum_requirements(
    p_term_id UUID,
    p_school_id UUID
) RETURNS TABLE(
    class_section_id UUID,
    class_name TEXT,
    course_id UUID,
    course_name TEXT,
    department_id UUID,
    department_name TEXT,
    periods_per_week INTEGER,
    required_hours_per_term INTEGER,
    assigned_teacher_id UUID,
    teacher_name TEXT,
    scheduled_periods INTEGER,
    remaining_periods INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.class_section_id,
        c.name as class_name,
        co.course_id,
        cr.name as course_name,
        cr.department_id,
        d.name as department_name,
        co.periods_per_week,
        co.required_hours_per_term,
        ta.teacher_id as assigned_teacher_id,
        CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
        COALESCE(scheduled.scheduled_count, 0) as scheduled_periods,
        (co.periods_per_week - COALESCE(scheduled.scheduled_count, 0)) as remaining_periods
    FROM "public"."class_offerings" co
    JOIN "public"."classes" c ON co.class_section_id = c.id
    JOIN "public"."courses" cr ON co.course_id = cr.id
    JOIN "public"."departments" d ON cr.department_id = d.id
    LEFT JOIN "public"."teaching_assignments" ta ON co.id = ta.class_offering_id
    LEFT JOIN "public"."teachers" t ON ta.teacher_id = t.id
    LEFT JOIN (
        SELECT 
            ta.class_offering_id,
            COUNT(*) as scheduled_count
        FROM "public"."scheduled_lessons" sl
        JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
        JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
        WHERE co.term_id = p_term_id
        GROUP BY ta.class_offering_id
    ) scheduled ON co.id = scheduled.class_offering_id
    WHERE co.term_id = p_term_id
    AND c.school_id = p_school_id
    ORDER BY c.grade_level, c.name, cr.name;
END;
$$ LANGUAGE plpgsql;

-- Function to validate AI-generated schedule
CREATE OR REPLACE FUNCTION validate_schedule(
    p_term_id UUID,
    p_school_id UUID
) RETURNS TABLE(
    validation_type TEXT,
    message TEXT,
    severity TEXT,
    affected_entity TEXT
) AS $$
BEGIN
    -- Check for teacher double-booking
    RETURN QUERY
    SELECT 
        'teacher_conflict'::TEXT,
        'Teacher ' || CONCAT(t.first_name, ' ', t.last_name) || ' is double-booked on ' || sl.date::TEXT || ' at ' || ts.start_time::TEXT,
        'error'::TEXT,
        'teacher'::TEXT
    FROM "public"."scheduled_lessons" sl1
    JOIN "public"."scheduled_lessons" sl2 ON sl1.date = sl2.date AND sl1.timeslot_id = sl2.timeslot_id AND sl1.id != sl2.id
    JOIN "public"."teaching_assignments" ta1 ON sl1.teaching_assignment_id = ta1.id
    JOIN "public"."teaching_assignments" ta2 ON sl2.teaching_assignment_id = ta2.id
    JOIN "public"."teachers" t ON ta1.teacher_id = t.id
    JOIN "public"."time_slots" ts ON sl1.timeslot_id = ts.id
    JOIN "public"."class_offerings" co ON ta1.class_offering_id = co.id
    WHERE co.term_id = p_term_id
    AND ta1.teacher_id = ta2.teacher_id
    AND t.school_id = p_school_id;

    -- Check for curriculum coverage
    RETURN QUERY
    SELECT 
        'curriculum_gap'::TEXT,
        'Class ' || c.name || ' - ' || cr.name || ' has only ' || COALESCE(scheduled.scheduled_count, 0) || ' periods scheduled out of ' || co.periods_per_week || ' required',
        'warning'::TEXT,
        'curriculum'::TEXT
    FROM "public"."class_offerings" co
    JOIN "public"."classes" c ON co.class_section_id = c.id
    JOIN "public"."courses" cr ON co.course_id = cr.id
    LEFT JOIN (
        SELECT 
            ta.class_offering_id,
            COUNT(*) as scheduled_count
        FROM "public"."scheduled_lessons" sl
        JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
        JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
        WHERE co.term_id = p_term_id
        GROUP BY ta.class_offering_id
    ) scheduled ON co.id = scheduled.class_offering_id
    WHERE co.term_id = p_term_id
    AND c.school_id = p_school_id
    AND COALESCE(scheduled.scheduled_count, 0) < co.periods_per_week;
END;
$$ LANGUAGE plpgsql;

-- 5. ADD PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Materialized view for frequently accessed schedule data
CREATE MATERIALIZED VIEW IF NOT EXISTS schedule_summary AS
SELECT 
    sl.date,
    sl.timeslot_id,
    ts.day_of_week,
    ts.start_time,
    ts.end_time,
    ts.period_number,
    ta.teacher_id,
    CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
    co.class_section_id,
    c.name as class_name,
    co.course_id,
    cr.name as course_name,
    cr.department_id,
    d.name as department_name,
    sl.school_id
FROM "public"."scheduled_lessons" sl
JOIN "public"."time_slots" ts ON sl.timeslot_id = ts.id
JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
JOIN "public"."teachers" t ON ta.teacher_id = t.id
JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
JOIN "public"."classes" c ON co.class_section_id = c.id
JOIN "public"."courses" cr ON co.course_id = cr.id
JOIN "public"."departments" d ON cr.department_id = d.id;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS "idx_schedule_summary_date" ON schedule_summary (date);
CREATE INDEX IF NOT EXISTS "idx_schedule_summary_teacher" ON schedule_summary (teacher_id);
CREATE INDEX IF NOT EXISTS "idx_schedule_summary_class" ON schedule_summary (class_section_id);
CREATE INDEX IF NOT EXISTS "idx_schedule_summary_timeslot" ON schedule_summary (timeslot_id);

-- 6. ADD USER EXPERIENCE ENHANCEMENTS
-- =====================================================

-- Add status tracking to timetable generations
ALTER TABLE "public"."timetable_generations" 
ADD COLUMN "progress_percentage" INTEGER DEFAULT 0,
ADD COLUMN "total_lessons" INTEGER,
ADD COLUMN "scheduled_lessons" INTEGER DEFAULT 0,
ADD COLUMN "validation_errors" JSONB DEFAULT '[]'::JSONB;

-- Add comments for better documentation
COMMENT ON FUNCTION get_available_time_slots IS 'Returns available time slots for a teacher on a specific date, excluding conflicts and constraints';
COMMENT ON FUNCTION get_curriculum_requirements IS 'Returns curriculum requirements for AI scheduling with progress tracking';
COMMENT ON FUNCTION validate_schedule IS 'Validates AI-generated schedule for conflicts and curriculum coverage';
COMMENT ON MATERIALIZED VIEW schedule_summary IS 'Optimized view for schedule queries and reporting';

-- 7. ADD RLS POLICIES FOR SCHEDULED LESSONS
-- =====================================================

-- Enable RLS on scheduled_lessons
ALTER TABLE "public"."scheduled_lessons" ENABLE ROW LEVEL SECURITY;

-- Policy for viewing scheduled lessons
CREATE POLICY "Users can view scheduled lessons in their school" ON "public"."scheduled_lessons"
FOR SELECT USING (
    school_id IN (
        SELECT school_id FROM "public"."profiles" 
        WHERE id = auth.uid()
    )
);

-- Policy for managing scheduled lessons (admin only)
CREATE POLICY "Admins can manage scheduled lessons in their school" ON "public"."scheduled_lessons"
FOR ALL USING (
    school_id IN (
        SELECT school_id FROM "public"."profiles" 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 8. ADD TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update schedule summary when lessons change
CREATE OR REPLACE FUNCTION refresh_schedule_summary() RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW schedule_summary;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_schedule_summary
AFTER INSERT OR UPDATE OR DELETE ON "public"."scheduled_lessons"
FOR EACH STATEMENT EXECUTE FUNCTION refresh_schedule_summary();

-- Trigger to update timetable generation progress
CREATE OR REPLACE FUNCTION update_generation_progress() RETURNS TRIGGER AS $$
BEGIN
    -- Update scheduled_lessons count
    UPDATE "public"."timetable_generations" tg
    SET scheduled_lessons = (
        SELECT COUNT(*) 
        FROM "public"."scheduled_lessons" sl
        JOIN "public"."teaching_assignments" ta ON sl.teaching_assignment_id = ta.id
        JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
        WHERE co.term_id = tg.term_id
    )
    WHERE tg.term_id = (
        SELECT co.term_id 
        FROM "public"."teaching_assignments" ta
        JOIN "public"."class_offerings" co ON ta.class_offering_id = co.id
        WHERE ta.id = NEW.teaching_assignment_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generation_progress
AFTER INSERT OR DELETE ON "public"."scheduled_lessons"
FOR EACH ROW EXECUTE FUNCTION update_generation_progress(); 