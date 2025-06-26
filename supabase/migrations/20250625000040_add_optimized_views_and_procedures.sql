-- Create materialized view for class schedules
CREATE MATERIALIZED VIEW class_schedules_view AS
SELECT 
  sl.id as scheduled_lesson_id,
  sl.date,
  sl.timeslot_id,
  ta.teacher_id,
  ta.class_offering_id,
  co.course_id,
  ta.school_id
FROM scheduled_lessons sl
JOIN teaching_assignments ta ON ta.id = sl.teaching_assignment_id
JOIN class_offerings co ON co.id = ta.class_offering_id;

-- Create index for class schedules view
CREATE UNIQUE INDEX class_schedules_view_idx ON class_schedules_view (scheduled_lesson_id);
CREATE INDEX class_schedules_date_idx ON class_schedules_view (date);
CREATE INDEX class_schedules_class_idx ON class_schedules_view (class_offering_id);
CREATE INDEX class_schedules_school_idx ON class_schedules_view (school_id);

-- Create materialized view for teacher availability
CREATE MATERIALIZED VIEW teacher_availability_view AS
WITH teacher_schedule AS (
  SELECT 
    ta.teacher_id,
    ta.school_id,
    sl.date,
    ts.id as time_slot_id,
    ts.start_time,
    ts.end_time,
    ts.day_of_week
  FROM teaching_assignments ta
  JOIN scheduled_lessons sl ON sl.teaching_assignment_id = ta.id
  JOIN time_slots ts ON ts.id = sl.timeslot_id
)
SELECT 
  t.id as teacher_id,
  t.school_id,
  d.date,
  ts.id as time_slot_id,
  CASE 
    WHEN ts.id IN (
      SELECT time_slot_id 
      FROM teacher_schedule 
      WHERE teacher_id = t.id 
      AND date = d.date
    ) THEN false
    ELSE true
  END as is_available,
  CASE 
    WHEN ttc.constraint_type IS NOT NULL THEN ttc.constraint_type
    ELSE 'available'
  END as availability_type,
  ttc.priority as constraint_priority
FROM teachers t
CROSS JOIN (
  SELECT DISTINCT date FROM scheduled_lessons
) d
CROSS JOIN time_slots ts
LEFT JOIN teacher_time_constraints ttc ON ttc.teacher_id = t.id AND ttc.time_slot_id = ts.id;

-- Create index for teacher availability view
CREATE UNIQUE INDEX teacher_availability_view_idx ON teacher_availability_view (teacher_id, date, time_slot_id);
CREATE INDEX teacher_availability_school_idx ON teacher_availability_view (school_id);

