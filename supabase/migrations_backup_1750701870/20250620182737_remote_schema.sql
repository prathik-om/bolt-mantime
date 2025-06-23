

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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "timetable";


ALTER SCHEMA "timetable" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN INSERT INTO public.profiles (id, role) VALUES (new.id, 'admin'); RETURN new; END; $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


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
    "ai_assigned_teacher_id" "uuid",
    "manual_assigned_teacher_id" "uuid",
    "assignment_notes" "text",
    "assignment_date" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "class_offerings_assignment_type_check" CHECK (("assignment_type" = ANY (ARRAY['ai'::"text", 'manual'::"text", 'ai_suggested'::"text"])))
);


ALTER TABLE "public"."class_offerings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "grade_level" integer NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."class_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "school_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "grade_level" integer NOT NULL
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


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
    "subject_id" "uuid" NOT NULL,
    "grade_level" integer NOT NULL,
    "is_required" boolean DEFAULT true,
    "periods_per_week" integer DEFAULT 5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subject_grade_mappings_grade_level_check" CHECK ((("grade_level" >= 1) AND ("grade_level" <= 12))),
    CONSTRAINT "subject_grade_mappings_periods_check" CHECK (("periods_per_week" > 0))
);


ALTER TABLE "public"."subject_grade_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "timeslot_id" "uuid" NOT NULL,
    "availability_type" "text" NOT NULL,
    CONSTRAINT "teacher_availability_availability_type_check" CHECK (("availability_type" = ANY (ARRAY['preferred'::"text", 'unavailable'::"text"])))
);


ALTER TABLE "public"."teacher_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_constraints" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "time_slot_id" "uuid" NOT NULL,
    "constraint_type" "text" NOT NULL,
    "reason" "text",
    "priority" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "teacher_constraints_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5))),
    CONSTRAINT "teacher_constraints_type_check" CHECK (("constraint_type" = ANY (ARRAY['unavailable'::"text", 'preferred'::"text", 'avoid'::"text"])))
);


ALTER TABLE "public"."teacher_constraints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_qualifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL
);


ALTER TABLE "public"."teacher_qualifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "max_periods_per_week" integer
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teaching_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_offering_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL
);


ALTER TABLE "public"."teaching_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."terms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "academic_year_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL
);


ALTER TABLE "public"."terms" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "timetable"."academic_periods" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL
);


ALTER TABLE "timetable"."academic_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."class_offerings" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "academic_period_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "sessions_per_week" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "timetable"."class_offerings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."classes" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "grade_id" smallint NOT NULL,
    "section" "text" NOT NULL
);


ALTER TABLE "timetable"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."constraints" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "constraint_type" "text" NOT NULL,
    "is_hard_constraint" boolean DEFAULT true,
    "details" "jsonb"
);


ALTER TABLE "timetable"."constraints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."grades" (
    "id" smallint NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "timetable"."grades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."rooms" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'classroom'::"text",
    "capacity" integer DEFAULT 30
);


ALTER TABLE "timetable"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."schedule_entries" (
    "id" bigint NOT NULL,
    "timetable_id" "uuid" NOT NULL,
    "time_slot_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "room_id" "uuid",
    "assignment_id" "uuid" NOT NULL
);


ALTER TABLE "timetable"."schedule_entries" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "timetable"."schedule_entries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "timetable"."schedule_entries_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "timetable"."schedule_entries_id_seq" OWNED BY "timetable"."schedule_entries"."id";



CREATE TABLE IF NOT EXISTS "timetable"."schools" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "timetable"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."subjects" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "is_practical" boolean DEFAULT false
);


ALTER TABLE "timetable"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."teacher_qualifications" (
    "teacher_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL
);


ALTER TABLE "timetable"."teacher_qualifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."teachers" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "max_hours_per_week" integer DEFAULT 25,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "timetable"."teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."teaching_assignments" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "class_offering_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL
);


ALTER TABLE "timetable"."teaching_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."time_slots" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "period_number" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_break" boolean DEFAULT false,
    CONSTRAINT "time_slots_day_of_week_check" CHECK ((("day_of_week" >= 1) AND ("day_of_week" <= 7)))
);


ALTER TABLE "timetable"."time_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timetable"."timetables" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "academic_period_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "timetables_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'archived'::"text"])))
);


ALTER TABLE "timetable"."timetables" OWNER TO "postgres";


ALTER TABLE ONLY "public"."scheduled_lessons" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."scheduled_lessons_id_seq"'::"regclass");



