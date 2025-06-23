

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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'course_grade_class_mappings table dropped; curriculum is now defined solely by class_offerings.';



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
    WHERE class_section_id = class_id;
    
    SELECT COUNT(*) INTO mappings_count 
    FROM public.course_grade_class_mappings 
    WHERE class_section_id = class_id;
    
    SELECT COUNT(*) INTO assignments_count 
    FROM public.teaching_assignments ta
    JOIN public.class_offerings co ON ta.class_offering_id = co.id
    WHERE co.class_section_id = class_id;
    
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
        WHERE class_section_id = NEW.class_section_id 
        AND course_id = NEW.course_id 
        AND term_id = NEW.term_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RAISE EXCEPTION 'Duplicate class offering: Class % already has course % in term %', 
            NEW.class_section_id, NEW.course_id, NEW.term_id;
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
        'class_section_id (references classes.id), course_id, term_id'::TEXT
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
        'class_section_id, course_id, term_id, periods_per_week, required_hours_per_term'::TEXT as key_fields
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
        'school_id, subject_id, name, code, grade_level'::TEXT
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



CREATE OR REPLACE FUNCTION "public"."get_class_section_curriculum_summary"("p_class_section_id" "uuid", "p_term_id" "uuid") RETURNS TABLE("total_offerings" integer, "total_periods_per_week" integer, "total_hours_per_term" integer, "assigned_offerings" integer, "unassigned_offerings" integer)
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
    WHERE co.class_section_id = p_class_section_id 
    AND co.term_id = p_term_id;
END;
$$;


ALTER FUNCTION "public"."get_class_section_curriculum_summary"("p_class_section_id" "uuid", "p_term_id" "uuid") OWNER TO "postgres";


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
    JOIN public.classes c ON co.class_section_id = c.id
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
        'class_section_id -> classes, course_id -> courses, term_id -> terms'::TEXT as key_relationships
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
        'course_id -> courses, class_section_id -> classes'::TEXT;
END;
$$;


ALTER FUNCTION "public"."get_schema_overview"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_schema_overview"() IS 'This function provides a comprehensive overview of the schema structure.
It clarifies the purpose of each table and identifies single sources of truth.
This addresses the dev lead''s concerns about confusing core logic.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN INSERT INTO public.profiles (id, role) VALUES (new.id, 'admin'); RETURN new; END; $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_class_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Log the deletion (you can extend this to write to an audit table)
    RAISE NOTICE 'Class "%s" (ID: %) was deleted. This action cascaded to delete % offerings, % mappings, and % assignments.',
        OLD.name, OLD.id,
        (SELECT COUNT(*) FROM public.class_offerings WHERE class_section_id = OLD.id),
        (SELECT COUNT(*) FROM public.course_grade_class_mappings WHERE class_section_id = OLD.id),
        (SELECT COUNT(*) FROM public.teaching_assignments ta
         JOIN public.class_offerings co ON ta.class_offering_id = co.id
         WHERE co.class_section_id = OLD.id);
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."log_class_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_class_deletion"("class_id" "uuid") RETURNS TABLE("class_name" "text", "offerings_count" integer, "mappings_count" integer, "assignments_count" integer, "courses_affected" "text"[], "teachers_affected" "text"[])
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Get class information
    SELECT c.name INTO class_name FROM public.classes c WHERE c.id = class_id;
    
    IF class_name IS NULL THEN
        RETURN;
    END IF;
    
    -- Count related records
    SELECT COUNT(*) INTO offerings_count 
    FROM public.class_offerings 
    WHERE class_section_id = class_id;
    
    SELECT COUNT(*) INTO mappings_count 
    FROM public.course_grade_class_mappings 
    WHERE class_section_id = class_id;
    
    SELECT COUNT(*) INTO assignments_count 
    FROM public.teaching_assignments ta
    JOIN public.class_offerings co ON ta.class_offering_id = co.id
    WHERE co.class_section_id = class_id;
    
    -- Get unique courses that would be affected
    SELECT ARRAY_AGG(DISTINCT c.name) INTO courses_affected
    FROM public.class_offerings co
    JOIN public.courses c ON co.course_id = c.id
    WHERE co.class_section_id = class_id;
    
    -- Get unique teachers that would be affected
    SELECT ARRAY_AGG(DISTINCT CONCAT(t.first_name, ' ', t.last_name)) INTO teachers_affected
    FROM public.teaching_assignments ta
    JOIN public.class_offerings co ON ta.class_offering_id = co.id
    JOIN public.teachers t ON ta.teacher_id = t.id
    WHERE co.class_section_id = class_id;
    
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
  -- For now, we'll set a default school_id
  -- You should update this with your actual default school_id
  NEW.school_id := '00000000-0000-0000-0000-000000000000';
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_holiday_school_id"() OWNER TO "postgres";


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
    FROM class_sections cs WHERE cs.id = NEW.class_section_id;
    
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
        co1.class_section_id = co2.class_section_id AND
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



