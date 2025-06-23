drop policy "Users can view academic years for their school" on "public"."academic_years";

drop policy "Users can update own profile" on "public"."profiles";

drop policy "Users can view own profile" on "public"."profiles";

drop policy "Users can view rooms for their school" on "public"."rooms";

drop policy "Users can view teachers for their school" on "public"."teachers";

drop policy "Users can view terms for their school" on "public"."terms";

drop function if exists "public"."get_class_section_curriculum_summary"(p_class_section_id uuid, p_term_id uuid);

-- create table "public"."classes" (
--     "id" uuid not null default gen_random_uuid(),
--     "school_id" uuid not null,
--     "grade_level" integer not null,
--     "name" text not null,
--     "created_at" timestamp with time zone default now(),
--     "updated_at" timestamp with time zone default now()
-- );


-- alter table "public"."classes" enable row level security;

alter table "public"."courses" enable row level security;

alter table "public"."holidays" enable row level security;

alter table "public"."scheduled_lessons" enable row level security;

alter table "public"."subject_grade_mappings" enable row level security;

-- alter table "public"."teacher_time_constraints" enable row level security;

alter table "public"."teaching_assignments" add column "assigned_at" timestamp with time zone default now();

alter table "public"."teaching_assignments" add column "assignment_type" text default 'manual'::text;

alter table "public"."teaching_assignments" enable row level security;

alter table "public"."time_slots" enable row level security;

alter table "public"."timetable_generations" enable row level security;

-- CREATE UNIQUE INDEX classes_pkey ON public.classes USING btree (id);

-- CREATE UNIQUE INDEX classes_school_id_grade_level_name_key ON public.classes USING btree (school_id, grade_level, name);

-- CREATE INDEX idx_classes_school_id ON public.classes USING btree (school_id);

-- alter table "public"."classes" add constraint "classes_pkey" PRIMARY KEY using index "classes_pkey";

-- alter table "public"."class_offerings" add constraint "class_offerings_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

-- alter table "public"."class_offerings" validate constraint "class_offerings_class_id_fkey";

-- alter table "public"."classes" add constraint "classes_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

-- alter table "public"."classes" validate constraint "classes_school_id_fkey";

-- alter table "public"."classes" add constraint "classes_school_id_grade_level_name_key" UNIQUE using index "classes_school_id_grade_level_name_key";

alter table "public"."teaching_assignments" add constraint "teaching_assignments_assignment_type_check" CHECK ((assignment_type = ANY (ARRAY['manual'::text, 'ai'::text]))) not valid;