ALTER TABLE ONLY "timetable"."schedule_entries" ALTER COLUMN "id" SET DEFAULT "nextval"('"timetable"."schedule_entries_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_school_id_name_key" UNIQUE ("school_id", "name");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_term_id_class_section_id_course_id_key" UNIQUE ("term_id", "class_section_id", "course_id");



ALTER TABLE ONLY "public"."class_sections"
    ADD CONSTRAINT "class_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_sections"
    ADD CONSTRAINT "class_sections_school_id_grade_level_name_key" UNIQUE ("school_id", "grade_level", "name");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



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
    ADD CONSTRAINT "subject_grade_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_grade_mappings"
    ADD CONSTRAINT "subject_grade_mappings_subject_grade_unique" UNIQUE ("subject_id", "grade_level");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_school_id_name_key" UNIQUE ("school_id", "name");



ALTER TABLE ONLY "public"."teacher_availability"
    ADD CONSTRAINT "teacher_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_availability"
    ADD CONSTRAINT "teacher_availability_teacher_id_timeslot_id_key" UNIQUE ("teacher_id", "timeslot_id");



ALTER TABLE ONLY "public"."teacher_constraints"
    ADD CONSTRAINT "teacher_constraints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_constraints"
    ADD CONSTRAINT "teacher_constraints_teacher_id_time_slot_id_key" UNIQUE ("teacher_id", "time_slot_id");



ALTER TABLE ONLY "public"."teacher_qualifications"
    ADD CONSTRAINT "teacher_qualifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_qualifications"
    ADD CONSTRAINT "teacher_qualifications_teacher_id_subject_id_key" UNIQUE ("teacher_id", "subject_id");



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



ALTER TABLE ONLY "timetable"."academic_periods"
    ADD CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."academic_periods"
    ADD CONSTRAINT "academic_periods_school_id_name_key" UNIQUE ("school_id", "name");



ALTER TABLE ONLY "timetable"."class_offerings"
    ADD CONSTRAINT "class_offerings_academic_period_id_class_id_subject_id_key" UNIQUE ("academic_period_id", "class_id", "subject_id");



ALTER TABLE ONLY "timetable"."class_offerings"
    ADD CONSTRAINT "class_offerings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."classes"
    ADD CONSTRAINT "classes_school_id_grade_id_section_key" UNIQUE ("school_id", "grade_id", "section");



ALTER TABLE ONLY "timetable"."constraints"
    ADD CONSTRAINT "constraints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."grades"
    ADD CONSTRAINT "grades_name_key" UNIQUE ("name");



ALTER TABLE ONLY "timetable"."grades"
    ADD CONSTRAINT "grades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."rooms"
    ADD CONSTRAINT "rooms_school_id_name_key" UNIQUE ("school_id", "name");



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_timetable_id_time_slot_id_class_id_excl" EXCLUDE USING "gist" ("timetable_id" WITH =, "time_slot_id" WITH =, "class_id" WITH =);



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_timetable_id_time_slot_id_room_id_excl" EXCLUDE USING "gist" ("timetable_id" WITH =, "time_slot_id" WITH =, "room_id" WITH =) WHERE (("room_id" IS NOT NULL));



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_timetable_id_time_slot_id_teacher_id_excl" EXCLUDE USING "gist" ("timetable_id" WITH =, "time_slot_id" WITH =, "teacher_id" WITH =);



ALTER TABLE ONLY "timetable"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."subjects"
    ADD CONSTRAINT "subjects_school_id_name_key" UNIQUE ("school_id", "name");



ALTER TABLE ONLY "timetable"."teacher_qualifications"
    ADD CONSTRAINT "teacher_qualifications_pkey" PRIMARY KEY ("teacher_id", "subject_id");



ALTER TABLE ONLY "timetable"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."teachers"
    ADD CONSTRAINT "teachers_school_id_email_key" UNIQUE ("school_id", "email");



ALTER TABLE ONLY "timetable"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_class_offering_id_key" UNIQUE ("class_offering_id");



ALTER TABLE ONLY "timetable"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."time_slots"
    ADD CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "timetable"."time_slots"
    ADD CONSTRAINT "time_slots_school_id_day_of_week_period_number_key" UNIQUE ("school_id", "day_of_week", "period_number");



ALTER TABLE ONLY "timetable"."timetables"
    ADD CONSTRAINT "timetables_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_rooms_school_id" ON "public"."rooms" USING "btree" ("school_id");



CREATE INDEX "idx_subject_grade_mappings_grade" ON "public"."subject_grade_mappings" USING "btree" ("grade_level");



CREATE INDEX "idx_subject_grade_mappings_subject" ON "public"."subject_grade_mappings" USING "btree" ("subject_id");



CREATE INDEX "idx_teacher_availability_teacher" ON "public"."teacher_availability" USING "btree" ("teacher_id");



CREATE INDEX "idx_time_slots_school_id" ON "public"."time_slots" USING "btree" ("school_id");



CREATE INDEX "idx_assignments_teacher" ON "timetable"."teaching_assignments" USING "btree" ("teacher_id");



CREATE INDEX "idx_classes_school_grade" ON "timetable"."classes" USING "btree" ("school_id", "grade_id");



CREATE INDEX "idx_offerings_period_class" ON "timetable"."class_offerings" USING "btree" ("academic_period_id", "class_id");



CREATE INDEX "idx_schedule_entries_timetable_slot" ON "timetable"."schedule_entries" USING "btree" ("timetable_id", "time_slot_id");



CREATE OR REPLACE TRIGGER "update_subject_grade_mappings_modtime" BEFORE UPDATE ON "public"."subject_grade_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_ai_assigned_teacher_id_fkey" FOREIGN KEY ("ai_assigned_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "public"."class_sections"("id");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_manual_assigned_teacher_id_fkey" FOREIGN KEY ("manual_assigned_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."class_offerings"
    ADD CONSTRAINT "class_offerings_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id");



ALTER TABLE ONLY "public"."class_sections"
    ADD CONSTRAINT "class_sections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_lessons"
    ADD CONSTRAINT "scheduled_lessons_teaching_assignment_id_fkey" FOREIGN KEY ("teaching_assignment_id") REFERENCES "public"."teaching_assignments"("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."teacher_availability"
    ADD CONSTRAINT "teacher_availability_timeslot_id_fkey" FOREIGN KEY ("timeslot_id") REFERENCES "public"."time_slots"("id");



ALTER TABLE ONLY "public"."teacher_qualifications"
    ADD CONSTRAINT "teacher_qualifications_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."teacher_qualifications"
    ADD CONSTRAINT "teacher_qualifications_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_class_offering_id_fkey" FOREIGN KEY ("class_offering_id") REFERENCES "public"."class_offerings"("id");



ALTER TABLE ONLY "public"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id");



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id");



ALTER TABLE ONLY "public"."timetable_generations"
    ADD CONSTRAINT "timetable_generations_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "timetable"."academic_periods"
    ADD CONSTRAINT "academic_periods_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "timetable"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."class_offerings"
    ADD CONSTRAINT "class_offerings_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "timetable"."academic_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."class_offerings"
    ADD CONSTRAINT "class_offerings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "timetable"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."class_offerings"
    ADD CONSTRAINT "class_offerings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "timetable"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."classes"
    ADD CONSTRAINT "classes_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "timetable"."grades"("id");



ALTER TABLE ONLY "timetable"."classes"
    ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "timetable"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."constraints"
    ADD CONSTRAINT "constraints_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "timetable"."schools"("id");



ALTER TABLE ONLY "timetable"."rooms"
    ADD CONSTRAINT "rooms_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "timetable"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "timetable"."teaching_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "timetable"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "timetable"."rooms"("id");



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "timetable"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "timetable"."time_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."schedule_entries"
    ADD CONSTRAINT "schedule_entries_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "timetable"."timetables"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."subjects"
    ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "timetable"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."teacher_qualifications"
    ADD CONSTRAINT "teacher_qualifications_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "timetable"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."teacher_qualifications"
    ADD CONSTRAINT "teacher_qualifications_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "timetable"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."teachers"
    ADD CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "timetable"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_class_offering_id_fkey" FOREIGN KEY ("class_offering_id") REFERENCES "timetable"."class_offerings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "timetable"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."time_slots"
    ADD CONSTRAINT "time_slots_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "timetable"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "timetable"."timetables"
    ADD CONSTRAINT "timetables_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "timetable"."academic_periods"("id") ON DELETE CASCADE;



CREATE POLICY "Users can insert their school" ON "public"."schools" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage academic years for their school" ON "public"."academic_years" USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "academic_years"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage classes for their school" ON "public"."classes" USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "classes"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage rooms for their school" ON "public"."rooms" USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "rooms"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage subjects for their school" ON "public"."subjects" USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "subjects"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



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



CREATE POLICY "Users can view classes for their school" ON "public"."classes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "classes"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view rooms for their school" ON "public"."rooms" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "rooms"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view subjects for their school" ON "public"."subjects" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "subjects"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view teachers for their school" ON "public"."teachers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "teachers"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view terms for their school" ON "public"."terms" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."academic_years"
     JOIN "public"."schools" ON (("schools"."id" = "academic_years"."school_id")))
  WHERE (("academic_years"."id" = "terms"."academic_year_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their school" ON "public"."schools" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."academic_years" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."terms" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";













































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."validate_scheduled_lesson_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_scheduled_lesson_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_scheduled_lesson_dates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_term_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_term_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_term_dates"() TO "service_role";


















GRANT ALL ON TABLE "public"."academic_years" TO "anon";
GRANT ALL ON TABLE "public"."academic_years" TO "authenticated";
GRANT ALL ON TABLE "public"."academic_years" TO "service_role";



GRANT ALL ON TABLE "public"."class_offerings" TO "anon";
GRANT ALL ON TABLE "public"."class_offerings" TO "authenticated";
GRANT ALL ON TABLE "public"."class_offerings" TO "service_role";



GRANT ALL ON TABLE "public"."class_sections" TO "anon";
GRANT ALL ON TABLE "public"."class_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."class_sections" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



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



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_availability" TO "anon";
GRANT ALL ON TABLE "public"."teacher_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_availability" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_constraints" TO "anon";
GRANT ALL ON TABLE "public"."teacher_constraints" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_constraints" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_qualifications" TO "anon";
GRANT ALL ON TABLE "public"."teacher_qualifications" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_qualifications" TO "service_role";



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