CREATE OR REPLACE FUNCTION "public"."validate_scheduled_lesson_dates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    term_start date;
    term_end date;
BEGIN
    SELECT t.start_date, t.end_date 
    INTO term_start, term_end
    FROM terms t
    JOIN timetable_generations tg ON t.id = tg.term_id
    WHERE tg.id = NEW.generation_id;
    
    IF NEW.date < term_start OR NEW.date > term_end THEN
        RAISE EXCEPTION 'Scheduled lesson date % must be within term dates % to %', 
                       NEW.date, term_start, term_end;
    END IF;
    
    -- Also check it's not a holiday
    IF EXISTS (
        SELECT 1 FROM holidays h
        JOIN terms t ON h.term_id = t.id
        JOIN timetable_generations tg ON t.id = tg.term_id
        WHERE tg.id = NEW.generation_id AND h.date = NEW.date
    ) THEN
        RAISE EXCEPTION 'Cannot schedule lesson on holiday date %', NEW.date;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_scheduled_lesson_dates"() OWNER TO "postgres";


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
        LEFT JOIN public.classes c ON co.class_section_id = c.id
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
        LEFT JOIN public.class_offerings co ON c.id = co.class_section_id
        WHERE co.class_section_id IS NULL
    );
END;
$$;


ALTER FUNCTION "public"."validate_schema_consistency"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_schema_consistency"() IS 'This function validates the consistency of the schema.
It checks for orphaned records and missing relationships.
This helps maintain data integrity and identifies potential issues.';



CREATE OR REPLACE FUNCTION "public"."validate_term_dates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ DECLARE acad_year_start_date date; acad_year_end_date date; BEGIN SELECT start_date, end_date INTO acad_year_start_date, acad_year_end_date FROM public.academic_years WHERE id = NEW.academic_year_id; IF (NEW.start_date < acad_year_start_date OR NEW.end_date > acad_year_end_date) THEN RAISE EXCEPTION 'Term dates must be within the parent academic year dates.'; END IF; RETURN NEW; END; $$;


ALTER FUNCTION "public"."validate_term_dates"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."academic_years" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL
);


ALTER TABLE "public"."academic_years" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_offerings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term_id" "uuid" NOT NULL,
    "class_section_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "periods_per_week" integer NOT NULL,
    "required_hours_per_term" integer,
    "assignment_type" "text" DEFAULT 'ai'::"text",
    CONSTRAINT "class_offerings_assignment_type_check" CHECK (("assignment_type" = ANY (ARRAY['ai'::"text", 'manual'::"text", 'ai_suggested'::"text"]))),
    CONSTRAINT "class_offerings_required_hours_positive_check" CHECK ((("required_hours_per_term" IS NULL) OR ("required_hours_per_term" > 0)))
);


ALTER TABLE "public"."class_offerings" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_offerings" IS 'Single source of truth for curriculum delivery: which courses are taught to which class sections during which terms.';



COMMENT ON COLUMN "public"."class_offerings"."term_id" IS 'References the term when this course will be taught.';



COMMENT ON COLUMN "public"."class_offerings"."class_section_id" IS 'References the class (e.g., Grade 9-A) that will take this course. 
This is the renamed column from class_section_id to maintain compatibility.';



COMMENT ON COLUMN "public"."class_offerings"."course_id" IS 'References the course that will be taught. This defines the subject and content.';



COMMENT ON COLUMN "public"."class_offerings"."periods_per_week" IS 'Number of periods per week for this course offering.
Used with required_hours_per_term to validate curriculum planning.';