-- Create function to check scheduling conflicts
CREATE OR REPLACE FUNCTION check_scheduling_conflicts(
  p_teacher_id UUID,
  p_timeslot_id UUID,
  p_date DATE,
  p_school_id UUID
) RETURNS TABLE (
  has_conflict BOOLEAN,
  conflict_type TEXT,
  conflict_details JSONB
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH conflicts AS (
    -- Check direct time slot conflict
    SELECT 
      true as has_conflict,
      'TIME_SLOT' as conflict_type,
      jsonb_build_object(
        'existing_lesson', jsonb_build_object(
          'id', sl.id,
          'class', co.name,
          'time', ts.start_time
        )
      ) as details
    FROM scheduled_lessons sl
    JOIN teaching_assignments ta ON ta.id = sl.teaching_assignment_id
    JOIN time_slots ts ON ts.id = sl.timeslot_id
    JOIN class_offerings co ON co.id = ta.class_offering_id
    WHERE ta.teacher_id = p_teacher_id
    AND sl.timeslot_id = p_timeslot_id
    AND sl.date = p_date
    AND ta.school_id = p_school_id
    
    UNION ALL
    
    -- Check teacher time constraints
    SELECT 
      true,
      'TIME_CONSTRAINT',
      jsonb_build_object(
        'constraint_type', ttc.constraint_type,
        'reason', ttc.reason,
        'priority', ttc.priority
      )
    FROM teacher_time_constraints ttc
    WHERE ttc.teacher_id = p_teacher_id
    AND ttc.time_slot_id = p_timeslot_id
    AND ttc.constraint_type = 'unavailable'
    
    UNION ALL
    
    -- Check consecutive lessons limit
    SELECT 
      true,
      'CONSECUTIVE_LESSONS',
      jsonb_build_object(
        'count', COUNT(*),
        'max_allowed', s.sessions_per_day
      )
    FROM scheduled_lessons sl
    JOIN teaching_assignments ta ON ta.id = sl.teaching_assignment_id
    JOIN time_slots ts ON ts.id = sl.timeslot_id
    JOIN schools s ON s.id = ta.school_id
    WHERE ta.teacher_id = p_teacher_id
    AND sl.date = p_date
    AND ta.school_id = p_school_id
    GROUP BY s.sessions_per_day
    HAVING COUNT(*) >= s.sessions_per_day
  )
  SELECT 
    COALESCE(bool_or(has_conflict), false),
    string_agg(conflict_type, ', '),
    jsonb_object_agg(conflict_type, details)
  FROM conflicts;
END;
$$;

-- Create function to get class conflicts
CREATE OR REPLACE FUNCTION get_class_conflicts(
  p_class_offering_id UUID,
  p_timeslot_id UUID,
  p_date DATE,
  p_school_id UUID
) RETURNS TABLE (
  has_conflict BOOLEAN,
  conflict_type TEXT,
  conflict_details JSONB
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH conflicts AS (
    -- Check direct time slot conflict
    SELECT 
      true as has_conflict,
      'TIME_SLOT' as conflict_type,
      jsonb_build_object(
        'existing_lesson', jsonb_build_object(
          'id', sl.id,
          'subject', c.name,
          'time', ts.start_time
        )
      ) as details
    FROM scheduled_lessons sl
    JOIN teaching_assignments ta ON ta.id = sl.teaching_assignment_id
    JOIN time_slots ts ON ts.id = sl.timeslot_id
    JOIN class_offerings co ON co.id = ta.class_offering_id
    JOIN courses c ON c.id = co.course_id
    WHERE co.id = p_class_offering_id
    AND sl.timeslot_id = p_timeslot_id
    AND sl.date = p_date
    AND ta.school_id = p_school_id
    
    UNION ALL
    
    -- Check subject distribution
    SELECT 
      true,
      'SUBJECT_DISTRIBUTION',
      jsonb_build_object(
        'subject', c.name,
        'count', COUNT(*),
        'max_per_day', s.sessions_per_day
      )
    FROM scheduled_lessons sl
    JOIN teaching_assignments ta ON ta.id = sl.teaching_assignment_id
    JOIN class_offerings co ON co.id = ta.class_offering_id
    JOIN courses c ON c.id = co.course_id
    JOIN schools s ON s.id = ta.school_id
    WHERE co.id = p_class_offering_id
    AND sl.date = p_date
    AND ta.school_id = p_school_id
    GROUP BY c.id, c.name, s.sessions_per_day
    HAVING COUNT(*) >= LEAST(2, s.sessions_per_day)
  )
  SELECT 
    COALESCE(bool_or(has_conflict), false),
    string_agg(conflict_type, ', '),
    jsonb_object_agg(conflict_type, details)
  FROM conflicts;
END;
$$;

-- Create refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_schedule_views() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY class_schedules_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY teacher_availability_view;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh views when schedules change
CREATE OR REPLACE FUNCTION trigger_refresh_schedule_views() RETURNS trigger AS $$
BEGIN
  PERFORM refresh_schedule_views();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_schedule_views_trigger
AFTER INSERT OR UPDATE OR DELETE ON scheduled_lessons
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_schedule_views(); 