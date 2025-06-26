

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'course_grade_class_mappings table dropped; curriculum is now defined solely by class_offerings.';



CREATE SCHEMA IF NOT EXISTS "timetable";


ALTER SCHEMA "timetable" OWNER TO "postgres";


COMMENT ON SCHEMA "timetable" IS 'This schema was removed to eliminate confusion with duplicate class_offerings tables. 
The public.class_offerings table is now the single source of truth for curriculum definition.';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."day_of_week" AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);


ALTER TYPE "public"."day_of_week" OWNER TO "postgres";


CREATE TYPE "public"."time_slot_type" AS ENUM (
    'lecture',
    'lab',
    'tutorial',
    'other'
);


ALTER TYPE "public"."time_slot_type" OWNER TO "postgres";


CREATE TYPE "public"."timetable_generation_status" AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."timetable_generation_status" OWNER TO "postgres";


CREATE TYPE "public"."timetable_status" AS ENUM (
    'draft',
    'generating',
    'completed',
    'failed',
    'published'
);


ALTER TYPE "public"."timetable_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."timetable_status" IS 'Status enum for timetable generation process - critical for OR-Tools integration';



CREATE OR REPLACE FUNCTION "public"."calculate_required_hours_per_term"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If required_hours_per_term is NULL but we have periods_per_week and term duration
  IF NEW.required_hours_per_term IS NULL AND NEW.periods_per_week > 0 THEN
    SELECT 
      (NEW.periods_per_week * t.period_duration_minutes / 60.0) * 
      (EXTRACT(EPOCH FROM (t.end_date::date - t.start_date::date)) / (7 * 24 * 3600))
    INTO NEW.required_hours_per_term
    FROM terms t
    WHERE t.id = NEW.term_id
    AND t.period_duration_minutes IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_required_hours_per_term"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_required_hours_per_term"() IS 'Auto-calculates required hours per term based on periods per week and term duration';