COMMENT ON COLUMN "public"."class_offerings"."required_hours_per_term" IS 'Total hours required to complete this course in the term.
Should be approximately: periods_per_week × weeks_per_term × period_duration_minutes ÷ 60';



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
    "term_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "reason" "text" NOT NULL
);


ALTER TABLE "public"."holidays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "school_id" "uuid",
    "role" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'teacher'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


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
    "working_days" "text"[] DEFAULT ARRAY['monday'::"text", 'tuesday'::"text", 'wednesday'::"text", 'thursday'::"text", 'friday'::"text"]
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


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
    "teacher_id" "uuid" NOT NULL
);


ALTER TABLE "public"."teaching_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."teaching_assignments" IS 'Links teachers to class offerings. Assignment_type can be manual or ai.';



COMMENT ON COLUMN "public"."teaching_assignments"."class_offering_id" IS 'References the class offering (from class_offerings table)';



COMMENT ON COLUMN "public"."teaching_assignments"."teacher_id" IS 'References the teacher assigned to this offering';



CREATE TABLE IF NOT EXISTS "public"."terms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "academic_year_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "period_duration_minutes" integer DEFAULT 50,
    CONSTRAINT "terms_period_duration_check" CHECK ((("period_duration_minutes" IS NULL) OR (("period_duration_minutes" >= 30) AND ("period_duration_minutes" <= 120))))
);


ALTER TABLE "public"."terms" OWNER TO "postgres";