alter table "public"."teaching_assignments" validate constraint "teaching_assignments_assignment_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_class_section_curriculum_summary(p_class_id uuid, p_term_id uuid)
 RETURNS TABLE(total_offerings integer, total_periods_per_week integer, total_hours_per_term integer, assigned_offerings integer, unassigned_offerings integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.my_function_name(p_class_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Your logic here
    -- Example: SELECT * FROM class_offerings WHERE class_id = p_class_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_class_safely(class_id uuid)
 RETURNS TABLE(success boolean, message text, deleted_offerings integer, deleted_mappings integer, deleted_assignments integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_curriculum_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.explain_class_structure()
 RETURNS TABLE(component text, purpose text, key_fields text)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.explain_curriculum_structure()
 RETURNS TABLE(component text, purpose text, key_fields text)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_curriculum_consistency_report(p_school_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(class_name text, course_name text, periods_per_week integer, required_hours_per_term integer, expected_hours numeric, variance_hours numeric, status text, recommendation text)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_schema_overview()
 RETURNS TABLE(table_name text, purpose text, single_source_of_truth boolean, key_relationships text)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.log_class_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.preview_class_deletion(class_id uuid)
 RETURNS TABLE(class_name text, offerings_count integer, mappings_count integer, assignments_count integer, courses_affected text[], teachers_affected text[])
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_class_offering_school_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_curriculum_consistency()
 RETURNS TABLE(validation_type text, message text, offering_id uuid)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_schema_consistency()
 RETURNS TABLE(validation_type text, message text, severity text)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

grant delete on table "public"."classes" to "anon";

grant insert on table "public"."classes" to "anon";

grant references on table "public"."classes" to "anon";

grant select on table "public"."classes" to "anon";

grant trigger on table "public"."classes" to "anon";

grant truncate on table "public"."classes" to "anon";

grant update on table "public"."classes" to "anon";

grant delete on table "public"."classes" to "authenticated";

grant insert on table "public"."classes" to "authenticated";

grant references on table "public"."classes" to "authenticated";

grant select on table "public"."classes" to "authenticated";

grant trigger on table "public"."classes" to "authenticated";

grant truncate on table "public"."classes" to "authenticated";

grant update on table "public"."classes" to "authenticated";

grant delete on table "public"."classes" to "service_role";

grant insert on table "public"."classes" to "service_role";

grant references on table "public"."classes" to "service_role";

grant select on table "public"."classes" to "service_role";

grant trigger on table "public"."classes" to "service_role";

grant truncate on table "public"."classes" to "service_role";

grant update on table "public"."classes" to "service_role";

create policy "Users can create academic years for their school"
on "public"."academic_years"
as permissive
for insert
to public
with check ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can delete academic years for their school"
on "public"."academic_years"
as permissive
for delete
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can update academic years for their school"
on "public"."academic_years"
as permissive
for update
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Authenticated users can manage class offerings"
on "public"."class_offerings"
as permissive
for all
to public
using ((auth.role() = 'authenticated'::text));


create policy "Users can create class offerings for their school"
on "public"."class_offerings"
as permissive
for insert
to public
with check ((course_id IN ( SELECT c.id
   FROM (courses c
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can delete class offerings for their school"
on "public"."class_offerings"
as permissive
for delete
to public
using ((course_id IN ( SELECT c.id
   FROM (courses c
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can update class offerings for their school"
on "public"."class_offerings"
as permissive
for update
to public
using ((course_id IN ( SELECT c.id
   FROM (courses c
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can view class offerings for their school"
on "public"."class_offerings"
as permissive
for select
to public
using ((course_id IN ( SELECT c.id
   FROM (courses c
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


-- create policy "Admins can manage classes in their school"
-- create policy "Users can create classes for their school"
-- create policy "Users can delete classes for their school"
-- create policy "Users can update classes for their school"
-- create policy "Users can view classes for their school"
-- create policy "Users can view classes in their school"


create policy "Users can create courses for their school"
on "public"."courses"
as permissive
for insert
to public
with check ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can delete courses for their school"
on "public"."courses"
as permissive
for delete
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can update courses for their school"
on "public"."courses"
as permissive
for update
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can view courses for their school"
on "public"."courses"
as permissive
for select
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can create departments for their school"
on "public"."departments"
as permissive
for insert
to public
with check ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can delete departments for their school"
on "public"."departments"
as permissive
for delete
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can update departments for their school"
on "public"."departments"
as permissive
for update
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can view departments for their school"
on "public"."departments"
as permissive
for select
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can create holidays for their school"
on "public"."holidays"
as permissive
for insert
to public
with check ((term_id IN ( SELECT t.id
   FROM ((terms t
     JOIN academic_years ay ON ((t.academic_year_id = ay.id)))
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can delete holidays for their school"
on "public"."holidays"
as permissive
for delete
to public
using ((term_id IN ( SELECT t.id
   FROM ((terms t
     JOIN academic_years ay ON ((t.academic_year_id = ay.id)))
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can update holidays for their school"
on "public"."holidays"
as permissive
for update
to public
using ((term_id IN ( SELECT t.id
   FROM ((terms t
     JOIN academic_years ay ON ((t.academic_year_id = ay.id)))
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can view holidays for their school"
on "public"."holidays"
as permissive
for select
to public
using ((term_id IN ( SELECT t.id
   FROM ((terms t
     JOIN academic_years ay ON ((t.academic_year_id = ay.id)))
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can create own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((id = auth.uid()));


create policy "Users can delete own profile"
on "public"."profiles"
as permissive
for delete
to public
using ((id = auth.uid()));


create policy "Users can create rooms for their school"
on "public"."rooms"
as permissive
for insert
to public
with check ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can delete rooms for their school"
on "public"."rooms"
as permissive
for delete
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can update rooms for their school"
on "public"."rooms"
as permissive
for update
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can create scheduled lessons for their school"
on "public"."scheduled_lessons"
as permissive
for insert
to public
with check ((teaching_assignment_id IN ( SELECT ta.id
   FROM (((teaching_assignments ta
     JOIN class_offerings co ON ((ta.class_offering_id = co.id)))
     JOIN courses c ON ((co.course_id = c.id)))
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can delete scheduled lessons for their school"
on "public"."scheduled_lessons"
as permissive
for delete
to public
using ((teaching_assignment_id IN ( SELECT ta.id
   FROM (((teaching_assignments ta
     JOIN class_offerings co ON ((ta.class_offering_id = co.id)))
     JOIN courses c ON ((co.course_id = c.id)))
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can update scheduled lessons for their school"
on "public"."scheduled_lessons"
as permissive
for update
to public
using ((teaching_assignment_id IN ( SELECT ta.id
   FROM (((teaching_assignments ta
     JOIN class_offerings co ON ((ta.class_offering_id = co.id)))
     JOIN courses c ON ((co.course_id = c.id)))
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can view scheduled lessons for their school"
on "public"."scheduled_lessons"
as permissive
for select
to public
using ((teaching_assignment_id IN ( SELECT ta.id
   FROM (((teaching_assignments ta
     JOIN class_offerings co ON ((ta.class_offering_id = co.id)))
     JOIN courses c ON ((co.course_id = c.id)))
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can create schools"
on "public"."schools"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "Users can delete their schools"
on "public"."schools"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "Users can update their schools"
on "public"."schools"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "Users can view their schools"
on "public"."schools"
as permissive
for select
to public
using (((user_id = auth.uid()) OR (id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid())))));


create policy "Users can create subject grade mappings for their school"
on "public"."subject_grade_mappings"
as permissive
for insert
to public
with check ((department_id IN ( SELECT d.id
   FROM (departments d
     JOIN profiles p ON ((d.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can delete subject grade mappings for their school"
on "public"."subject_grade_mappings"
as permissive
for delete
to public
using ((department_id IN ( SELECT d.id
   FROM (departments d
     JOIN profiles p ON ((d.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can update subject grade mappings for their school"
on "public"."subject_grade_mappings"
as permissive
for update
to public
using ((department_id IN ( SELECT d.id
   FROM (departments d
     JOIN profiles p ON ((d.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can view subject grade mappings for their school"
on "public"."subject_grade_mappings"
as permissive
for select
to public
using ((department_id IN ( SELECT d.id
   FROM (departments d
     JOIN profiles p ON ((d.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can create teacher departments for their school"
on "public"."teacher_departments"
as permissive
for insert
to public
with check ((department_id IN ( SELECT d.id
   FROM (departments d
     JOIN profiles p ON ((d.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can delete teacher departments for their school"
on "public"."teacher_departments"
as permissive
for delete
to public
using ((department_id IN ( SELECT d.id
   FROM (departments d
     JOIN profiles p ON ((d.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can update teacher departments for their school"
on "public"."teacher_departments"
as permissive
for update
to public
using ((department_id IN ( SELECT d.id
   FROM (departments d
     JOIN profiles p ON ((d.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can view teacher departments for their school"
on "public"."teacher_departments"
as permissive
for select
to public
using ((department_id IN ( SELECT d.id
   FROM (departments d
     JOIN profiles p ON ((d.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


-- create policy "Users can create teacher time constraints for their school"
-- create policy "Users can delete teacher time constraints for their school"
-- create policy "Users can update teacher time constraints for their school"
-- create policy "Users can view teacher time constraints for their school"


create policy "Users can create teachers for their school"
on "public"."teachers"
as permissive
for insert
to public
with check ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can delete teachers for their school"
on "public"."teachers"
as permissive
for delete
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can update teachers for their school"
on "public"."teachers"
as permissive
for update
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can create teaching assignments for their school"
on "public"."teaching_assignments"
as permissive
for insert
to public
with check ((class_offering_id IN ( SELECT co.id
   FROM ((class_offerings co
     JOIN courses c ON ((co.course_id = c.id)))
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can delete teaching assignments for their school"
on "public"."teaching_assignments"
as permissive
for delete
to public
using ((class_offering_id IN ( SELECT co.id
   FROM ((class_offerings co
     JOIN courses c ON ((co.course_id = c.id)))
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can update teaching assignments for their school"
on "public"."teaching_assignments"
as permissive
for update
to public
using ((class_offering_id IN ( SELECT co.id
   FROM ((class_offerings co
     JOIN courses c ON ((co.course_id = c.id)))
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can view teaching assignments for their school"
on "public"."teaching_assignments"
as permissive
for select
to public
using ((class_offering_id IN ( SELECT co.id
   FROM ((class_offerings co
     JOIN courses c ON ((co.course_id = c.id)))
     JOIN profiles p ON ((c.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can create terms for their school"
on "public"."terms"
as permissive
for insert
to public
with check ((academic_year_id IN ( SELECT ay.id
   FROM (academic_years ay
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can delete terms for their school"
on "public"."terms"
as permissive
for delete
to public
using ((academic_year_id IN ( SELECT ay.id
   FROM (academic_years ay
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can update terms for their school"
on "public"."terms"
as permissive
for update
to public
using ((academic_year_id IN ( SELECT ay.id
   FROM (academic_years ay
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can create time slots for their school"
on "public"."time_slots"
as permissive
for insert
to public
with check ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can delete time slots for their school"
on "public"."time_slots"
as permissive
for delete
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can update time slots for their school"
on "public"."time_slots"
as permissive
for update
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can view time slots for their school"
on "public"."time_slots"
as permissive
for select
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can create timetable generations for their school"
on "public"."timetable_generations"
as permissive
for insert
to public
with check ((term_id IN ( SELECT t.id
   FROM ((terms t
     JOIN academic_years ay ON ((t.academic_year_id = ay.id)))
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can delete timetable generations for their school"
on "public"."timetable_generations"
as permissive
for delete
to public
using ((term_id IN ( SELECT t.id
   FROM ((terms t
     JOIN academic_years ay ON ((t.academic_year_id = ay.id)))
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can update timetable generations for their school"
on "public"."timetable_generations"
as permissive
for update
to public
using ((term_id IN ( SELECT t.id
   FROM ((terms t
     JOIN academic_years ay ON ((t.academic_year_id = ay.id)))
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can view timetable generations for their school"
on "public"."timetable_generations"
as permissive
for select
to public
using ((term_id IN ( SELECT t.id
   FROM ((terms t
     JOIN academic_years ay ON ((t.academic_year_id = ay.id)))
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


create policy "Users can view academic years for their school"
on "public"."academic_years"
as permissive
for select
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to public
using ((id = auth.uid()));


create policy "Users can view own profile"
on "public"."profiles"
as permissive
for select
to public
using ((id = auth.uid()));


create policy "Users can view rooms for their school"
on "public"."rooms"
as permissive
for select
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can view teachers for their school"
on "public"."teachers"
as permissive
for select
to public
using ((school_id IN ( SELECT profiles.school_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));


create policy "Users can view terms for their school"
on "public"."terms"
as permissive
for select
to public
using ((academic_year_id IN ( SELECT ay.id
   FROM (academic_years ay
     JOIN profiles p ON ((ay.school_id = p.school_id)))
  WHERE (p.id = auth.uid()))));


CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


