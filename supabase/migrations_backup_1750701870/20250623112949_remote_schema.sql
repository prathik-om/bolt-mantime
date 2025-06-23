alter table "public"."class_offerings" drop constraint "class_offerings_class_section_id_fkey";

-- alter table "public"."class_offerings" drop constraint "class_offerings_class_id_fkey";

alter table "public"."class_sections" drop constraint "class_sections_pkey";

drop index if exists "public"."class_sections_pkey";

drop table "public"."class_sections";

-- create table "public"."classes" (
--     "id" uuid not null default gen_random_uuid(),
--     "school_id" uuid not null,
--     "grade_level" integer not null,
--     "name" text not null,
--     "created_at" timestamp with time zone default now(),
--     "updated_at" timestamp with time zone default now()
-- );


-- alter table "public"."classes" enable row level security;

-- CREATE UNIQUE INDEX classes_pkey ON public.classes USING btree (id);

-- CREATE UNIQUE INDEX classes_school_id_grade_level_name_key ON public.classes USING btree (school_id, grade_level, name);

-- CREATE INDEX idx_classes_school_id ON public.classes USING btree (school_id);

-- alter table "public"."classes" add constraint "classes_pkey" PRIMARY KEY using index "classes_pkey";

-- alter table "public"."classes" add constraint "classes_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

-- alter table "public"."classes" validate constraint "classes_school_id_fkey";

-- alter table "public"."classes" add constraint "classes_school_id_grade_level_name_key" UNIQUE using index "classes_school_id_grade_level_name_key";

-- alter table "public"."class_offerings" add constraint "class_offerings_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

-- alter table "public"."class_offerings" validate constraint "class_offerings_class_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.explain_curriculum_structure()
 RETURNS TABLE(component text, purpose text, key_fields text)
 LANGUAGE plpgsql
AS $function$
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

-- grant update on table "public"."classes" to "service_role";

-- create policy "Admins can manage classes in their school"
-- on "public"."classes"
-- as permissive
-- for all
-- to public
-- using ((EXISTS ( SELECT 1
--    FROM profiles
--   WHERE ((profiles.id = auth.uid()) AND (profiles.school_id = classes.school_id) AND (profiles.role = 'admin'::text)))));


-- create policy "Users can view classes in their school"
-- on "public"."classes"
-- as permissive
-- for select
-- to public
-- using ((school_id IN ( SELECT profiles.school_id
--    FROM profiles
--   WHERE (profiles.id = auth.uid()))));


-- CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