COMMENT ON COLUMN "public"."terms"."period_duration_minutes" IS 'Duration of each period in minutes. Used to calculate hours from periods.
Default: 50 minutes. Range: 30-120 minutes.';



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
    CONSTRAINT "time_slots_time_check" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."time_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetable_generations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term_id" "uuid" NOT NULL,
    "generated_by" "uuid",
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."timetable_generations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."scheduled_lessons" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."scheduled_lessons_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_school_id_name_key" UNIQUE ("school_id", "name");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_term_id_class_section_id_course_id_key" UNIQUE ("term_id", "class_section_id", "course_id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_school_id_grade_level_name_key" UNIQUE ("school_id", "grade_level", "name");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_lessons"
    ADD CONSTRAINT "scheduled_lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_grade_mappings"
    ADD CONSTRAINT "subject_grade_mappings_department_grade_unique" UNIQUE ("department_id", "grade_level");



ALTER TABLE ONLY "public"."subject_grade_mappings"
    ADD CONSTRAINT "subject_grade_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_time_constraints"
    ADD CONSTRAINT "teacher_time_constraints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_time_constraints"
    ADD CONSTRAINT "teacher_time_constraints_unique" UNIQUE ("teacher_id", "time_slot_id", "constraint_type");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_class_offering_id_teacher_id_key" UNIQUE ("class_offering_id", "teacher_id");



ALTER TABLE ONLY "public"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_school_id_day_of_week_start_time_key" UNIQUE ("school_id", "day_of_week", "start_time");



ALTER TABLE ONLY "public"."timetable_generations"
    ADD CONSTRAINT "timetable_generations_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_class_offerings_class_term" ON "public"."class_offerings" USING "btree" ("class_section_id", "term_id");



CREATE INDEX "idx_class_offerings_course_term" ON "public"."class_offerings" USING "btree" ("course_id", "term_id");



CREATE INDEX "idx_class_offerings_required_hours" ON "public"."class_offerings" USING "btree" ("required_hours_per_term") WHERE ("required_hours_per_term" IS NOT NULL);



CREATE INDEX "idx_classes_school_id" ON "public"."classes" USING "btree" ("school_id");



CREATE INDEX "idx_courses_department_id" ON "public"."courses" USING "btree" ("department_id");



CREATE INDEX "idx_courses_total_hours" ON "public"."courses" USING "btree" ("total_hours_per_year");



CREATE INDEX "idx_rooms_school_id" ON "public"."rooms" USING "btree" ("school_id");



CREATE INDEX "idx_subject_grade_mappings_department" ON "public"."subject_grade_mappings" USING "btree" ("department_id");



CREATE INDEX "idx_subject_grade_mappings_department_id" ON "public"."subject_grade_mappings" USING "btree" ("department_id");



CREATE INDEX "idx_subject_grade_mappings_grade" ON "public"."subject_grade_mappings" USING "btree" ("grade_level");



CREATE INDEX "idx_teacher_time_constraints_teacher" ON "public"."teacher_time_constraints" USING "btree" ("teacher_id");



CREATE INDEX "idx_teacher_time_constraints_time_slot" ON "public"."teacher_time_constraints" USING "btree" ("time_slot_id");



CREATE INDEX "idx_teacher_time_constraints_type" ON "public"."teacher_time_constraints" USING "btree" ("constraint_type");



CREATE INDEX "idx_time_slots_school_id" ON "public"."time_slots" USING "btree" ("school_id");



CREATE OR REPLACE TRIGGER "ensure_curriculum_consistency_trigger" BEFORE INSERT OR UPDATE ON "public"."class_offerings" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_curriculum_consistency"();



CREATE OR REPLACE TRIGGER "update_classes_updated_at" BEFORE UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subject_grade_mappings_modtime" BEFORE UPDATE ON "public"."subject_grade_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_class_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_lessons"
    ADD CONSTRAINT "scheduled_lessons_teaching_assignment_id_fkey" FOREIGN KEY ("teaching_assignment_id") REFERENCES "public"."teaching_assignments"("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."subject_grade_mappings"
    ADD CONSTRAINT "subject_grade_mappings_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "teaching_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id");



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id");



ALTER TABLE ONLY "public"."timetable_generations"
    ADD CONSTRAINT "timetable_generations_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "auth"."users"("id");



CREATE POLICY "Admins can manage classes in their school" ON "public"."classes" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."school_id" = "classes"."school_id") AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage departments in their school" ON "public"."departments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."school_id" = "departments"."school_id") AND ("p"."role" = 'admin'::"text")))));



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



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their school" ON "public"."schools" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view academic years for their school" ON "public"."academic_years" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "academic_years"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view classes in their school" ON "public"."classes" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view departments in their school" ON "public"."departments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."school_id" = "departments"."school_id")))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view rooms for their school" ON "public"."rooms" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "rooms"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view teachers for their school" ON "public"."teachers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "teachers"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view terms for their school" ON "public"."terms" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."academic_years"
     JOIN "public"."schools" ON (("schools"."id" = "academic_years"."school_id")))
  WHERE (("academic_years"."id" = "terms"."academic_year_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their school" ON "public"."schools" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."academic_years" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_offerings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."terms" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_class_section_curriculum_summary"("p_class_section_id" "uuid", "p_term_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_section_curriculum_summary"("p_class_section_id" "uuid", "p_term_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_section_curriculum_summary"("p_class_section_id" "uuid", "p_term_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_curriculum_consistency_report"("p_school_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_curriculum_consistency_report"("p_school_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_curriculum_consistency_report"("p_school_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_schema_overview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_schema_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_schema_overview"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_class_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_class_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_class_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."preview_class_deletion"("class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."preview_class_deletion"("class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_class_deletion"("class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_holiday_school_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_holiday_school_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_holiday_school_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_term_school_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_term_school_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_term_school_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_class_offering_school_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_class_offering_school_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_class_offering_school_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_curriculum_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_curriculum_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_curriculum_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_curriculum_hours"("p_periods_per_week" integer, "p_required_hours_per_term" integer, "p_period_duration_minutes" integer, "p_weeks_per_term" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_curriculum_hours"("p_periods_per_week" integer, "p_required_hours_per_term" integer, "p_period_duration_minutes" integer, "p_weeks_per_term" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_curriculum_hours"("p_periods_per_week" integer, "p_required_hours_per_term" integer, "p_period_duration_minutes" integer, "p_weeks_per_term" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_scheduled_lesson_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_scheduled_lesson_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_scheduled_lesson_dates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_schema_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_schema_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_schema_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_term_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_term_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_term_dates"() TO "service_role";



GRANT ALL ON TABLE "public"."academic_years" TO "anon";
GRANT ALL ON TABLE "public"."academic_years" TO "authenticated";
GRANT ALL ON TABLE "public"."academic_years" TO "service_role";



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