CREATE OR REPLACE FUNCTION "public"."check_time_slot_overlap"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."check_time_slot_overlap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_admin_profile_with_school"("p_user_id" "uuid", "p_school_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    profile_id UUID;
BEGIN
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Profile already exists for user %', p_user_id;
    END IF;
    
    -- Check if school exists and user owns it
    IF NOT EXISTS (
        SELECT 1 FROM public.schools 
        WHERE id = p_school_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'School not found or user does not own school %', p_school_id;
    END IF;
    
    -- Create the profile
    INSERT INTO public.profiles (id, role, school_id)
    VALUES (p_user_id, 'admin', p_school_id)
    RETURNING id INTO profile_id;
    
    RETURN profile_id;
END;
$$;


ALTER FUNCTION "public"."create_admin_profile_with_school"("p_user_id" "uuid", "p_school_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_admin_profile_with_school"("p_user_id" "uuid", "p_school_id" "uuid") IS 'Creates an admin profile for a user with a specific school. 
This function should be called during the onboarding process after school creation.';



CREATE OR REPLACE FUNCTION "public"."create_class_section"("p_school_id" "uuid", "p_grade_level" integer, "p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    class_id uuid;
BEGIN
    -- Validate inputs
    IF p_grade_level < 1 OR p_grade_level > 12 THEN
        RAISE EXCEPTION 'Invalid grade level: % (must be between 1 and 12)', p_grade_level;
    END IF;
    
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Class name cannot be empty';
    END IF;
    
    -- Check if class already exists
    IF EXISTS (
        SELECT 1 FROM public.classes 
        WHERE school_id = p_school_id 
        AND grade_level = p_grade_level 
        AND name = p_name
    ) THEN
        RAISE EXCEPTION 'Class % already exists for grade % in this school', p_name, p_grade_level;
    END IF;
    
    -- Create the class
    INSERT INTO public.classes (school_id, grade_level, name)
    VALUES (p_school_id, p_grade_level, p_name)
    RETURNING id INTO class_id;
    
    RETURN class_id;
END;
$$;


ALTER FUNCTION "public"."create_class_section"("p_school_id" "uuid", "p_grade_level" integer, "p_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_class_section"("p_school_id" "uuid", "p_grade_level" integer, "p_name" "text") IS 'Creates a new class section with validation.
Returns the ID of the created class.';



CREATE OR REPLACE FUNCTION "public"."delete_class_safely"("class_id" "uuid") RETURNS TABLE("success" boolean, "message" "text", "deleted_offerings" integer, "deleted_mappings" integer, "deleted_assignments" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    class_name TEXT;
    offerings_count INTEGER;
    mappings_count INTEGER;
    assignments_count INTEGER;
BEGIN
    -- Get class information
    SELECT name INTO class_name FROM public.classes WHERE id = class_id;
    
    IF class_name IS NULL THEN
        RETURN QUERY SELECT false, 'Class not found'::TEXT, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Count related records that will be deleted
    SELECT COUNT(*) INTO offerings_count 
    FROM public.class_offerings 
    WHERE class_id = class_id;
    
    SELECT COUNT(*) INTO mappings_count 
    FROM public.course_grade_class_mappings 
    WHERE class_id = class_id;
    
    SELECT COUNT(*) INTO assignments_count 
    FROM public.teaching_assignments ta
    JOIN public.class_offerings co ON ta.class_offering_id = co.id
    WHERE co.class_id = class_id;
    
    -- Delete the class (cascade will handle the rest)
    DELETE FROM public.classes WHERE id = class_id;
    
    -- Return success with counts
    RETURN QUERY SELECT 
        true, 
        format('Class "%s" deleted successfully. %s offerings, %s mappings, and %s assignments were also deleted.', 
               class_name, offerings_count, mappings_count, assignments_count)::TEXT,
        offerings_count,
        mappings_count,
        assignments_count;
END;
$$;


ALTER FUNCTION "public"."delete_class_safely"("class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_class_safely"("class_id" "uuid") IS 'This function safely deletes a class and all its related records.
It provides a summary of what was deleted and ensures proper cleanup.
Use this instead of direct DELETE to get feedback on the operation.';



CREATE OR REPLACE FUNCTION "public"."ensure_curriculum_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Prevent duplicate offerings
    IF EXISTS (
        SELECT 1 FROM public.class_offerings 
        WHERE class_id = NEW.class_id 
        AND course_id = NEW.course_id 
        AND term_id = NEW.term_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RAISE EXCEPTION 'Duplicate class offering: Class % already has course % in term %', 
            NEW.class_id, NEW.course_id, NEW.term_id;
    END IF;
    
    -- Ensure periods_per_week is reasonable
    IF NEW.periods_per_week < 1 OR NEW.periods_per_week > 20 THEN
        RAISE EXCEPTION 'Invalid periods_per_week: % (must be between 1 and 20)', NEW.periods_per_week;
    END IF;
    
    -- Ensure required_hours_per_term is positive if provided
    IF NEW.required_hours_per_term IS NOT NULL AND NEW.required_hours_per_term <= 0 THEN
        RAISE EXCEPTION 'Invalid required_hours_per_term: % (must be positive)', NEW.required_hours_per_term;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_curriculum_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."explain_class_structure"() RETURNS TABLE("component" "text", "purpose" "text", "key_fields" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Classes (Single Source of Truth)'::TEXT as component,
        'Defines actual classes that students attend (e.g., Grade 9-A, Grade 10-B)'::TEXT as purpose,
        'school_id, grade_level, name'::TEXT as key_fields
    UNION ALL
    SELECT 
        'Class Offerings'::TEXT,
        'Defines which courses are taught to which classes during specific terms'::TEXT,
        'class_id (references classes.id), course_id, term_id'::TEXT
    UNION ALL
    SELECT 
        'Courses'::TEXT,
        'Defines the subjects/courses that can be taught'::TEXT,
        'school_id, department_id, name, code, grade_level'::TEXT;
END;
$$;


ALTER FUNCTION "public"."explain_class_structure"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."explain_class_structure"() IS 'This function explains the current class structure after cleaning up the naming confusion.
The classes table is now the single source of truth for class definitions.';



CREATE OR REPLACE FUNCTION "public"."explain_curriculum_structure"() RETURNS TABLE("component" "text", "purpose" "text", "key_fields" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Class Offerings (Single Source of Truth)'::TEXT as component,
        'Defines the curriculum: which courses are taught to which classes during which terms'::TEXT as purpose,
        'class_id, course_id, term_id, periods_per_week, required_hours_per_term'::TEXT as key_fields
    UNION ALL
    SELECT 
        'Teaching Assignments'::TEXT,
        'Assigns teachers to specific class offerings'::TEXT,
        'class_offering_id, teacher_id'::TEXT
    UNION ALL
    SELECT 
        'Class Sections'::TEXT,
        'Defines the classes (e.g., Grade 9-A, Grade 10-B)'::TEXT,
        'school_id, grade_level, name'::TEXT
    UNION ALL
    SELECT 
        'Courses'::TEXT,
        'Defines the subjects/courses that can be taught'::TEXT,
        'school_id, department_id, name, code, grade_level'::TEXT
    UNION ALL
    SELECT 
        'Terms'::TEXT,
        'Defines when courses are taught (e.g., Term 1, Term 2)'::TEXT,
        'academic_year_id, name, start_date, end_date'::TEXT;
END;
$$;


ALTER FUNCTION "public"."explain_curriculum_structure"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."explain_curriculum_structure"() IS 'This function explains the current curriculum structure after removing the confusing timetable schema. 
The public.class_offerings table is now the single source of truth for curriculum definition.';



CREATE OR REPLACE FUNCTION "public"."get_available_teaching_time"("term_id_param" "uuid") RETURNS TABLE("day_of_week" integer, "start_time" time without time zone, "end_time" time without time zone, "period_number" integer, "slot_id" "uuid", "is_available" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.day_of_week,
    ts.start_time,
    ts.end_time,
    ts.period_number,
    ts.id as slot_id,
    CASE 
      WHEN h.id IS NOT NULL THEN FALSE -- Holiday
      WHEN ts.is_teaching_period = FALSE THEN FALSE -- Break period
      ELSE TRUE -- Available for teaching
    END as is_available
  FROM time_slots ts
  JOIN terms t ON t.id = term_id_param
  JOIN academic_years ay ON ay.id = t.academic_year_id
  LEFT JOIN holidays h ON h.date BETWEEN t.start_date AND t.end_date
    AND EXTRACT(DOW FROM h.date) = ts.day_of_week
    AND h.school_id = ts.school_id
  WHERE ts.school_id = ay.school_id
  ORDER BY ts.day_of_week, ts.start_time;
END;
$$;


ALTER FUNCTION "public"."get_available_teaching_time"("term_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_available_teaching_time"("term_id_param" "uuid") IS 'Gets available teaching time slots for OR-Tools, excluding holidays and breaks';



CREATE OR REPLACE FUNCTION "public"."get_class_section_curriculum_summary"("p_class_id" "uuid", "p_term_id" "uuid") RETURNS TABLE("total_offerings" integer, "total_periods_per_week" integer, "total_hours_per_term" integer, "assigned_offerings" integer, "unassigned_offerings" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_offerings,
        COALESCE(SUM(co.periods_per_week), 0)::INTEGER as total_periods_per_week,
        COALESCE(SUM(co.required_hours_per_term), 0)::INTEGER as total_hours_per_term,
        COUNT(CASE WHEN co.manual_assigned_teacher_id IS NOT NULL OR co.ai_assigned_teacher_id IS NOT NULL THEN 1 END)::INTEGER as assigned_offerings,
        COUNT(CASE WHEN co.manual_assigned_teacher_id IS NULL AND co.ai_assigned_teacher_id IS NULL THEN 1 END)::INTEGER as unassigned_offerings
    FROM public.class_offerings co
    WHERE co.class_id = p_class_id 
    AND co.term_id = p_term_id;
END;
$$;


ALTER FUNCTION "public"."get_class_section_curriculum_summary"("p_class_id" "uuid", "p_term_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_curriculum_consistency_report"("p_school_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("class_name" "text", "course_name" "text", "periods_per_week" integer, "required_hours_per_term" integer, "expected_hours" numeric, "variance_hours" numeric, "status" "text", "recommendation" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name as class_name,
        co_course.name as course_name,
        co.periods_per_week,
        co.required_hours_per_term,
        (co.periods_per_week * 16 * COALESCE(t.period_duration_minutes, 50)) / 60.0 as expected_hours,
        ((co.periods_per_week * 16 * COALESCE(t.period_duration_minutes, 50)) / 60.0) - co.required_hours_per_term as variance_hours,
        CASE 
            WHEN ABS(((co.periods_per_week * 16 * COALESCE(t.period_duration_minutes, 50)) / 60.0) - co.required_hours_per_term) <= 5.0 
            THEN 'CONSISTENT'
            ELSE 'INCONSISTENT'
        END as status,
        CASE 
            WHEN ABS(((co.periods_per_week * 16 * COALESCE(t.period_duration_minutes, 50)) / 60.0) - co.required_hours_per_term) <= 5.0 
            THEN 'No action needed'
            ELSE format('Consider adjusting required_hours_per_term to %.1f or periods_per_week to %d', 
                       (co.periods_per_week * 16 * COALESCE(t.period_duration_minutes, 50)) / 60.0,
                       ROUND((co.required_hours_per_term * 60.0) / (16 * COALESCE(t.period_duration_minutes, 50))))
        END as recommendation
    FROM public.class_offerings co
    JOIN public.classes c ON co.class_id = c.id
    JOIN public.courses co_course ON co.course_id = co_course.id
    JOIN public.terms t ON co.term_id = t.id
    WHERE (p_school_id IS NULL OR c.school_id = p_school_id)
    ORDER BY c.grade_level, c.name, co_course.name;
END;
$$;


ALTER FUNCTION "public"."get_curriculum_consistency_report"("p_school_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_curriculum_consistency_report"("p_school_id" "uuid") IS 'Simple report showing consistency between periods_per_week and required_hours_per_term.
Assumes 16 weeks per term by default. Filter by school_id for specific reports.';



CREATE OR REPLACE FUNCTION "public"."get_schema_overview"() RETURNS TABLE("table_name" "text", "purpose" "text", "single_source_of_truth" boolean, "key_relationships" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'class_offerings'::TEXT as table_name,
        'Defines what courses are taught to which classes during which terms'::TEXT as purpose,
        true as single_source_of_truth,
        'class_id -> classes, course_id -> courses, term_id -> terms'::TEXT as key_relationships
    UNION ALL
    SELECT 
        'classes'::TEXT,
        'Defines actual classes that students attend (e.g., Grade 9-A)'::TEXT,
        true,
        'school_id -> schools'::TEXT
    UNION ALL
    SELECT 
        'courses'::TEXT,
        'Defines the courses/subjects that can be taught'::TEXT,
        true,
        'department_id -> departments, school_id -> schools'::TEXT
    UNION ALL
    SELECT 
        'departments'::TEXT,
        'Defines academic departments (e.g., Mathematics, Science)'::TEXT,
        true,
        'school_id -> schools'::TEXT
    UNION ALL
    SELECT 
        'teachers'::TEXT,
        'Defines teachers who can be assigned to courses'::TEXT,
        true,
        'school_id -> schools'::TEXT
    UNION ALL
    SELECT 
        'teacher_qualifications'::TEXT,
        'Defines what subjects a teacher CAN teach (capability)'::TEXT,
        true,
        'teacher_id -> teachers, department_id -> departments'::TEXT
    UNION ALL
    SELECT 
        'teacher_departments'::TEXT,
        'Defines what department a teacher BELONGS to (organizational)'::TEXT,
        true,
        'teacher_id -> teachers, department_id -> departments'::TEXT
    UNION ALL
    SELECT 
        'teacher_time_constraints'::TEXT,
        'Defines all teacher time slot constraints (unified)'::TEXT,
        true,
        'teacher_id -> teachers, time_slot_id -> time_slots'::TEXT
    UNION ALL
    SELECT 
        'teaching_assignments'::TEXT,
        'Links teachers to specific class offerings'::TEXT,
        true,
        'class_offering_id -> class_offerings, teacher_id -> teachers'::TEXT
    UNION ALL
    SELECT 
        'subject_grade_mappings'::TEXT,
        'Defines curriculum standards (what is required by grade)'::TEXT,
        true,
        'department_id -> departments'::TEXT
    UNION ALL
    SELECT 
        'course_grade_class_mappings'::TEXT,
        'Provides flexible course-to-class mappings'::TEXT,
        true,
        'course_id -> courses, class_id -> classes'::TEXT;
END;
$$;


ALTER FUNCTION "public"."get_schema_overview"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_schema_overview"() IS 'This function provides a comprehensive overview of the schema structure.
It clarifies the purpose of each table and identifies single sources of truth.
This addresses the dev lead''s concerns about confusing core logic.';



CREATE OR REPLACE FUNCTION "public"."get_school_breaks"("p_school_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "start_time" time without time zone, "end_time" time without time zone, "sequence" integer, "is_active" boolean, "duration_minutes" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_school_breaks"("p_school_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teacher_department_summary"("p_teacher_id" "uuid") RETURNS TABLE("department_id" "uuid", "department_name" "text", "department_code" "text", "is_primary" boolean, "course_count" bigint, "courses" "text"[])
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id as department_id,
        d.name as department_name,
        d.code as department_code,
        td.is_primary,
        COUNT(c.id) as course_count,
        ARRAY_AGG(c.name ORDER BY c.name) as courses
    FROM "public"."teacher_departments" td
    JOIN "public"."departments" d ON d.id = td.department_id
    LEFT JOIN "public"."courses" c ON c.department_id = d.id
    WHERE td.teacher_id = p_teacher_id
    GROUP BY d.id, d.name, d.code, td.is_primary
    ORDER BY td.is_primary DESC, d.name;
END;
$$;


ALTER FUNCTION "public"."get_teacher_department_summary"("p_teacher_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_teacher_department_summary"("p_teacher_id" "uuid") IS 'Returns a summary of a teacher''s department assignments with course counts and course names.';



CREATE OR REPLACE FUNCTION "public"."get_teacher_qualifications"("p_teacher_id" "uuid") RETURNS TABLE("course_id" "uuid", "course_name" "text", "course_code" "text", "department_id" "uuid", "department_name" "text", "grade_level" integer, "is_primary_department" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        c.id as course_id,
        c.name as course_name,
        c.code as course_code,
        d.id as department_id,
        d.name as department_name,
        c.grade_level,
        td.is_primary as is_primary_department
    FROM "public"."teacher_departments" td
    JOIN "public"."departments" d ON d.id = td.department_id
    JOIN "public"."courses" c ON c.department_id = d.id
    WHERE td.teacher_id = p_teacher_id
    ORDER BY td.is_primary DESC, d.name, c.name;
END;
$$;


ALTER FUNCTION "public"."get_teacher_qualifications"("p_teacher_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_teacher_qualifications"("p_teacher_id" "uuid") IS 'Returns all courses that a teacher is qualified to teach based on their department assignments. Teachers are automatically qualified for all courses in departments they are assigned to.';



CREATE OR REPLACE FUNCTION "public"."get_teachers_for_course"("p_course_id" "uuid") RETURNS TABLE("teacher_id" "uuid", "teacher_name" "text", "teacher_email" "text", "department_id" "uuid", "department_name" "text", "is_primary_department" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        t.id as teacher_id,
        (t.first_name || ' ' || t.last_name) as teacher_name,
        t.email as teacher_email,
        d.id as department_id,
        d.name as department_name,
        td.is_primary as is_primary_department
    FROM "public"."teacher_departments" td
    JOIN "public"."teachers" t ON t.id = td.teacher_id
    JOIN "public"."departments" d ON d.id = td.department_id
    JOIN "public"."courses" c ON c.department_id = d.id
    WHERE c.id = p_course_id
    ORDER BY td.is_primary DESC, t.first_name, t.last_name;
END;
$$;


ALTER FUNCTION "public"."get_teachers_for_course"("p_course_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_teachers_for_course"("p_course_id" "uuid") IS 'Returns all teachers qualified to teach a specific course based on their department assignments.';



CREATE OR REPLACE FUNCTION "public"."log_class_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Log the deletion (you can extend this to write to an audit table)
    RAISE NOTICE 'Class "%s" (ID: %) was deleted. This action cascaded to delete % offerings, % mappings, and % assignments.',
        OLD.name, OLD.id,
        (SELECT COUNT(*) FROM public.class_offerings WHERE class_id = OLD.id),
        (SELECT COUNT(*) FROM public.course_grade_class_mappings WHERE class_id = OLD.id),
        (SELECT COUNT(*) FROM public.teaching_assignments ta
         JOIN public.class_offerings co ON ta.class_offering_id = co.id
         WHERE co.class_id = OLD.id);
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."log_class_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_migration_issue"("p_table_name" "text", "p_issue_type" "text", "p_issue_description" "text", "p_record_id" "uuid" DEFAULT NULL::"uuid", "p_field_name" "text" DEFAULT NULL::"text", "p_current_value" "text" DEFAULT NULL::"text", "p_suggested_fix" "text" DEFAULT NULL::"text", "p_severity" "text" DEFAULT 'warning'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO migration_issues (
        table_name, issue_type, issue_description, record_id, 
        field_name, current_value, suggested_fix, severity
    ) VALUES (
        p_table_name, p_issue_type, p_issue_description, p_record_id,
        p_field_name, p_current_value, p_suggested_fix, p_severity
    );
END;
$$;


ALTER FUNCTION "public"."log_migration_issue"("p_table_name" "text", "p_issue_type" "text", "p_issue_description" "text", "p_record_id" "uuid", "p_field_name" "text", "p_current_value" "text", "p_suggested_fix" "text", "p_severity" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_function_name"("p_class_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Your logic here
    -- Example: SELECT * FROM class_offerings WHERE class_id = p_class_id;
END;
$$;


ALTER FUNCTION "public"."my_function_name"("p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prepare_timetable_data"("school_uuid" "uuid") RETURNS TABLE("class_offering_id" "uuid", "course_id" "uuid", "class_id" "uuid", "teacher_id" "uuid", "periods_per_week" integer, "required_hours" integer, "term_start" "date", "term_end" "date", "available_slots" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.id as class_offering_id,
        co.course_id,
        co.class_id,
        ta.teacher_id,
        co.periods_per_week,
        c.required_hours_per_term,
        t.start_date as term_start,
        t.end_date as term_end,
        jsonb_agg(
            jsonb_build_object(
                'day_of_week', ts.day_of_week,
                'start_time', ts.start_time,
                'end_time', ts.end_time,
                'period_number', ts.period_number
            )
        ) as available_slots
    FROM class_offerings co
    JOIN courses c ON co.course_id = c.id
    JOIN terms t ON co.term_id = t.id
    JOIN teaching_assignments ta ON co.id = ta.class_offering_id
    CROSS JOIN time_slots ts
    WHERE c.school_id = school_uuid
    AND ts.school_id = school_uuid
    AND t.academic_year_id IN (
        SELECT id FROM academic_years WHERE school_id = school_uuid AND is_active = true
    )
    GROUP BY co.id, co.course_id, co.class_id, ta.teacher_id, co.periods_per_week, 
             c.required_hours_per_term, t.start_date, t.end_date;
END;
$$;


ALTER FUNCTION "public"."prepare_timetable_data"("school_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prepare_timetable_data"("school_uuid" "uuid") IS 'Prepares structured data for OR-Tools timetable generation';



CREATE OR REPLACE FUNCTION "public"."preview_class_deletion"("class_id" "uuid") RETURNS TABLE("class_name" "text", "offerings_count" integer, "mappings_count" integer, "assignments_count" integer, "courses_affected" "text"[], "teachers_affected" "text"[])
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    class_name TEXT;
    offerings_count INTEGER;
    mappings_count INTEGER;
    assignments_count INTEGER;
    courses_affected TEXT[];
    teachers_affected TEXT[];
BEGIN
    -- Get class information
    SELECT c.name INTO class_name FROM public.classes c WHERE c.id = class_id;
    
    IF class_name IS NULL THEN
        RETURN;
    END IF;
    
    -- Count related records
    SELECT COUNT(*) INTO offerings_count 
    FROM public.class_offerings 
    WHERE class_id = class_id;
    
    SELECT COUNT(*) INTO mappings_count 
    FROM public.course_grade_class_mappings 
    WHERE class_id = class_id;
    
    SELECT COUNT(*) INTO assignments_count 
    FROM public.teaching_assignments ta
    JOIN public.class_offerings co ON ta.class_offering_id = co.id
    WHERE co.class_id = class_id;
    
    -- Get unique courses that would be affected
    SELECT ARRAY_AGG(DISTINCT c.name) INTO courses_affected
    FROM public.class_offerings co
    JOIN public.courses c ON co.course_id = c.id
    WHERE co.class_id = class_id;
    
    -- Get unique teachers that would be affected
    SELECT ARRAY_AGG(DISTINCT CONCAT(t.first_name, ' ', t.last_name)) INTO teachers_affected
    FROM public.teaching_assignments ta
    JOIN public.class_offerings co ON ta.class_offering_id = co.id
    JOIN public.teachers t ON ta.teacher_id = t.id
    WHERE co.class_id = class_id;
    
    RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."preview_class_deletion"("class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."preview_class_deletion"("class_id" "uuid") IS 'This function previews what would be deleted if a class is removed.
Use this to understand the impact before actually deleting a class.';



CREATE OR REPLACE FUNCTION "public"."set_holiday_school_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Set school_id based on academic_year_id
    NEW.school_id = (
        SELECT "school_id" 
        FROM "public"."academic_years" 
        WHERE "id" = NEW.academic_year_id
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_holiday_school_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_teaching_assignment_school_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Set school_id based on teacher's school
    SELECT t.school_id INTO NEW.school_id
    FROM public.teachers t
    WHERE t.id = NEW.teacher_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_teaching_assignment_school_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_term_school_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
     BEGIN
       SELECT ay.school_id INTO NEW.school_id
       FROM academic_years ay
       WHERE ay.id = NEW.academic_year_id;
       RETURN NEW;
     END;
     $$;


ALTER FUNCTION "public"."set_term_school_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_academic_calendar_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    academic_start DATE;
    academic_end DATE;
BEGIN
    -- Get academic year dates
    SELECT start_date, end_date 
    INTO academic_start, academic_end
    FROM academic_years 
    WHERE id = NEW.academic_year_id;
    
    -- Validate term dates are within academic year
    IF NEW.start_date < academic_start OR NEW.end_date > academic_end THEN
        RAISE EXCEPTION 'Term dates must be within academic year (% to %)', academic_start, academic_end;
    END IF;
    
    -- Validate term start is before end
    IF NEW.start_date >= NEW.end_date THEN
        RAISE EXCEPTION 'Term start date must be before end date';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_academic_calendar_consistency"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_academic_calendar_consistency"() IS 'Validates term dates are within academic year bounds';



CREATE OR REPLACE FUNCTION "public"."validate_admin_school_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Ensure admin users have a school_id
    IF NEW.role = 'admin' AND NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Admin users must have a school_id';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_admin_school_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_all_data_integrity"() RETURNS TABLE("validation_type" "text", "message" "text", "record_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Run all validation functions
    RETURN QUERY SELECT * FROM validate_class_offerings_integrity();
    RETURN QUERY SELECT * FROM validate_teaching_assignments_integrity();
    RETURN QUERY SELECT * FROM validate_scheduled_lessons_integrity();
    RETURN QUERY SELECT * FROM validate_cross_references();
END;
$$;


ALTER FUNCTION "public"."validate_all_data_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_break_timing"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_break_timing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_class_offering_requirements"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    course_hours INTEGER;
    term_weeks INTEGER;
    required_periods INTEGER;
BEGIN
    -- Get course required hours
    SELECT required_hours_per_term INTO course_hours
    FROM courses WHERE id = NEW.course_id;
    
    -- Get term duration in weeks
    SELECT EXTRACT(EPOCH FROM (end_date - start_date)) / (7 * 24 * 60 * 60) INTO term_weeks
    FROM terms WHERE id = NEW.term_id;
    
    -- Calculate required periods per week
    IF course_hours IS NOT NULL AND term_weeks > 0 THEN
        required_periods := CEIL(course_hours::DECIMAL / term_weeks);
        
        -- Check if periods_per_week matches required hours
        IF NEW.periods_per_week < required_periods THEN
            RAISE EXCEPTION 'Periods per week (%) is insufficient for required hours (%). Need at least % periods per week', 
                NEW.periods_per_week, course_hours, required_periods;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_class_offering_requirements"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_class_offering_requirements"() IS 'Validates class offering periods match required course hours';



CREATE OR REPLACE FUNCTION "public"."validate_class_offering_school_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    section_school_id uuid;
    subject_school_id uuid;
    term_school_id uuid;
BEGIN
    -- Get school IDs from related entities
    SELECT cs.school_id INTO section_school_id 
    FROM classes cs WHERE cs.id = NEW.class_id;
    
    SELECT s.school_id INTO subject_school_id 
    FROM subjects s WHERE s.id = NEW.subject_id;
    
    SELECT ay.school_id INTO term_school_id
    FROM terms t 
    JOIN academic_years ay ON t.academic_year_id = ay.id
    WHERE t.id = NEW.term_id;
    
    -- Validate all belong to same school
    IF section_school_id != subject_school_id OR 
       section_school_id != term_school_id THEN
        RAISE EXCEPTION 'Class offering components must belong to the same school. Section: %, Subject: %, Term: %', 
                       section_school_id, subject_school_id, term_school_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_class_offering_school_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_class_offerings_integrity"() RETURNS TABLE("issue_type" "text", "description" "text", "record_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check for orphaned class offerings
    RETURN QUERY
    SELECT 
        'orphaned_class_offering'::TEXT,
        'Class offering references non-existent class'::TEXT,
        co.id
    FROM class_offerings co
    LEFT JOIN classes c ON c.id = co.class_id
    WHERE c.id IS NULL;
    
    -- Check for orphaned class offerings (no valid term)
    RETURN QUERY
    SELECT 
        'orphaned_class_offering'::TEXT,
        'Class offering references non-existent term'::TEXT,
        co.id
    FROM class_offerings co
    LEFT JOIN terms t ON t.id = co.term_id
    WHERE t.id IS NULL;
    
    -- Check for orphaned class offerings (no valid course)
    RETURN QUERY
    SELECT 
        'orphaned_class_offering'::TEXT,
        'Class offering references non-existent course'::TEXT,
        co.id
    FROM class_offerings co
    LEFT JOIN courses c ON c.id = co.course_id
    WHERE c.id IS NULL;
END;
$$;


ALTER FUNCTION "public"."validate_class_offerings_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_course_hours_distribution"("course_id_param" "uuid") RETURNS TABLE("validation_type" "text", "message" "text", "severity" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  course_record RECORD;
  total_terms INTEGER;
  expected_hours_per_term NUMERIC;
BEGIN
  -- Get course information
  SELECT * INTO course_record FROM courses WHERE id = course_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Count terms in the academic year
  SELECT COUNT(*) INTO total_terms
  FROM terms t
  JOIN academic_years ay ON ay.id = t.academic_year_id
  WHERE ay.school_id = course_record.school_id;
  
  -- Validate hours distribution
  IF course_record.hours_distribution_type = 'equal' AND course_record.total_hours_per_year IS NOT NULL THEN
    expected_hours_per_term := course_record.total_hours_per_year / total_terms;
    
    -- Check if class offerings match expected hours
    RETURN QUERY
    SELECT 
      'hours_distribution_mismatch'::TEXT as validation_type,
      'Class offering hours do not match course distribution'::TEXT as message,
      'warning'::TEXT as severity,
      jsonb_build_object(
        'course_id', course_record.id,
        'course_name', course_record.name,
        'distribution_type', course_record.hours_distribution_type,
        'total_hours_per_year', course_record.total_hours_per_year,
        'expected_hours_per_term', expected_hours_per_term,
        'total_terms', total_terms,
        'class_offering_id', co.id,
        'actual_hours_per_term', co.required_hours_per_term
      ) as details
    FROM class_offerings co
    WHERE co.course_id = course_id_param
    AND co.required_hours_per_term IS NOT NULL
    AND ABS(co.required_hours_per_term - expected_hours_per_term) > 2; -- Allow 2 hour tolerance
  END IF;
  
  -- Validate custom term hours
  IF course_record.hours_distribution_type = 'custom' AND course_record.term_hours IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      'custom_hours_mismatch'::TEXT as validation_type,
      'Class offering hours do not match custom term hours'::TEXT as message,
      'warning'::TEXT as severity,
      jsonb_build_object(
        'course_id', course_record.id,
        'course_name', course_record.name,
        'term_hours', course_record.term_hours,
        'class_offering_id', co.id,
        'term_id', co.term_id,
        'actual_hours_per_term', co.required_hours_per_term
      ) as details
    FROM class_offerings co
    WHERE co.course_id = course_id_param
    AND co.required_hours_per_term IS NOT NULL
    AND course_record.term_hours ? co.term_id::TEXT
    AND ABS(co.required_hours_per_term - (course_record.term_hours->>co.term_id::TEXT)::NUMERIC) > 2;
  END IF;
END;
$$;


ALTER FUNCTION "public"."validate_course_hours_distribution"("course_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_course_hours_distribution"("course_id_param" "uuid") IS 'Validates course hours distribution against class offerings';



CREATE OR REPLACE FUNCTION "public"."validate_cross_references"() RETURNS TABLE("issue_type" "text", "description" "text", "record_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check for grade level mismatches between classes and courses
    RETURN QUERY
    SELECT 
        'grade_level_mismatch'::TEXT,
        'Class and course have different grade levels'::TEXT,
        co.id
    FROM class_offerings co
    JOIN classes cl ON cl.id = co.class_id
    JOIN courses c ON c.id = co.course_id
    WHERE cl.grade_level != c.grade_level;
    
    -- Check for school consistency issues
    RETURN QUERY
    SELECT 
        'school_mismatch'::TEXT,
        'Class and course belong to different schools'::TEXT,
        co.id
    FROM class_offerings co
    JOIN classes cl ON cl.id = co.class_id
    JOIN courses c ON c.id = co.course_id
    WHERE cl.school_id != c.school_id;
END;
$$;


ALTER FUNCTION "public"."validate_cross_references"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_curriculum_consistency"() RETURNS TABLE("validation_type" "text", "message" "text", "offering_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check for duplicate offerings (same class, course, term)
    RETURN QUERY
    SELECT 
        'DUPLICATE_OFFERING'::TEXT,
        'Duplicate class offering found for same class, course, and term'::TEXT,
        co1.id
    FROM public.class_offerings co1
    JOIN public.class_offerings co2 ON 
        co1.id != co2.id AND
        co1.class_id = co2.class_id AND
        co1.course_id = co2.course_id AND
        co1.term_id = co2.term_id;
    
    -- Check for missing required_hours_per_term
    RETURN QUERY
    SELECT 
        'MISSING_HOURS'::TEXT,
        'Class offering missing required_hours_per_term'::TEXT,
        co.id
    FROM public.class_offerings co
    WHERE co.required_hours_per_term IS NULL;
    
    -- Check for invalid periods_per_week
    RETURN QUERY
    SELECT 
        'INVALID_PERIODS'::TEXT,
        'Invalid periods_per_week (must be 1-20)'::TEXT,
        co.id
    FROM public.class_offerings co
    WHERE co.periods_per_week < 1 OR co.periods_per_week > 20;
END;
$$;


ALTER FUNCTION "public"."validate_curriculum_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_curriculum_hours"("p_periods_per_week" integer, "p_required_hours_per_term" integer, "p_period_duration_minutes" integer DEFAULT 50, "p_weeks_per_term" integer DEFAULT 16) RETURNS TABLE("is_valid" boolean, "expected_hours" numeric, "variance_hours" numeric, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    calculated_hours DECIMAL(6,2);
BEGIN
    -- Calculate expected hours: periods_per_week * weeks_per_term * period_duration_minutes / 60
    calculated_hours := (p_periods_per_week * p_weeks_per_term * p_period_duration_minutes) / 60.0;
    
    RETURN QUERY
    SELECT 
        ABS(calculated_hours - p_required_hours_per_term) <= 5.0 as is_valid, -- Allow 5 hour tolerance
        calculated_hours,
        calculated_hours - p_required_hours_per_term as variance_hours,
        CASE 
            WHEN ABS(calculated_hours - p_required_hours_per_term) <= 5.0 THEN 'Hours and periods are consistent'
            ELSE format('Warning: Expected %.1f hours but required %.1f hours (variance: %.1f)', 
                       calculated_hours, p_required_hours_per_term, calculated_hours - p_required_hours_per_term)
        END as message;
END;
$$;


ALTER FUNCTION "public"."validate_curriculum_hours"("p_periods_per_week" integer, "p_required_hours_per_term" integer, "p_period_duration_minutes" integer, "p_weeks_per_term" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_curriculum_hours"("p_periods_per_week" integer, "p_required_hours_per_term" integer, "p_period_duration_minutes" integer, "p_weeks_per_term" integer) IS 'Validates that periods_per_week and required_hours_per_term are consistent.
Returns validation result, expected hours, variance, and helpful message.';



CREATE OR REPLACE FUNCTION "public"."validate_holiday_dates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if holiday date falls within the academic year
    IF NOT EXISTS (
        SELECT 1 FROM public.academic_years 
        WHERE id = NEW.academic_year_id
        AND NEW.date >= start_date 
        AND NEW.date <= end_date
    ) THEN
        RAISE EXCEPTION 'Holiday date must fall within the academic year dates';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_holiday_dates"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_holiday_dates"() IS 'Validates holiday dates are within academic year';



CREATE OR REPLACE FUNCTION "public"."validate_migration_results"() RETURNS TABLE("validation_type" "text", "message" "text", "severity" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check for any remaining constraint violations
    RETURN QUERY
    SELECT 
        'constraint_violation'::TEXT as validation_type,
        'Data violates new constraints'::TEXT as message,
        'error'::TEXT as severity,
        jsonb_build_object(
            'table', 'various',
            'constraint', 'new_constraints'
        ) as details
    WHERE EXISTS (
        SELECT 1 FROM migration_issues WHERE migration_issues.severity = 'error'
    );
    
    -- Check data integrity
    RETURN QUERY
    SELECT 
        'data_integrity'::TEXT as validation_type,
        'Data integrity check passed'::TEXT as message,
        'info'::TEXT as severity,
        jsonb_build_object(
            'total_records_processed', (
                SELECT COUNT(*) FROM (
                    SELECT 1 FROM schools
                    UNION ALL SELECT 1 FROM academic_years
                    UNION ALL SELECT 1 FROM terms
                    UNION ALL SELECT 1 FROM departments
                    UNION ALL SELECT 1 FROM courses
                    UNION ALL SELECT 1 FROM classes
                    UNION ALL SELECT 1 FROM teachers
                    UNION ALL SELECT 1 FROM class_offerings
                    UNION ALL SELECT 1 FROM time_slots
                    UNION ALL SELECT 1 FROM teaching_assignments
                    UNION ALL SELECT 1 FROM holidays
                ) t
            )
        ) as details
    WHERE NOT EXISTS (
        SELECT 1 FROM migration_issues WHERE migration_issues.severity = 'error'
    );
END;
$$;


ALTER FUNCTION "public"."validate_migration_results"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_period_duration_consistency"("school_id_param" "uuid") RETURNS TABLE("validation_type" "text", "message" "text", "severity" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if time slots align with term period duration
  RETURN QUERY
  SELECT 
    'period_duration_mismatch'::TEXT as validation_type,
    'Time slot duration does not match term period duration'::TEXT as message,
    'warning'::TEXT as severity,
    jsonb_build_object(
      'term_id', t.id,
      'term_name', t.name,
      'term_period_duration', t.period_duration_minutes,
      'time_slot_id', ts.id,
      'time_slot_duration', EXTRACT(EPOCH FROM (ts.end_time::time - ts.start_time::time)) / 60,
      'day_of_week', ts.day_of_week,
      'start_time', ts.start_time,
      'end_time', ts.end_time
    ) as details
  FROM time_slots ts
  JOIN terms t ON t.academic_year_id IN (
    SELECT id FROM academic_years WHERE school_id = school_id_param
  )
  WHERE ts.school_id = school_id_param
  AND t.period_duration_minutes IS NOT NULL
  AND ABS(
    EXTRACT(EPOCH FROM (ts.end_time::time - ts.start_time::time)) / 60 - t.period_duration_minutes
  ) > 5; -- Allow 5 minute tolerance
  
  -- Check if class offerings have required hours when they should
  RETURN QUERY
  SELECT 
    'missing_required_hours'::TEXT as validation_type,
    'Class offering missing required hours per term'::TEXT as message,
    'error'::TEXT as severity,
    jsonb_build_object(
      'class_offering_id', co.id,
      'course_name', c.name,
      'class_name', cl.name,
      'term_name', t.name,
      'periods_per_week', co.periods_per_week
    ) as details
  FROM class_offerings co
  JOIN courses c ON c.id = co.course_id
  JOIN classes cl ON cl.id = co.class_id
  JOIN terms t ON t.id = co.term_id
  WHERE c.school_id = school_id_param
  AND co.required_hours_per_term IS NULL
  AND co.periods_per_week > 0;
  
  -- Check for inconsistent periods vs hours calculations
  RETURN QUERY
  SELECT 
    'inconsistent_hours_calculation'::TEXT as validation_type,
    'Periods per week and required hours are inconsistent'::TEXT as message,
    'warning'::TEXT as severity,
    jsonb_build_object(
      'class_offering_id', co.id,
      'course_name', c.name,
      'class_name', cl.name,
      'term_name', t.name,
      'periods_per_week', co.periods_per_week,
      'required_hours_per_term', co.required_hours_per_term,
      'term_period_duration', t.period_duration_minutes,
      'expected_hours', (co.periods_per_week * t.period_duration_minutes / 60.0) * 
        (EXTRACT(EPOCH FROM (t.end_date::date - t.start_date::date)) / (7 * 24 * 3600))
    ) as details
  FROM class_offerings co
  JOIN courses c ON c.id = co.course_id
  JOIN classes cl ON cl.id = co.class_id
  JOIN terms t ON t.id = co.term_id
  WHERE c.school_id = school_id_param
  AND co.required_hours_per_term IS NOT NULL
  AND t.period_duration_minutes IS NOT NULL
  AND ABS(
    co.required_hours_per_term - 
    (co.periods_per_week * t.period_duration_minutes / 60.0) * 
    (EXTRACT(EPOCH FROM (t.end_date::date - t.start_date::date)) / (7 * 24 * 3600))
  ) > 5; -- Allow 5 hour tolerance
END;
$$;


ALTER FUNCTION "public"."validate_period_duration_consistency"("school_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_period_duration_consistency"("school_id_param" "uuid") IS 'Validates consistency between time slots and term period durations';



CREATE OR REPLACE FUNCTION "public"."validate_periods_per_week"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_periods_per_week"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_scheduled_lesson_dates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if scheduled lesson date falls within the term of the teaching assignment
    IF NOT EXISTS (
        SELECT 1 FROM public.teaching_assignments ta
        JOIN public.class_offerings co ON ta.class_offering_id = co.id
        JOIN public.terms t ON co.term_id = t.id
        WHERE ta.id = NEW.teaching_assignment_id
        AND NEW.date >= t.start_date 
        AND NEW.date <= t.end_date
    ) THEN
        RAISE EXCEPTION 'Scheduled lesson date must fall within the term dates';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_scheduled_lesson_dates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_scheduled_lessons_integrity"() RETURNS TABLE("issue_type" "text", "description" "text", "record_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check for orphaned scheduled lessons
    RETURN QUERY
    SELECT 
        'orphaned_scheduled_lesson'::TEXT,
        'Scheduled lesson references non-existent class offering'::TEXT,
        sl.id
    FROM scheduled_lessons sl
    LEFT JOIN class_offerings co ON co.id = sl.class_offering_id
    WHERE co.id IS NULL;
    
    -- Check for orphaned scheduled lessons (no valid time slot)
    RETURN QUERY
    SELECT 
        'orphaned_scheduled_lesson'::TEXT,
        'Scheduled lesson references non-existent time slot'::TEXT,
        sl.id
    FROM scheduled_lessons sl
    LEFT JOIN time_slots ts ON ts.id = sl.time_slot_id
    WHERE ts.id IS NULL;
    
    -- Check for orphaned scheduled lessons (no valid room)
    RETURN QUERY
    SELECT 
        'orphaned_scheduled_lesson'::TEXT,
        'Scheduled lesson references non-existent room'::TEXT,
        sl.id
    FROM scheduled_lessons sl
    LEFT JOIN rooms r ON r.id = sl.room_id
    WHERE r.id IS NULL;
END;
$$;


ALTER FUNCTION "public"."validate_scheduled_lessons_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_schema_consistency"() RETURNS TABLE("validation_type" "text", "message" "text", "severity" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check for orphaned class offerings
    RETURN QUERY
    SELECT 
        'ORPHANED_CLASS_OFFERING'::TEXT,
        'Class offering references non-existent class'::TEXT,
        'ERROR'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM public.class_offerings co
        LEFT JOIN public.classes c ON co.class_id = c.id
        WHERE c.id IS NULL
    );
    
    -- Check for orphaned courses
    RETURN QUERY
    SELECT 
        'ORPHANED_COURSE'::TEXT,
        'Course references non-existent department'::TEXT,
        'ERROR'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM public.courses c
        LEFT JOIN public.departments d ON c.department_id = d.id
        WHERE d.id IS NULL
    );
    
    -- Check for teachers without qualifications
    RETURN QUERY
    SELECT 
        'TEACHER_WITHOUT_QUALIFICATIONS'::TEXT,
        'Teacher has no qualifications defined'::TEXT,
        'WARNING'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM public.teachers t
        LEFT JOIN public.teacher_qualifications tq ON t.id = tq.teacher_id
        WHERE tq.teacher_id IS NULL
    );
    
    -- Check for classes without offerings
    RETURN QUERY
    SELECT 
        'CLASS_WITHOUT_OFFERINGS'::TEXT,
        'Class has no offerings defined'::TEXT,
        'INFO'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM public.classes c
        LEFT JOIN public.class_offerings co ON c.id = co.class_id
        WHERE co.class_id IS NULL
    );
END;
$$;


ALTER FUNCTION "public"."validate_schema_consistency"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_schema_consistency"() IS 'This function validates the consistency of the schema.
It checks for orphaned records and missing relationships.
This helps maintain data integrity and identifies potential issues.';



CREATE OR REPLACE FUNCTION "public"."validate_teacher_workload"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    teacher_workload INTEGER;
BEGIN
    -- Calculate current teacher workload
    SELECT COALESCE(SUM(co.periods_per_week), 0)
    INTO teacher_workload
    FROM class_offerings co
    JOIN teaching_assignments ta ON co.id = ta.class_offering_id
    WHERE ta.teacher_id = NEW.teacher_id;
    
    -- Check if new assignment would exceed 40 periods per week
    IF teacher_workload > 40 THEN
        RAISE EXCEPTION 'Teacher workload would exceed 40 periods per week. Current: %, Max: 40', teacher_workload;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_teacher_workload"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_teacher_workload"() IS 'Validates teacher workload does not exceed 40 periods per week';



CREATE OR REPLACE FUNCTION "public"."validate_teacher_workload_constraints"("term_id_param" "uuid") RETURNS TABLE("teacher_id" "uuid", "teacher_name" "text", "current_periods" integer, "max_periods" integer, "available_periods" integer, "is_overloaded" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as teacher_id,
    (t.first_name || ' ' || t.last_name) as teacher_name,
    COALESCE(SUM(co.periods_per_week), 0) as current_periods,
    COALESCE(t.max_periods_per_week, 0) as max_periods,
    GREATEST(0, COALESCE(t.max_periods_per_week, 0) - COALESCE(SUM(co.periods_per_week), 0)) as available_periods,
    CASE 
      WHEN t.max_periods_per_week IS NOT NULL 
      AND SUM(co.periods_per_week) > t.max_periods_per_week 
      THEN TRUE 
      ELSE FALSE 
    END as is_overloaded
  FROM teachers t
  LEFT JOIN teaching_assignments ta ON ta.teacher_id = t.id
  LEFT JOIN class_offerings co ON co.id = ta.class_offering_id AND co.term_id = term_id_param
  WHERE t.school_id = (SELECT ay.school_id FROM terms tr JOIN academic_years ay ON ay.id = tr.academic_year_id WHERE tr.id = term_id_param)
  GROUP BY t.id, t.first_name, t.last_name, t.max_periods_per_week
  ORDER BY is_overloaded DESC, current_periods DESC;
END;
$$;


ALTER FUNCTION "public"."validate_teacher_workload_constraints"("term_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_teacher_workload_constraints"("term_id_param" "uuid") IS 'Validates teacher workload constraints for a specific term';



CREATE OR REPLACE FUNCTION "public"."validate_teaching_assignments_integrity"() RETURNS TABLE("issue_type" "text", "description" "text", "record_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check for orphaned teaching assignments
    RETURN QUERY
    SELECT 
        'orphaned_teaching_assignment'::TEXT,
        'Teaching assignment references non-existent class offering'::TEXT,
        ta.id
    FROM teaching_assignments ta
    LEFT JOIN class_offerings co ON co.id = ta.class_offering_id
    WHERE co.id IS NULL;
    
    -- Check for orphaned teaching assignments (no valid teacher)
    RETURN QUERY
    SELECT 
        'orphaned_teaching_assignment'::TEXT,
        'Teaching assignment references non-existent teacher'::TEXT,
        ta.id
    FROM teaching_assignments ta
    LEFT JOIN teachers t ON t.id = ta.teacher_id
    WHERE t.id IS NULL;
END;
$$;


ALTER FUNCTION "public"."validate_teaching_assignments_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_term_dates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if term dates fall within the academic year
    IF NOT EXISTS (
        SELECT 1 FROM public.academic_years 
        WHERE id = NEW.academic_year_id
        AND NEW.start_date >= start_date 
        AND NEW.end_date <= end_date
    ) THEN
        RAISE EXCEPTION 'Term dates must fall within the academic year dates';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_term_dates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_time_slot_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    overlapping_slots INTEGER;
BEGIN
    -- Check for overlapping time slots on the same day
    SELECT COUNT(*)
    INTO overlapping_slots
    FROM time_slots
    WHERE school_id = NEW.school_id 
    AND day_of_week = NEW.day_of_week
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
        (start_time, end_time) 
        OVERLAPS 
        (NEW.start_time, NEW.end_time)
    );
    
    IF overlapping_slots > 0 THEN
        RAISE EXCEPTION 'Time slot overlaps with existing slot on %', NEW.day_of_week;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_time_slot_consistency"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_time_slot_consistency"() IS 'Validates time slots do not overlap on the same day';



CREATE OR REPLACE FUNCTION "public"."validate_time_slot_overlap"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check for overlapping time slots within the same school and day
    IF EXISTS (
        SELECT 1 FROM public.time_slots 
        WHERE school_id = NEW.school_id 
        AND day_of_week = NEW.day_of_week
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (NEW.start_time < end_time AND NEW.end_time > start_time)
            OR (start_time < NEW.end_time AND end_time > NEW.start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Time slot overlaps with existing slot for school % on day %', NEW.school_id, NEW.day_of_week;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_time_slot_overlap"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."academic_years" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    CONSTRAINT "academic_years_date_check" CHECK (("start_date" < "end_date"))
);


ALTER TABLE "public"."academic_years" OWNER TO "postgres";


COMMENT ON CONSTRAINT "academic_years_date_check" ON "public"."academic_years" IS 'Ensures start_date is before end_date';



CREATE TABLE IF NOT EXISTS "public"."breaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "sequence" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "breaks_sequence_positive" CHECK (("sequence" > 0)),
    CONSTRAINT "breaks_time_check" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."breaks" OWNER TO "postgres";


COMMENT ON TABLE "public"."breaks" IS 'Defines breaks (recess, lunch, etc.) for schools with sequence and timing';



COMMENT ON COLUMN "public"."breaks"."name" IS 'Name of the break (e.g., Morning Recess, Lunch Break)';



COMMENT ON COLUMN "public"."breaks"."start_time" IS 'Start time of the break';



COMMENT ON COLUMN "public"."breaks"."end_time" IS 'End time of the break';



COMMENT ON COLUMN "public"."breaks"."sequence" IS 'Order of the break in the daily schedule (1 = first break)';



COMMENT ON COLUMN "public"."breaks"."is_active" IS 'Whether this break is currently active';



CREATE TABLE IF NOT EXISTS "public"."class_offerings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "periods_per_week" integer NOT NULL,
    "required_hours_per_term" integer,
    "assignment_type" "text" DEFAULT 'ai'::"text",
    CONSTRAINT "class_offerings_assignment_type_check" CHECK (("assignment_type" = ANY (ARRAY['ai'::"text", 'manual'::"text", 'ai_suggested'::"text"]))),
    CONSTRAINT "class_offerings_max_periods_check" CHECK ((("periods_per_week" >= 1) AND ("periods_per_week" <= 20))),
    CONSTRAINT "class_offerings_periods_check" CHECK (("periods_per_week" > 0)),
    CONSTRAINT "class_offerings_periods_per_week_check" CHECK ((("periods_per_week" > 0) AND ("periods_per_week" <= 50))),
    CONSTRAINT "class_offerings_periods_reasonable" CHECK ((("periods_per_week" >= 1) AND ("periods_per_week" <= 40))),
    CONSTRAINT "class_offerings_required_hours_check" CHECK ((("required_hours_per_term" IS NULL) OR ("required_hours_per_term" >= 0))),
    CONSTRAINT "class_offerings_required_hours_positive_check" CHECK ((("required_hours_per_term" IS NULL) OR ("required_hours_per_term" > 0)))
);


ALTER TABLE "public"."class_offerings" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_offerings" IS 'This table is the SINGLE SOURCE OF TRUTH for curriculum delivery.
Each row represents a definitive offering: for a given term_id, a specific class_id will be taught a specific course_id.
There is no separate mapping table - this table IS the mapping.
This replaces the redundant course_grade_class_mappings table.';



COMMENT ON COLUMN "public"."class_offerings"."term_id" IS 'References the term when this course will be taught.';



COMMENT ON COLUMN "public"."class_offerings"."class_id" IS 'References the class (e.g., Grade 9-A) that will take this course.
This column links to the classes table.';



COMMENT ON COLUMN "public"."class_offerings"."course_id" IS 'References the course that will be taught. This defines the subject and content.';



COMMENT ON COLUMN "public"."class_offerings"."periods_per_week" IS 'Number of periods per week for this course offering.
Used with required_hours_per_term to validate curriculum planning.';



COMMENT ON COLUMN "public"."class_offerings"."required_hours_per_term" IS 'Total hours required to complete this course in the term.
Should be approximately: periods_per_week × weeks_per_term × period_duration_minutes ÷ 60';



COMMENT ON CONSTRAINT "class_offerings_periods_check" ON "public"."class_offerings" IS 'Ensures periods_per_week is positive';



CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "grade_level" integer NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


COMMENT ON TABLE "public"."classes" IS 'This table represents actual classes (e.g., Grade 9-A, Grade 10-B) that students attend.
Each class belongs to a specific school and grade level. This is the single source of truth for class definitions.';



COMMENT ON COLUMN "public"."classes"."grade_level" IS 'The grade level this class belongs to (e.g., 9 for Grade 9)';



COMMENT ON COLUMN "public"."classes"."name" IS 'The name of the class (e.g., A, B, Alpha, Red Lions)';



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "grade_level" integer NOT NULL,
    "department_id" "uuid" NOT NULL,
    "total_hours_per_year" integer DEFAULT 120,
    "hours_distribution_type" "text" DEFAULT 'equal'::"text",
    "term_hours" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "courses_hours_distribution_type_check" CHECK (("hours_distribution_type" = ANY (ARRAY['equal'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON TABLE "public"."courses" IS 'This table defines the courses/subjects that can be taught.
Each course belongs to a department and has a specific grade level.
Courses are the building blocks of the curriculum.';



COMMENT ON COLUMN "public"."courses"."name" IS 'The name of the course (e.g., Advanced Mathematics, Physics)';



COMMENT ON COLUMN "public"."courses"."code" IS 'The course code (e.g., MATH101, PHY201)';



COMMENT ON COLUMN "public"."courses"."grade_level" IS 'The grade level this course is designed for';



COMMENT ON COLUMN "public"."courses"."department_id" IS 'References the department that owns this course (e.g., Mathematics, Science)';



COMMENT ON COLUMN "public"."courses"."total_hours_per_year" IS 'Total teaching hours for this course across the academic year';



COMMENT ON COLUMN "public"."courses"."hours_distribution_type" IS 'How hours are distributed across terms: equal or custom';



COMMENT ON COLUMN "public"."courses"."term_hours" IS 'JSON object with custom hours per term (e.g., {"term1": 40, "term2": 40, "term3": 40})';



CREATE OR REPLACE VIEW "public"."curriculum_structure_guide" AS
 SELECT 'Single Source of Truth'::"text" AS "concept",
    'public.class_offerings'::"text" AS "table_name",
    'Defines which courses are taught to which class sections during specific terms'::"text" AS "description"
UNION ALL
 SELECT 'Class Sections'::"text" AS "concept",
    'public.class_sections'::"text" AS "table_name",
    'Defines class sections (e.g., Grade 9-A, Grade 9-B)'::"text" AS "description"
UNION ALL
 SELECT 'Courses'::"text" AS "concept",
    'public.courses'::"text" AS "table_name",
    'Defines the actual courses/subjects that can be taught'::"text" AS "description"
UNION ALL
 SELECT 'Terms'::"text" AS "concept",
    'public.terms'::"text" AS "table_name",
    'Defines academic terms when courses are taught'::"text" AS "description"
UNION ALL
 SELECT 'Teaching Assignments'::"text" AS "concept",
    'public.teaching_assignments'::"text" AS "table_name",
    'Links teachers to class offerings (separate from class_offerings table)'::"text" AS "description"
UNION ALL
 SELECT 'Teachers'::"text" AS "concept",
    'public.teachers'::"text" AS "table_name",
    'Defines teachers who can be assigned to courses'::"text" AS "description";


ALTER VIEW "public"."curriculum_structure_guide" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "description" "text",
    "school_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


COMMENT ON TABLE "public"."departments" IS 'This table represents academic departments (e.g., Mathematics, Science, English).
Departments organize courses and teachers by subject area.';



COMMENT ON COLUMN "public"."departments"."name" IS 'The name of the department (e.g., Mathematics, Science)';



COMMENT ON COLUMN "public"."departments"."code" IS 'The department code (e.g., MATH, SCI, ENG)';



CREATE TABLE IF NOT EXISTS "public"."holidays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "reason" "text" NOT NULL,
    "academic_year_id" "uuid" NOT NULL,
    "school_id" "uuid" NOT NULL
);


ALTER TABLE "public"."holidays" OWNER TO "postgres";


COMMENT ON TABLE "public"."holidays" IS 'Holidays table with foreign key constraint to terms';



COMMENT ON COLUMN "public"."holidays"."academic_year_id" IS 'References the academic year this holiday belongs to';



COMMENT ON COLUMN "public"."holidays"."school_id" IS 'References the school this holiday belongs to';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "school_id" "uuid",
    "role" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'teacher'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles table with school_id validation for admin users';



CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "capacity" integer DEFAULT 30,
    "room_type" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "capacity_positive" CHECK (("capacity" > 0))
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_lessons" (
    "id" bigint NOT NULL,
    "teaching_assignment_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "timeslot_id" "uuid" NOT NULL
);


ALTER TABLE "public"."scheduled_lessons" OWNER TO "postgres";


COMMENT ON TABLE "public"."scheduled_lessons" IS 'Scheduled lessons with comprehensive validation';



COMMENT ON COLUMN "public"."scheduled_lessons"."id" IS 'Bigint ID - consider migration to UUID for consistency';



CREATE SEQUENCE IF NOT EXISTS "public"."scheduled_lessons_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."scheduled_lessons_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."scheduled_lessons_id_seq" OWNED BY "public"."scheduled_lessons"."id";



CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "period_duration" integer,
    "sessions_per_day" integer DEFAULT 8,
    "working_days" "text"[] DEFAULT ARRAY['monday'::"text", 'tuesday'::"text", 'wednesday'::"text", 'thursday'::"text", 'friday'::"text"],
    "max_lessons_per_day" integer DEFAULT 8,
    "min_lessons_per_day" integer DEFAULT 1,
    "max_consecutive_lessons" integer DEFAULT 2,
    "break_required" boolean DEFAULT true,
    CONSTRAINT "schools_lessons_range_check" CHECK (("max_lessons_per_day" >= "min_lessons_per_day")),
    CONSTRAINT "schools_max_consecutive_check" CHECK (("max_consecutive_lessons" >= 1)),
    CONSTRAINT "schools_max_lessons_check" CHECK (("max_lessons_per_day" >= 1)),
    CONSTRAINT "schools_min_lessons_check" CHECK (("min_lessons_per_day" >= 0)),
    CONSTRAINT "schools_period_duration_check" CHECK ((("period_duration" IS NULL) OR (("period_duration" >= 15) AND ("period_duration" <= 240)))),
    CONSTRAINT "schools_sessions_per_day_check" CHECK ((("sessions_per_day" IS NULL) OR (("sessions_per_day" >= 1) AND ("sessions_per_day" <= 20))))
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


COMMENT ON COLUMN "public"."schools"."max_lessons_per_day" IS 'Maximum number of lessons allowed per day';



COMMENT ON COLUMN "public"."schools"."min_lessons_per_day" IS 'Minimum number of lessons required per day';



COMMENT ON COLUMN "public"."schools"."max_consecutive_lessons" IS 'Maximum number of consecutive lessons allowed';



COMMENT ON COLUMN "public"."schools"."break_required" IS 'Whether a break is required between sessions';



CREATE TABLE IF NOT EXISTS "public"."subject_grade_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "grade_level" integer NOT NULL,
    "is_required" boolean DEFAULT true,
    "periods_per_week" integer DEFAULT 5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "department_id" "uuid" NOT NULL,
    CONSTRAINT "subject_grade_mappings_grade_level_check" CHECK ((("grade_level" >= 1) AND ("grade_level" <= 12))),
    CONSTRAINT "subject_grade_mappings_periods_check" CHECK (("periods_per_week" > 0))
);


ALTER TABLE "public"."subject_grade_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."subject_grade_mappings" IS 'Maps subjects to grades for curriculum planning only. Actual delivery is defined in class_offerings.';



COMMENT ON COLUMN "public"."subject_grade_mappings"."grade_level" IS 'The grade level that requires this subject';



COMMENT ON COLUMN "public"."subject_grade_mappings"."is_required" IS 'Whether this subject is required for this grade level';



COMMENT ON COLUMN "public"."subject_grade_mappings"."periods_per_week" IS 'Default number of periods per week for this subject at this grade level';



COMMENT ON COLUMN "public"."subject_grade_mappings"."department_id" IS 'References the department required for this grade level';



CREATE TABLE IF NOT EXISTS "public"."teacher_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teacher_departments" OWNER TO "postgres";


COMMENT ON TABLE "public"."teacher_departments" IS 'Maps teachers to departments. Teachers can be assigned to multiple departments, with one marked as primary.';



COMMENT ON COLUMN "public"."teacher_departments"."teacher_id" IS 'References the teacher';



COMMENT ON COLUMN "public"."teacher_departments"."department_id" IS 'References the department';



COMMENT ON COLUMN "public"."teacher_departments"."is_primary" IS 'Indicates if this is the teacher''s primary department';



CREATE TABLE IF NOT EXISTS "public"."teacher_time_constraints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "time_slot_id" "uuid" NOT NULL,
    "constraint_type" "text" NOT NULL,
    "reason" "text",
    "priority" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "teacher_time_constraints_constraint_type_check" CHECK (("constraint_type" = ANY (ARRAY['unavailable'::"text", 'prefers'::"text", 'avoid'::"text"]))),
    CONSTRAINT "teacher_time_constraints_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5)))
);


ALTER TABLE "public"."teacher_time_constraints" OWNER TO "postgres";


COMMENT ON TABLE "public"."teacher_time_constraints" IS 'Defines time-based constraints for teachers (unavailable, preferred, avoid, etc).';



COMMENT ON COLUMN "public"."teacher_time_constraints"."constraint_type" IS 'unavailable = hard rule (teacher cannot teach at this time)
prefers = soft preference (teacher prefers this time slot)
avoid = soft preference (teacher wants to avoid this time slot)';



COMMENT ON COLUMN "public"."teacher_time_constraints"."priority" IS 'Priority level for soft constraints (1-5, where 5 is highest priority)';



CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "max_periods_per_week" integer
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


COMMENT ON TABLE "public"."teachers" IS 'This table represents teachers who can be assigned to courses.
Each teacher belongs to a school and has qualifications and constraints.';



COMMENT ON COLUMN "public"."teachers"."first_name" IS 'Teacher''s first name';



COMMENT ON COLUMN "public"."teachers"."last_name" IS 'Teacher''s last name';



COMMENT ON COLUMN "public"."teachers"."max_periods_per_week" IS 'Maximum number of periods this teacher can teach per week';



CREATE TABLE IF NOT EXISTS "public"."teaching_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_offering_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "school_id" "uuid" NOT NULL,
    "assignment_type" "text" DEFAULT 'manual'::"text",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "teaching_assignments_assignment_type_check" CHECK (("assignment_type" = ANY (ARRAY['manual'::"text", 'ai'::"text"])))
);


ALTER TABLE "public"."teaching_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."teaching_assignments" IS 'Links teachers to class offerings. Assignment_type can be manual or ai.';



COMMENT ON COLUMN "public"."teaching_assignments"."class_offering_id" IS 'References the class offering (from class_offerings table)';



COMMENT ON COLUMN "public"."teaching_assignments"."teacher_id" IS 'References the teacher assigned to this offering';



COMMENT ON COLUMN "public"."teaching_assignments"."school_id" IS 'References the school this assignment belongs to for easier filtering and RLS';



COMMENT ON COLUMN "public"."teaching_assignments"."assignment_type" IS 'Type of assignment: manual or ai';



COMMENT ON COLUMN "public"."teaching_assignments"."assigned_at" IS 'Timestamp when the assignment was created';



CREATE TABLE IF NOT EXISTS "public"."terms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "academic_year_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "period_duration_minutes" integer DEFAULT 50,
    CONSTRAINT "terms_date_check" CHECK (("start_date" < "end_date")),
    CONSTRAINT "terms_period_duration_check" CHECK ((("period_duration_minutes" IS NULL) OR (("period_duration_minutes" >= 30) AND ("period_duration_minutes" <= 120))))
);


ALTER TABLE "public"."terms" OWNER TO "postgres";


COMMENT ON COLUMN "public"."terms"."period_duration_minutes" IS 'Duration of each period in minutes. Used to calculate hours from periods.
Default: 50 minutes. Range: 30-120 minutes.';



COMMENT ON CONSTRAINT "terms_date_check" ON "public"."terms" IS 'Ensures start_date is before end_date';



CREATE TABLE IF NOT EXISTS "public"."time_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "period_number" integer,
    "is_teaching_period" boolean DEFAULT true,
    "slot_name" "text",
    CONSTRAINT "time_slots_day_of_week_check" CHECK ((("day_of_week" >= 1) AND ("day_of_week" <= 7))),
    CONSTRAINT "time_slots_duration_check" CHECK ((((EXTRACT(epoch FROM ("end_time" - "start_time")) / (60)::numeric) >= (15)::numeric) AND ((EXTRACT(epoch FROM ("end_time" - "start_time")) / (60)::numeric) <= (240)::numeric))),
    CONSTRAINT "time_slots_end_after_start" CHECK (("end_time" > "start_time")),
    CONSTRAINT "time_slots_time_check" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."time_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."time_slots" IS 'Time slots table with foreign key constraint to schools and overlap prevention';



COMMENT ON CONSTRAINT "time_slots_time_check" ON "public"."time_slots" IS 'Ensures start_time is before end_time';



CREATE TABLE IF NOT EXISTS "public"."timetable_generations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term_id" "uuid" NOT NULL,
    "generated_by" "uuid",
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."timetable_status" DEFAULT 'draft'::"public"."timetable_status" NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."timetable_generations" OWNER TO "postgres";


COMMENT ON TABLE "public"."timetable_generations" IS 'Timetable generations table with foreign key constraint to terms';



ALTER TABLE ONLY "public"."scheduled_lessons" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."scheduled_lessons_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_school_dates_unique" UNIQUE ("school_id", "start_date", "end_date");



COMMENT ON CONSTRAINT "academic_years_school_dates_unique" ON "public"."academic_years" IS 'Prevents overlapping academic year periods within a school';



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_school_name_unique" UNIQUE ("school_id", "name");



COMMENT ON CONSTRAINT "academic_years_school_name_unique" ON "public"."academic_years" IS 'Prevents duplicate academic year names within a school';



ALTER TABLE ONLY "public"."breaks"
    ADD CONSTRAINT "breaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."breaks"
    ADD CONSTRAINT "breaks_school_sequence_unique" UNIQUE ("school_id", "sequence");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_term_class_course_unique" UNIQUE ("term_id", "class_id", "course_id");



COMMENT ON CONSTRAINT "class_offerings_term_class_course_unique" ON "public"."class_offerings" IS 'Prevents duplicate course offerings per class per term';



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_school_grade_name_unique" UNIQUE ("school_id", "grade_level", "name");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_school_grade_name_unique" UNIQUE ("school_id", "grade_level", "name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_school_name_unique" UNIQUE ("school_id", "name");



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_school_academic_year_date_unique" UNIQUE ("school_id", "academic_year_id", "date");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_school_name_unique" UNIQUE ("school_id", "name");



ALTER TABLE ONLY "public"."scheduled_lessons"
    ADD CONSTRAINT "scheduled_lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_grade_mappings"
    ADD CONSTRAINT "subject_grade_mappings_department_grade_unique" UNIQUE ("department_id", "grade_level");



ALTER TABLE ONLY "public"."subject_grade_mappings"
    ADD CONSTRAINT "subject_grade_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_departments"
    ADD CONSTRAINT "teacher_departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_departments"
    ADD CONSTRAINT "teacher_departments_teacher_department_unique" UNIQUE ("teacher_id", "department_id");



ALTER TABLE ONLY "public"."teacher_time_constraints"
    ADD CONSTRAINT "teacher_time_constraints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_time_constraints"
    ADD CONSTRAINT "teacher_time_constraints_unique" UNIQUE ("teacher_id", "time_slot_id", "constraint_type");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_school_name_unique" UNIQUE ("school_id", "first_name", "last_name");



ALTER TABLE ONLY "public"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_class_offering_teacher_unique" UNIQUE ("class_offering_id", "teacher_id");



COMMENT ON CONSTRAINT "teaching_assignments_class_offering_teacher_unique" ON "public"."teaching_assignments" IS 'One teacher per class offering (MVP assumption)';



ALTER TABLE ONLY "public"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_academic_year_dates_unique" UNIQUE ("academic_year_id", "start_date", "end_date");



COMMENT ON CONSTRAINT "terms_academic_year_dates_unique" ON "public"."terms" IS 'Prevents overlapping term periods within an academic year';



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_academic_year_name_unique" UNIQUE ("academic_year_id", "name");



COMMENT ON CONSTRAINT "terms_academic_year_name_unique" ON "public"."terms" IS 'Prevents duplicate term names within an academic year';



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_school_day_period_unique" UNIQUE ("school_id", "day_of_week", "period_number");



COMMENT ON CONSTRAINT "time_slots_school_day_period_unique" ON "public"."time_slots" IS 'Ensures unique period numbers per day for scheduling';



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_school_day_time_unique" UNIQUE ("school_id", "day_of_week", "start_time", "end_time");



COMMENT ON CONSTRAINT "time_slots_school_day_time_unique" ON "public"."time_slots" IS 'Prevents ambiguous time periods for scheduling';



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_school_id_day_of_week_start_time_key" UNIQUE ("school_id", "day_of_week", "start_time");



ALTER TABLE ONLY "public"."timetable_generations"
    ADD CONSTRAINT "timetable_generations_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_academic_years_school" ON "public"."academic_years" USING "btree" ("school_id");



CREATE INDEX "idx_breaks_school_active" ON "public"."breaks" USING "btree" ("school_id", "is_active");



CREATE INDEX "idx_breaks_sequence" ON "public"."breaks" USING "btree" ("school_id", "sequence");



CREATE INDEX "idx_class_offerings_class_term" ON "public"."class_offerings" USING "btree" ("class_id", "term_id");



CREATE INDEX "idx_class_offerings_course_term" ON "public"."class_offerings" USING "btree" ("course_id", "term_id");



CREATE INDEX "idx_class_offerings_required_hours" ON "public"."class_offerings" USING "btree" ("required_hours_per_term") WHERE ("required_hours_per_term" IS NOT NULL);



CREATE INDEX "idx_class_offerings_term_class" ON "public"."class_offerings" USING "btree" ("term_id", "class_id");



CREATE INDEX "idx_class_offerings_term_course" ON "public"."class_offerings" USING "btree" ("term_id", "course_id");



CREATE INDEX "idx_classes_school_grade" ON "public"."classes" USING "btree" ("school_id", "grade_level");



CREATE INDEX "idx_classes_school_id" ON "public"."classes" USING "btree" ("school_id");



CREATE INDEX "idx_courses_department_id" ON "public"."courses" USING "btree" ("department_id");



CREATE INDEX "idx_courses_total_hours" ON "public"."courses" USING "btree" ("total_hours_per_year");



CREATE INDEX "idx_holidays_academic_year" ON "public"."holidays" USING "btree" ("academic_year_id");



CREATE INDEX "idx_holidays_date" ON "public"."holidays" USING "btree" ("date");



CREATE INDEX "idx_holidays_school" ON "public"."holidays" USING "btree" ("school_id");



CREATE INDEX "idx_holidays_school_academic_year" ON "public"."holidays" USING "btree" ("school_id", "academic_year_id");



CREATE INDEX "idx_rooms_school_id" ON "public"."rooms" USING "btree" ("school_id");



CREATE INDEX "idx_scheduled_lessons_date_timeslot" ON "public"."scheduled_lessons" USING "btree" ("date", "timeslot_id");



CREATE INDEX "idx_scheduled_lessons_teaching_assignment" ON "public"."scheduled_lessons" USING "btree" ("teaching_assignment_id");



CREATE INDEX "idx_scheduled_lessons_teaching_assignment_date" ON "public"."scheduled_lessons" USING "btree" ("teaching_assignment_id", "date");



CREATE INDEX "idx_subject_grade_mappings_department" ON "public"."subject_grade_mappings" USING "btree" ("department_id");



CREATE INDEX "idx_subject_grade_mappings_department_id" ON "public"."subject_grade_mappings" USING "btree" ("department_id");



CREATE INDEX "idx_subject_grade_mappings_grade" ON "public"."subject_grade_mappings" USING "btree" ("grade_level");



CREATE INDEX "idx_teacher_constraints_type" ON "public"."teacher_time_constraints" USING "btree" ("teacher_id", "constraint_type");



CREATE INDEX "idx_teacher_departments_department_id" ON "public"."teacher_departments" USING "btree" ("department_id");



CREATE INDEX "idx_teacher_departments_is_primary" ON "public"."teacher_departments" USING "btree" ("is_primary");



CREATE INDEX "idx_teacher_departments_teacher_id" ON "public"."teacher_departments" USING "btree" ("teacher_id");



CREATE INDEX "idx_teacher_time_constraints_teacher" ON "public"."teacher_time_constraints" USING "btree" ("teacher_id");



CREATE INDEX "idx_teacher_time_constraints_time_slot" ON "public"."teacher_time_constraints" USING "btree" ("time_slot_id");



CREATE INDEX "idx_teacher_time_constraints_type" ON "public"."teacher_time_constraints" USING "btree" ("constraint_type");



CREATE INDEX "idx_teaching_assignments_class_offering" ON "public"."teaching_assignments" USING "btree" ("class_offering_id");



CREATE INDEX "idx_teaching_assignments_school_id" ON "public"."teaching_assignments" USING "btree" ("school_id");



CREATE INDEX "idx_teaching_assignments_teacher_school" ON "public"."teaching_assignments" USING "btree" ("teacher_id", "school_id");



CREATE INDEX "idx_teaching_assignments_teacher_workload" ON "public"."teaching_assignments" USING "btree" ("teacher_id", "class_offering_id");



CREATE INDEX "idx_terms_academic_year" ON "public"."terms" USING "btree" ("academic_year_id");



CREATE INDEX "idx_terms_academic_year_dates" ON "public"."terms" USING "btree" ("academic_year_id", "start_date", "end_date");



CREATE INDEX "idx_time_slots_school_day" ON "public"."time_slots" USING "btree" ("school_id", "day_of_week");



CREATE INDEX "idx_time_slots_school_day_time" ON "public"."time_slots" USING "btree" ("school_id", "day_of_week", "start_time");



CREATE INDEX "idx_time_slots_school_id" ON "public"."time_slots" USING "btree" ("school_id");



CREATE OR REPLACE TRIGGER "auto_calculate_required_hours" BEFORE INSERT OR UPDATE ON "public"."class_offerings" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_required_hours_per_term"();



CREATE OR REPLACE TRIGGER "ensure_curriculum_consistency_trigger" BEFORE INSERT OR UPDATE ON "public"."class_offerings" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_curriculum_consistency"();



CREATE OR REPLACE TRIGGER "trigger_check_time_slot_overlap" BEFORE INSERT OR UPDATE ON "public"."time_slots" FOR EACH ROW EXECUTE FUNCTION "public"."check_time_slot_overlap"();



CREATE OR REPLACE TRIGGER "trigger_set_teaching_assignment_school_id" BEFORE INSERT OR UPDATE ON "public"."teaching_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_teaching_assignment_school_id"();



CREATE OR REPLACE TRIGGER "trigger_validate_academic_calendar_consistency" BEFORE INSERT OR UPDATE ON "public"."terms" FOR EACH ROW EXECUTE FUNCTION "public"."validate_academic_calendar_consistency"();



CREATE OR REPLACE TRIGGER "trigger_validate_admin_school_id" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_admin_school_id"();



CREATE OR REPLACE TRIGGER "trigger_validate_break_timing" BEFORE INSERT OR UPDATE ON "public"."breaks" FOR EACH ROW EXECUTE FUNCTION "public"."validate_break_timing"();



CREATE OR REPLACE TRIGGER "trigger_validate_class_offering_requirements" BEFORE INSERT OR UPDATE ON "public"."class_offerings" FOR EACH ROW EXECUTE FUNCTION "public"."validate_class_offering_requirements"();



CREATE OR REPLACE TRIGGER "trigger_validate_holiday_dates" BEFORE INSERT OR UPDATE ON "public"."holidays" FOR EACH ROW EXECUTE FUNCTION "public"."validate_holiday_dates"();



CREATE OR REPLACE TRIGGER "trigger_validate_periods_per_week" BEFORE INSERT OR UPDATE ON "public"."class_offerings" FOR EACH ROW EXECUTE FUNCTION "public"."validate_periods_per_week"();



CREATE OR REPLACE TRIGGER "trigger_validate_scheduled_lesson_dates" BEFORE INSERT OR UPDATE ON "public"."scheduled_lessons" FOR EACH ROW EXECUTE FUNCTION "public"."validate_scheduled_lesson_dates"();



CREATE OR REPLACE TRIGGER "trigger_validate_teacher_workload" BEFORE INSERT OR UPDATE ON "public"."teaching_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."validate_teacher_workload"();



CREATE OR REPLACE TRIGGER "trigger_validate_term_dates" BEFORE INSERT OR UPDATE ON "public"."terms" FOR EACH ROW EXECUTE FUNCTION "public"."validate_term_dates"();



CREATE OR REPLACE TRIGGER "trigger_validate_time_slot_consistency" BEFORE INSERT OR UPDATE ON "public"."time_slots" FOR EACH ROW EXECUTE FUNCTION "public"."validate_time_slot_consistency"();



CREATE OR REPLACE TRIGGER "trigger_validate_time_slot_overlap" BEFORE INSERT OR UPDATE ON "public"."time_slots" FOR EACH ROW EXECUTE FUNCTION "public"."validate_time_slot_overlap"();



CREATE OR REPLACE TRIGGER "update_classes_updated_at" BEFORE UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subject_grade_mappings_modtime" BEFORE UPDATE ON "public"."subject_grade_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_teacher_departments_updated_at" BEFORE UPDATE ON "public"."teacher_departments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."breaks"
    ADD CONSTRAINT "breaks_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_lessons"
    ADD CONSTRAINT "scheduled_lessons_teaching_assignment_id_fkey" FOREIGN KEY ("teaching_assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_lessons"
    ADD CONSTRAINT "scheduled_lessons_timeslot_id_fkey" FOREIGN KEY ("timeslot_id") REFERENCES "public"."time_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."subject_grade_mappings"
    ADD CONSTRAINT "subject_grade_mappings_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_departments"
    ADD CONSTRAINT "teacher_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_departments"
    ADD CONSTRAINT "teacher_departments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_time_constraints"
    ADD CONSTRAINT "teacher_time_constraints_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_time_constraints"
    ADD CONSTRAINT "teacher_time_constraints_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "public"."time_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_class_offering_id_fkey" FOREIGN KEY ("class_offering_id") REFERENCES "public"."class_offerings"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "teaching_assignments_class_offering_id_fkey" ON "public"."teaching_assignments" IS 'When a class offering is deleted, all its teaching assignments are automatically deleted.
This ensures no orphaned assignments exist when offerings are removed.';



ALTER TABLE ONLY "public"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id");



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id");



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetable_generations"
    ADD CONSTRAINT "timetable_generations_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."timetable_generations"
    ADD CONSTRAINT "timetable_generations_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage breaks in their school" ON "public"."breaks" USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage classes in their school" ON "public"."classes" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."school_id" = "classes"."school_id") AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage departments in their school" ON "public"."departments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."school_id" = "departments"."school_id") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage teacher departments in their school" ON "public"."teacher_departments" USING ((EXISTS ( SELECT 1
   FROM ("public"."teachers" "t"
     JOIN "public"."departments" "d" ON (("d"."id" = "teacher_departments"."department_id")))
  WHERE (("t"."id" = "teacher_departments"."teacher_id") AND ("t"."school_id" = "d"."school_id") AND ("d"."school_id" IN ( SELECT "profiles"."school_id"
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))))));



CREATE POLICY "Allow profile creation during onboarding" ON "public"."profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow trigger to create profiles" ON "public"."profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "Authenticated users can manage class offerings" ON "public"."class_offerings" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can create academic years for their school" ON "public"."academic_years" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create class offerings for their school" ON "public"."class_offerings" FOR INSERT WITH CHECK (("course_id" IN ( SELECT "c"."id"
   FROM ("public"."courses" "c"
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create classes for their school" ON "public"."classes" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create courses for their school" ON "public"."courses" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create departments for their school" ON "public"."departments" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create holidays for their school" ON "public"."holidays" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Users can create own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can create rooms for their school" ON "public"."rooms" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create scheduled lessons for their school" ON "public"."scheduled_lessons" FOR INSERT WITH CHECK (("teaching_assignment_id" IN ( SELECT "ta"."id"
   FROM ((("public"."teaching_assignments" "ta"
     JOIN "public"."class_offerings" "co" ON (("ta"."class_offering_id" = "co"."id")))
     JOIN "public"."courses" "c" ON (("co"."course_id" = "c"."id")))
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create schools" ON "public"."schools" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create subject grade mappings for their school" ON "public"."subject_grade_mappings" FOR INSERT WITH CHECK (("department_id" IN ( SELECT "d"."id"
   FROM ("public"."departments" "d"
     JOIN "public"."profiles" "p" ON (("d"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create teacher departments for their school" ON "public"."teacher_departments" FOR INSERT WITH CHECK (("department_id" IN ( SELECT "d"."id"
   FROM ("public"."departments" "d"
     JOIN "public"."profiles" "p" ON (("d"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create teacher time constraints for their school" ON "public"."teacher_time_constraints" FOR INSERT WITH CHECK (("teacher_id" IN ( SELECT "t"."id"
   FROM ("public"."teachers" "t"
     JOIN "public"."profiles" "p" ON (("t"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create teachers for their school" ON "public"."teachers" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create teaching assignments for their school" ON "public"."teaching_assignments" FOR INSERT WITH CHECK (("class_offering_id" IN ( SELECT "co"."id"
   FROM (("public"."class_offerings" "co"
     JOIN "public"."courses" "c" ON (("co"."course_id" = "c"."id")))
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create terms for their school" ON "public"."terms" FOR INSERT WITH CHECK (("academic_year_id" IN ( SELECT "ay"."id"
   FROM ("public"."academic_years" "ay"
     JOIN "public"."profiles" "p" ON (("ay"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can create time slots for their school" ON "public"."time_slots" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create timetable generations for their school" ON "public"."timetable_generations" FOR INSERT WITH CHECK (("term_id" IN ( SELECT "t"."id"
   FROM (("public"."terms" "t"
     JOIN "public"."academic_years" "ay" ON (("t"."academic_year_id" = "ay"."id")))
     JOIN "public"."profiles" "p" ON (("ay"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete academic years for their school" ON "public"."academic_years" FOR DELETE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete class offerings for their school" ON "public"."class_offerings" FOR DELETE USING (("course_id" IN ( SELECT "c"."id"
   FROM ("public"."courses" "c"
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete classes for their school" ON "public"."classes" FOR DELETE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete courses for their school" ON "public"."courses" FOR DELETE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete departments for their school" ON "public"."departments" FOR DELETE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete holidays for their school" ON "public"."holidays" FOR DELETE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Users can delete own profile" ON "public"."profiles" FOR DELETE USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can delete rooms for their school" ON "public"."rooms" FOR DELETE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete scheduled lessons for their school" ON "public"."scheduled_lessons" FOR DELETE USING (("teaching_assignment_id" IN ( SELECT "ta"."id"
   FROM ((("public"."teaching_assignments" "ta"
     JOIN "public"."class_offerings" "co" ON (("ta"."class_offering_id" = "co"."id")))
     JOIN "public"."courses" "c" ON (("co"."course_id" = "c"."id")))
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete subject grade mappings for their school" ON "public"."subject_grade_mappings" FOR DELETE USING (("department_id" IN ( SELECT "d"."id"
   FROM ("public"."departments" "d"
     JOIN "public"."profiles" "p" ON (("d"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete teacher departments for their school" ON "public"."teacher_departments" FOR DELETE USING (("department_id" IN ( SELECT "d"."id"
   FROM ("public"."departments" "d"
     JOIN "public"."profiles" "p" ON (("d"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete teacher time constraints for their school" ON "public"."teacher_time_constraints" FOR DELETE USING (("teacher_id" IN ( SELECT "t"."id"
   FROM ("public"."teachers" "t"
     JOIN "public"."profiles" "p" ON (("t"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete teachers for their school" ON "public"."teachers" FOR DELETE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete teaching assignments for their school" ON "public"."teaching_assignments" FOR DELETE USING (("class_offering_id" IN ( SELECT "co"."id"
   FROM (("public"."class_offerings" "co"
     JOIN "public"."courses" "c" ON (("co"."course_id" = "c"."id")))
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete terms for their school" ON "public"."terms" FOR DELETE USING (("academic_year_id" IN ( SELECT "ay"."id"
   FROM ("public"."academic_years" "ay"
     JOIN "public"."profiles" "p" ON (("ay"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their schools" ON "public"."schools" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete time slots for their school" ON "public"."time_slots" FOR DELETE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete timetable generations for their school" ON "public"."timetable_generations" FOR DELETE USING (("term_id" IN ( SELECT "t"."id"
   FROM (("public"."terms" "t"
     JOIN "public"."academic_years" "ay" ON (("t"."academic_year_id" = "ay"."id")))
     JOIN "public"."profiles" "p" ON (("ay"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their school" ON "public"."schools" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage academic years for their school" ON "public"."academic_years" USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "academic_years"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage rooms for their school" ON "public"."rooms" USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "rooms"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage teachers for their school" ON "public"."teachers" USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "teachers"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage terms for their school" ON "public"."terms" USING ((EXISTS ( SELECT 1
   FROM ("public"."academic_years"
     JOIN "public"."schools" ON (("schools"."id" = "academic_years"."school_id")))
  WHERE (("academic_years"."id" = "terms"."academic_year_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update academic years for their school" ON "public"."academic_years" FOR UPDATE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update class offerings for their school" ON "public"."class_offerings" FOR UPDATE USING (("course_id" IN ( SELECT "c"."id"
   FROM ("public"."courses" "c"
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update classes for their school" ON "public"."classes" FOR UPDATE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update courses for their school" ON "public"."courses" FOR UPDATE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update departments for their school" ON "public"."departments" FOR UPDATE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update holidays for their school" ON "public"."holidays" FOR UPDATE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update rooms for their school" ON "public"."rooms" FOR UPDATE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update scheduled lessons for their school" ON "public"."scheduled_lessons" FOR UPDATE USING (("teaching_assignment_id" IN ( SELECT "ta"."id"
   FROM ((("public"."teaching_assignments" "ta"
     JOIN "public"."class_offerings" "co" ON (("ta"."class_offering_id" = "co"."id")))
     JOIN "public"."courses" "c" ON (("co"."course_id" = "c"."id")))
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update subject grade mappings for their school" ON "public"."subject_grade_mappings" FOR UPDATE USING (("department_id" IN ( SELECT "d"."id"
   FROM ("public"."departments" "d"
     JOIN "public"."profiles" "p" ON (("d"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update teacher departments for their school" ON "public"."teacher_departments" FOR UPDATE USING (("department_id" IN ( SELECT "d"."id"
   FROM ("public"."departments" "d"
     JOIN "public"."profiles" "p" ON (("d"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update teacher time constraints for their school" ON "public"."teacher_time_constraints" FOR UPDATE USING (("teacher_id" IN ( SELECT "t"."id"
   FROM ("public"."teachers" "t"
     JOIN "public"."profiles" "p" ON (("t"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update teachers for their school" ON "public"."teachers" FOR UPDATE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update teaching assignments for their school" ON "public"."teaching_assignments" FOR UPDATE USING (("class_offering_id" IN ( SELECT "co"."id"
   FROM (("public"."class_offerings" "co"
     JOIN "public"."courses" "c" ON (("co"."course_id" = "c"."id")))
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update terms for their school" ON "public"."terms" FOR UPDATE USING (("academic_year_id" IN ( SELECT "ay"."id"
   FROM ("public"."academic_years" "ay"
     JOIN "public"."profiles" "p" ON (("ay"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their school" ON "public"."schools" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their schools" ON "public"."schools" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update time slots for their school" ON "public"."time_slots" FOR UPDATE USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update timetable generations for their school" ON "public"."timetable_generations" FOR UPDATE USING (("term_id" IN ( SELECT "t"."id"
   FROM (("public"."terms" "t"
     JOIN "public"."academic_years" "ay" ON (("t"."academic_year_id" = "ay"."id")))
     JOIN "public"."profiles" "p" ON (("ay"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view academic years for their school" ON "public"."academic_years" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view breaks in their school" ON "public"."breaks" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view class offerings for their school" ON "public"."class_offerings" FOR SELECT USING (("course_id" IN ( SELECT "c"."id"
   FROM ("public"."courses" "c"
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view classes for their school" ON "public"."classes" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view classes in their school" ON "public"."classes" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view courses for their school" ON "public"."courses" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view departments for their school" ON "public"."departments" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view holidays for their school" ON "public"."holidays" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view rooms for their school" ON "public"."rooms" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view scheduled lessons for their school" ON "public"."scheduled_lessons" FOR SELECT USING (("teaching_assignment_id" IN ( SELECT "ta"."id"
   FROM ((("public"."teaching_assignments" "ta"
     JOIN "public"."class_offerings" "co" ON (("ta"."class_offering_id" = "co"."id")))
     JOIN "public"."courses" "c" ON (("co"."course_id" = "c"."id")))
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view subject grade mappings for their school" ON "public"."subject_grade_mappings" FOR SELECT USING (("department_id" IN ( SELECT "d"."id"
   FROM ("public"."departments" "d"
     JOIN "public"."profiles" "p" ON (("d"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view teacher departments for their school" ON "public"."teacher_departments" FOR SELECT USING (("department_id" IN ( SELECT "d"."id"
   FROM ("public"."departments" "d"
     JOIN "public"."profiles" "p" ON (("d"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view teacher departments in their school" ON "public"."teacher_departments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."teachers" "t"
     JOIN "public"."departments" "d" ON (("d"."id" = "teacher_departments"."department_id")))
  WHERE (("t"."id" = "teacher_departments"."teacher_id") AND ("t"."school_id" = "d"."school_id") AND ("d"."school_id" IN ( SELECT "profiles"."school_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can view teacher time constraints for their school" ON "public"."teacher_time_constraints" FOR SELECT USING (("teacher_id" IN ( SELECT "t"."id"
   FROM ("public"."teachers" "t"
     JOIN "public"."profiles" "p" ON (("t"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view teachers for their school" ON "public"."teachers" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view teaching assignments for their school" ON "public"."teaching_assignments" FOR SELECT USING (("class_offering_id" IN ( SELECT "co"."id"
   FROM (("public"."class_offerings" "co"
     JOIN "public"."courses" "c" ON (("co"."course_id" = "c"."id")))
     JOIN "public"."profiles" "p" ON (("c"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view terms for their school" ON "public"."terms" FOR SELECT USING (("academic_year_id" IN ( SELECT "ay"."id"
   FROM ("public"."academic_years" "ay"
     JOIN "public"."profiles" "p" ON (("ay"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their school" ON "public"."schools" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their schools" ON "public"."schools" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view time slots for their school" ON "public"."time_slots" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view timetable generations for their school" ON "public"."timetable_generations" FOR SELECT USING (("term_id" IN ( SELECT "t"."id"
   FROM (("public"."terms" "t"
     JOIN "public"."academic_years" "ay" ON (("t"."academic_year_id" = "ay"."id")))
     JOIN "public"."profiles" "p" ON (("ay"."school_id" = "p"."school_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



ALTER TABLE "public"."academic_years" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."breaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_offerings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."holidays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subject_grade_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_time_constraints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teaching_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."terms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."timetable_generations" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";













































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."calculate_required_hours_per_term"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_required_hours_per_term"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_required_hours_per_term"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_time_slot_overlap"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_time_slot_overlap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_time_slot_overlap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_admin_profile_with_school"("p_user_id" "uuid", "p_school_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_admin_profile_with_school"("p_user_id" "uuid", "p_school_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_admin_profile_with_school"("p_user_id" "uuid", "p_school_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_class_section"("p_school_id" "uuid", "p_grade_level" integer, "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_class_section"("p_school_id" "uuid", "p_grade_level" integer, "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_class_section"("p_school_id" "uuid", "p_grade_level" integer, "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_class_safely"("class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_class_safely"("class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_class_safely"("class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_curriculum_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_curriculum_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_curriculum_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."explain_class_structure"() TO "anon";
GRANT ALL ON FUNCTION "public"."explain_class_structure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."explain_class_structure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."explain_curriculum_structure"() TO "anon";
GRANT ALL ON FUNCTION "public"."explain_curriculum_structure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."explain_curriculum_structure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_teaching_time"("term_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_teaching_time"("term_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_teaching_time"("term_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_section_curriculum_summary"("p_class_id" "uuid", "p_term_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_section_curriculum_summary"("p_class_id" "uuid", "p_term_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_section_curriculum_summary"("p_class_id" "uuid", "p_term_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_curriculum_consistency_report"("p_school_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_curriculum_consistency_report"("p_school_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_curriculum_consistency_report"("p_school_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_schema_overview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_schema_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_schema_overview"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_school_breaks"("p_school_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_school_breaks"("p_school_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_school_breaks"("p_school_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_department_summary"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_department_summary"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_department_summary"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_qualifications"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_qualifications"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_qualifications"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teachers_for_course"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teachers_for_course"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teachers_for_course"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_class_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_class_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_class_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_migration_issue"("p_table_name" "text", "p_issue_type" "text", "p_issue_description" "text", "p_record_id" "uuid", "p_field_name" "text", "p_current_value" "text", "p_suggested_fix" "text", "p_severity" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_migration_issue"("p_table_name" "text", "p_issue_type" "text", "p_issue_description" "text", "p_record_id" "uuid", "p_field_name" "text", "p_current_value" "text", "p_suggested_fix" "text", "p_severity" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_migration_issue"("p_table_name" "text", "p_issue_type" "text", "p_issue_description" "text", "p_record_id" "uuid", "p_field_name" "text", "p_current_value" "text", "p_suggested_fix" "text", "p_severity" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."my_function_name"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."my_function_name"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_function_name"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prepare_timetable_data"("school_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."prepare_timetable_data"("school_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."prepare_timetable_data"("school_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."preview_class_deletion"("class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."preview_class_deletion"("class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_class_deletion"("class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_holiday_school_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_holiday_school_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_holiday_school_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_teaching_assignment_school_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_teaching_assignment_school_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_teaching_assignment_school_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_term_school_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_term_school_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_term_school_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_academic_calendar_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_academic_calendar_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_academic_calendar_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_admin_school_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_admin_school_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_admin_school_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_all_data_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_all_data_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_all_data_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_break_timing"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_break_timing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_break_timing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_class_offering_requirements"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_class_offering_requirements"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_class_offering_requirements"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_class_offering_school_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_class_offering_school_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_class_offering_school_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_class_offerings_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_class_offerings_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_class_offerings_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_course_hours_distribution"("course_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_course_hours_distribution"("course_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_course_hours_distribution"("course_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_cross_references"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_cross_references"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_cross_references"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_curriculum_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_curriculum_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_curriculum_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_curriculum_hours"("p_periods_per_week" integer, "p_required_hours_per_term" integer, "p_period_duration_minutes" integer, "p_weeks_per_term" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_curriculum_hours"("p_periods_per_week" integer, "p_required_hours_per_term" integer, "p_period_duration_minutes" integer, "p_weeks_per_term" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_curriculum_hours"("p_periods_per_week" integer, "p_required_hours_per_term" integer, "p_period_duration_minutes" integer, "p_weeks_per_term" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_holiday_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_holiday_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_holiday_dates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_migration_results"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_migration_results"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_migration_results"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_period_duration_consistency"("school_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_period_duration_consistency"("school_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_period_duration_consistency"("school_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_periods_per_week"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_periods_per_week"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_periods_per_week"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_scheduled_lesson_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_scheduled_lesson_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_scheduled_lesson_dates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_scheduled_lessons_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_scheduled_lessons_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_scheduled_lessons_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_schema_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_schema_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_schema_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_teacher_workload"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_teacher_workload"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_teacher_workload"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_teacher_workload_constraints"("term_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_teacher_workload_constraints"("term_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_teacher_workload_constraints"("term_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_teaching_assignments_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_teaching_assignments_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_teaching_assignments_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_term_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_term_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_term_dates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_time_slot_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_time_slot_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_time_slot_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_time_slot_overlap"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_time_slot_overlap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_time_slot_overlap"() TO "service_role";


















GRANT ALL ON TABLE "public"."academic_years" TO "anon";
GRANT ALL ON TABLE "public"."academic_years" TO "authenticated";
GRANT ALL ON TABLE "public"."academic_years" TO "service_role";



GRANT ALL ON TABLE "public"."breaks" TO "anon";
GRANT ALL ON TABLE "public"."breaks" TO "authenticated";
GRANT ALL ON TABLE "public"."breaks" TO "service_role";



GRANT ALL ON TABLE "public"."class_offerings" TO "anon";
GRANT ALL ON TABLE "public"."class_offerings" TO "authenticated";
GRANT ALL ON TABLE "public"."class_offerings" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_structure_guide" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_structure_guide" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_structure_guide" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."holidays" TO "anon";
GRANT ALL ON TABLE "public"."holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."holidays" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_lessons" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_lessons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."scheduled_lessons_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."scheduled_lessons_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."scheduled_lessons_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."subject_grade_mappings" TO "anon";
GRANT ALL ON TABLE "public"."subject_grade_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."subject_grade_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_departments" TO "anon";
GRANT ALL ON TABLE "public"."teacher_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_departments" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_time_constraints" TO "anon";
GRANT ALL ON TABLE "public"."teacher_time_constraints" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_time_constraints" TO "service_role";



GRANT ALL ON TABLE "public"."teachers" TO "anon";
GRANT ALL ON TABLE "public"."teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."teachers" TO "service_role";



GRANT ALL ON TABLE "public"."teaching_assignments" TO "anon";
GRANT ALL ON TABLE "public"."teaching_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."teaching_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."terms" TO "anon";
GRANT ALL ON TABLE "public"."terms" TO "authenticated";
GRANT ALL ON TABLE "public"."terms" TO "service_role";



GRANT ALL ON TABLE "public"."time_slots" TO "anon";
GRANT ALL ON TABLE "public"."time_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."time_slots" TO "service_role";



GRANT ALL ON TABLE "public"."timetable_generations" TO "anon";
GRANT ALL ON TABLE "public"."timetable_generations" TO "authenticated";
GRANT ALL ON TABLE "public"."timetable_generations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
