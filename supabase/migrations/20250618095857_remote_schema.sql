create type "public"."day_of_week" as enum ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

create type "public"."time_slot_type" as enum ('lecture', 'lab', 'tutorial', 'other');

create sequence "public"."scheduled_lessons_id_seq";

drop trigger if exists "update_teachers_updated_at" on "public"."teachers";

drop trigger if exists "validate_timetable_entry_trigger" on "public"."timetable_entries";

drop policy "Users can access academic years for their schools" on "public"."academic_years";

drop policy "Users can access class sections for their schools" on "public"."class_sections";

drop policy "Users can access holidays for their schools" on "public"."holidays";

drop policy "Users can access rooms for their schools" on "public"."rooms";

drop policy "Users can access their own school" on "public"."schools";

drop policy "Users can access subjects for their schools" on "public"."subjects";

drop policy "Users can access teachers for their schools" on "public"."teachers";

drop policy "Users can access terms for their schools" on "public"."terms";

drop policy "Users can access time slots for their schools" on "public"."time_slots";

revoke delete on table "public"."scheduling_conflicts" from "anon";

revoke insert on table "public"."scheduling_conflicts" from "anon";

revoke references on table "public"."scheduling_conflicts" from "anon";

revoke select on table "public"."scheduling_conflicts" from "anon";

revoke trigger on table "public"."scheduling_conflicts" from "anon";

revoke truncate on table "public"."scheduling_conflicts" from "anon";

revoke update on table "public"."scheduling_conflicts" from "anon";

revoke delete on table "public"."scheduling_conflicts" from "authenticated";

revoke insert on table "public"."scheduling_conflicts" from "authenticated";

revoke references on table "public"."scheduling_conflicts" from "authenticated";

revoke select on table "public"."scheduling_conflicts" from "authenticated";

revoke trigger on table "public"."scheduling_conflicts" from "authenticated";

revoke truncate on table "public"."scheduling_conflicts" from "authenticated";

revoke update on table "public"."scheduling_conflicts" from "authenticated";

revoke delete on table "public"."scheduling_conflicts" from "service_role";

revoke insert on table "public"."scheduling_conflicts" from "service_role";

revoke references on table "public"."scheduling_conflicts" from "service_role";

revoke select on table "public"."scheduling_conflicts" from "service_role";

revoke trigger on table "public"."scheduling_conflicts" from "service_role";

revoke truncate on table "public"."scheduling_conflicts" from "service_role";

revoke update on table "public"."scheduling_conflicts" from "service_role";

revoke delete on table "public"."timetable_entries" from "anon";

revoke insert on table "public"."timetable_entries" from "anon";

revoke references on table "public"."timetable_entries" from "anon";

revoke select on table "public"."timetable_entries" from "anon";

revoke trigger on table "public"."timetable_entries" from "anon";

revoke truncate on table "public"."timetable_entries" from "anon";

revoke update on table "public"."timetable_entries" from "anon";

revoke delete on table "public"."timetable_entries" from "authenticated";

revoke insert on table "public"."timetable_entries" from "authenticated";

revoke references on table "public"."timetable_entries" from "authenticated";

revoke select on table "public"."timetable_entries" from "authenticated";

revoke trigger on table "public"."timetable_entries" from "authenticated";

revoke truncate on table "public"."timetable_entries" from "authenticated";

revoke update on table "public"."timetable_entries" from "authenticated";

revoke delete on table "public"."timetable_entries" from "service_role";

revoke insert on table "public"."timetable_entries" from "service_role";

revoke references on table "public"."timetable_entries" from "service_role";

revoke select on table "public"."timetable_entries" from "service_role";

revoke trigger on table "public"."timetable_entries" from "service_role";

revoke truncate on table "public"."timetable_entries" from "service_role";

revoke update on table "public"."timetable_entries" from "service_role";

revoke delete on table "public"."timetables" from "anon";

revoke insert on table "public"."timetables" from "anon";

revoke references on table "public"."timetables" from "anon";

revoke select on table "public"."timetables" from "anon";

revoke trigger on table "public"."timetables" from "anon";

revoke truncate on table "public"."timetables" from "anon";

revoke update on table "public"."timetables" from "anon";

revoke delete on table "public"."timetables" from "authenticated";

revoke insert on table "public"."timetables" from "authenticated";

revoke references on table "public"."timetables" from "authenticated";

revoke select on table "public"."timetables" from "authenticated";

revoke trigger on table "public"."timetables" from "authenticated";

revoke truncate on table "public"."timetables" from "authenticated";

revoke update on table "public"."timetables" from "authenticated";

revoke delete on table "public"."timetables" from "service_role";

revoke insert on table "public"."timetables" from "service_role";

revoke references on table "public"."timetables" from "service_role";

revoke select on table "public"."timetables" from "service_role";

revoke trigger on table "public"."timetables" from "service_role";

revoke truncate on table "public"."timetables" from "service_role";

revoke update on table "public"."timetables" from "service_role";

alter table "public"."academic_years" drop constraint "academic_years_name_check";

alter table "public"."academic_years" drop constraint "academic_years_school_id_name_key";

alter table "public"."class_offerings" drop constraint "class_offerings_class_section_id_subject_id_term_id_key";

alter table "public"."class_offerings" drop constraint "class_offerings_gap_check";

alter table "public"."class_offerings" drop constraint "class_offerings_periods_check";

alter table "public"."class_sections" drop constraint "class_sections_academic_year_id_fkey";

alter table "public"."class_sections" drop constraint "class_sections_capacity_check";

alter table "public"."class_sections" drop constraint "class_sections_grade_check";

alter table "public"."class_sections" drop constraint "class_sections_homeroom_teacher_id_fkey";

alter table "public"."class_sections" drop constraint "class_sections_school_id_academic_year_id_grade_level_secti_key";

alter table "public"."class_sections" drop constraint "class_sections_section_check";

alter table "public"."holidays" drop constraint "holidays_academic_year_id_fkey";

alter table "public"."holidays" drop constraint "holidays_date_check";

alter table "public"."holidays" drop constraint "holidays_name_check";

alter table "public"."rooms" drop constraint "rooms_capacity_check";

alter table "public"."rooms" drop constraint "rooms_name_check";

alter table "public"."rooms" drop constraint "rooms_school_id_room_number_key";

alter table "public"."rooms" drop constraint "rooms_type_check";

alter table "public"."scheduling_conflicts" drop constraint "scheduling_conflicts_severity_check";

alter table "public"."scheduling_conflicts" drop constraint "scheduling_conflicts_timetable_id_fkey";

alter table "public"."scheduling_conflicts" drop constraint "scheduling_conflicts_type_check";

alter table "public"."schools" drop constraint "schools_email_format";

alter table "public"."schools" drop constraint "schools_name_check";

alter table "public"."subjects" drop constraint "subjects_code_check";

alter table "public"."subjects" drop constraint "subjects_name_check";

alter table "public"."subjects" drop constraint "subjects_school_id_code_key";

alter table "public"."teacher_qualifications" drop constraint "teacher_qualifications_experience_check";

alter table "public"."teacher_qualifications" drop constraint "teacher_qualifications_level_check";

alter table "public"."teachers" drop constraint "teachers_email_format";

alter table "public"."teachers" drop constraint "teachers_max_periods_check";

alter table "public"."teachers" drop constraint "teachers_name_check";

alter table "public"."teachers" drop constraint "teachers_school_id_employee_id_key";

alter table "public"."teaching_assignments" drop constraint "teaching_assignments_class_offering_id_teacher_id_assignmen_key";

alter table "public"."teaching_assignments" drop constraint "teaching_assignments_type_check";

alter table "public"."terms" drop constraint "terms_academic_year_id_name_key";

alter table "public"."terms" drop constraint "terms_name_check";

alter table "public"."time_slots" drop constraint "time_slots_day_check";

alter table "public"."time_slots" drop constraint "time_slots_period_check";

alter table "public"."time_slots" drop constraint "time_slots_school_id_day_of_week_period_number_key";

alter table "public"."time_slots" drop constraint "time_slots_type_check";

alter table "public"."timetable_entries" drop constraint "timetable_entries_class_offering_id_fkey";

alter table "public"."timetable_entries" drop constraint "timetable_entries_room_id_fkey";

alter table "public"."timetable_entries" drop constraint "timetable_entries_teacher_id_fkey";

alter table "public"."timetable_entries" drop constraint "timetable_entries_time_slot_id_fkey";

alter table "public"."timetable_entries" drop constraint "timetable_entries_timetable_id_fkey";

alter table "public"."timetable_entries" drop constraint "timetable_entries_timetable_id_time_slot_id_room_id_key";

alter table "public"."timetable_entries" drop constraint "timetable_entries_timetable_id_time_slot_id_teacher_id_key";

alter table "public"."timetable_entries" drop constraint "timetable_entries_type_check";

alter table "public"."timetables" drop constraint "timetables_created_by_fkey";

alter table "public"."timetables" drop constraint "timetables_name_check";

alter table "public"."timetables" drop constraint "timetables_school_id_fkey";

alter table "public"."timetables" drop constraint "timetables_score_check";

alter table "public"."timetables" drop constraint "timetables_status_check";

alter table "public"."timetables" drop constraint "timetables_term_id_fkey";

alter table "public"."academic_years" drop constraint "academic_years_school_id_fkey";

alter table "public"."class_offerings" drop constraint "class_offerings_class_section_id_fkey";

alter table "public"."class_offerings" drop constraint "class_offerings_subject_id_fkey";

alter table "public"."class_offerings" drop constraint "class_offerings_term_id_fkey";

alter table "public"."class_sections" drop constraint "class_sections_school_id_fkey";

alter table "public"."rooms" drop constraint "rooms_school_id_fkey";

alter table "public"."subjects" drop constraint "subjects_school_id_fkey";

alter table "public"."teacher_qualifications" drop constraint "teacher_qualifications_subject_id_fkey";

alter table "public"."teacher_qualifications" drop constraint "teacher_qualifications_teacher_id_fkey";

alter table "public"."teachers" drop constraint "teachers_school_id_fkey";

alter table "public"."teaching_assignments" drop constraint "teaching_assignments_class_offering_id_fkey";

alter table "public"."teaching_assignments" drop constraint "teaching_assignments_teacher_id_fkey";

alter table "public"."terms" drop constraint "terms_academic_year_id_fkey";

alter table "public"."time_slots" drop constraint "time_slots_school_id_fkey";

drop function if exists "public"."validate_timetable_entry"();

alter table "public"."scheduling_conflicts" drop constraint "scheduling_conflicts_pkey";

alter table "public"."timetable_entries" drop constraint "timetable_entries_pkey";

alter table "public"."timetables" drop constraint "timetables_pkey";

drop index if exists "public"."academic_years_school_id_name_key";

drop index if exists "public"."class_offerings_class_section_id_subject_id_term_id_key";

drop index if exists "public"."class_sections_school_id_academic_year_id_grade_level_secti_key";

drop index if exists "public"."idx_academic_years_school_current";

drop index if exists "public"."idx_class_offerings_section";

drop index if exists "public"."idx_class_offerings_subject";

drop index if exists "public"."idx_class_sections_school_year";

drop index if exists "public"."idx_teacher_qualifications_subject";

drop index if exists "public"."idx_teacher_qualifications_teacher";

drop index if exists "public"."idx_teachers_school_active";

drop index if exists "public"."idx_teaching_assignments_offering";

drop index if exists "public"."idx_teaching_assignments_teacher";

drop index if exists "public"."idx_terms_academic_year_current";

drop index if exists "public"."idx_time_slots_school_day";

drop index if exists "public"."idx_timetable_entries_room";

drop index if exists "public"."idx_timetable_entries_teacher";

drop index if exists "public"."idx_timetable_entries_time_slot";

drop index if exists "public"."idx_timetable_entries_timetable";

drop index if exists "public"."rooms_school_id_room_number_key";

drop index if exists "public"."scheduling_conflicts_pkey";

drop index if exists "public"."subjects_school_id_code_key";

drop index if exists "public"."teachers_school_id_employee_id_key";

drop index if exists "public"."teaching_assignments_class_offering_id_teacher_id_assignmen_key";

drop index if exists "public"."terms_academic_year_id_name_key";

drop index if exists "public"."time_slots_school_id_day_of_week_period_number_key";

drop index if exists "public"."timetable_entries_pkey";

drop index if exists "public"."timetable_entries_timetable_id_time_slot_id_room_id_key";

drop index if exists "public"."timetable_entries_timetable_id_time_slot_id_teacher_id_key";

drop index if exists "public"."timetables_pkey";

drop table "public"."scheduling_conflicts";

drop table "public"."timetable_entries";

drop table "public"."timetables";

create table "public"."scheduled_lessons" (
    "id" bigint not null default nextval('scheduled_lessons_id_seq'::regclass),
    "generation_id" uuid not null,
    "teaching_assignment_id" uuid not null,
    "room_id" uuid,
    "date" date not null,
    "timeslot_id" uuid not null,
    "status" text not null default 'Scheduled'::text,
    "substitute_teacher_id" uuid,
    "notes" text
);


create table "public"."timetable_generations" (
    "id" uuid not null default gen_random_uuid(),
    "term_id" uuid not null,
    "generated_by" uuid,
    "generated_at" timestamp with time zone default now(),
    "status" text not null default 'draft'::text,
    "notes" text
);


alter table "public"."academic_years" drop column "created_at";

alter table "public"."academic_years" drop column "is_current";

alter table "public"."academic_years" alter column "id" set default gen_random_uuid();

alter table "public"."academic_years" disable row level security;

alter table "public"."class_offerings" drop column "created_at";

alter table "public"."class_offerings" drop column "max_gap_between_periods";

alter table "public"."class_offerings" drop column "min_gap_between_periods";

alter table "public"."class_offerings" drop column "preferred_room_type";

alter table "public"."class_offerings" drop column "requires_consecutive_periods";

alter table "public"."class_offerings" alter column "id" set default gen_random_uuid();

alter table "public"."class_offerings" disable row level security;

alter table "public"."class_sections" drop column "academic_year_id";

alter table "public"."class_sections" drop column "created_at";

alter table "public"."class_sections" drop column "homeroom_teacher_id";

alter table "public"."class_sections" drop column "max_capacity";

alter table "public"."class_sections" drop column "section_name";

alter table "public"."class_sections" add column "class_teacher_id" uuid;

alter table "public"."class_sections" add column "is_active" boolean default true;

alter table "public"."class_sections" add column "name" text not null;

alter table "public"."class_sections" alter column "id" set default gen_random_uuid();

alter table "public"."class_sections" alter column "student_count" set default 30;

alter table "public"."class_sections" disable row level security;

alter table "public"."holidays" drop column "academic_year_id";

alter table "public"."holidays" drop column "created_at";

alter table "public"."holidays" drop column "end_date";

alter table "public"."holidays" drop column "is_recurring";

alter table "public"."holidays" drop column "name";

alter table "public"."holidays" drop column "start_date";

alter table "public"."holidays" add column "date" date not null;

alter table "public"."holidays" add column "reason" text not null;

alter table "public"."holidays" add column "term_id" uuid not null;

alter table "public"."holidays" alter column "id" set default gen_random_uuid();

alter table "public"."holidays" disable row level security;

alter table "public"."rooms" drop column "building";

alter table "public"."rooms" drop column "created_at";

alter table "public"."rooms" drop column "floor_number";

alter table "public"."rooms" drop column "has_computers";

alter table "public"."rooms" drop column "has_lab_equipment";

alter table "public"."rooms" drop column "has_projector";

alter table "public"."rooms" drop column "is_available";

alter table "public"."rooms" drop column "room_number";

alter table "public"."rooms" add column "is_active" boolean default true;

alter table "public"."rooms" alter column "id" set default gen_random_uuid();

alter table "public"."rooms" alter column "room_type" drop default;

alter table "public"."rooms" alter column "room_type" set not null;

alter table "public"."rooms" disable row level security;

alter table "public"."schools" drop column "email";

alter table "public"."schools" drop column "phone";

alter table "public"."schools" drop column "principal_name";

alter table "public"."schools" add column "board_affiliation" text;

alter table "public"."schools" alter column "id" set default gen_random_uuid();

alter table "public"."schools" disable row level security;

alter table "public"."subjects" drop column "created_at";

alter table "public"."subjects" drop column "department";

alter table "public"."subjects" drop column "description";

alter table "public"."subjects" drop column "is_core_subject";

alter table "public"."subjects" drop column "requires_computer";

alter table "public"."subjects" drop column "requires_lab";

alter table "public"."subjects" drop column "requires_projector";

alter table "public"."subjects" add column "is_active" boolean default true;

alter table "public"."subjects" add column "required_room_type" text;

alter table "public"."subjects" add column "subject_type" text;

alter table "public"."subjects" alter column "code" drop not null;

alter table "public"."subjects" alter column "id" set default gen_random_uuid();

alter table "public"."subjects" disable row level security;

alter table "public"."teacher_constraints" disable row level security;

alter table "public"."teacher_qualifications" drop column "certification_date";

alter table "public"."teacher_qualifications" drop column "created_at";

alter table "public"."teacher_qualifications" drop column "qualification_level";

alter table "public"."teacher_qualifications" drop column "years_experience";

alter table "public"."teacher_qualifications" alter column "id" set default gen_random_uuid();

alter table "public"."teacher_qualifications" disable row level security;

alter table "public"."teachers" drop column "department";

alter table "public"."teachers" drop column "employee_id";

alter table "public"."teachers" drop column "hire_date";

alter table "public"."teachers" drop column "max_periods_per_day";

alter table "public"."teachers" drop column "phone";

alter table "public"."teachers" add column "employment_type" text default 'full_time'::text;

alter table "public"."teachers" add column "user_id" uuid;

alter table "public"."teachers" alter column "id" set default gen_random_uuid();

alter table "public"."teachers" alter column "max_periods_per_week" set default 40;

alter table "public"."teachers" disable row level security;

alter table "public"."teaching_assignments" drop column "assignment_type";

alter table "public"."teaching_assignments" drop column "created_at";

alter table "public"."teaching_assignments" alter column "id" set default gen_random_uuid();

alter table "public"."teaching_assignments" disable row level security;

alter table "public"."terms" drop column "created_at";

alter table "public"."terms" drop column "is_current";

alter table "public"."terms" alter column "id" set default gen_random_uuid();

alter table "public"."terms" disable row level security;

alter table "public"."time_slots" drop column "created_at";

alter table "public"."time_slots" drop column "slot_type";

alter table "public"."time_slots" add column "slot_name" text;

alter table "public"."time_slots" alter column "id" set default gen_random_uuid();

alter table "public"."time_slots" alter column "period_number" drop not null;

alter table "public"."time_slots" disable row level security;

alter sequence "public"."scheduled_lessons_id_seq" owned by "public"."scheduled_lessons"."id";

CREATE UNIQUE INDEX class_offerings_term_id_class_section_id_subject_id_key ON public.class_offerings USING btree (term_id, class_section_id, subject_id);

CREATE UNIQUE INDEX class_sections_school_id_grade_level_name_key ON public.class_sections USING btree (school_id, grade_level, name);

CREATE UNIQUE INDEX holidays_date_key ON public.holidays USING btree (date);

CREATE UNIQUE INDEX scheduled_lessons_pkey ON public.scheduled_lessons USING btree (id);

CREATE UNIQUE INDEX subjects_school_id_name_key ON public.subjects USING btree (school_id, name);

CREATE UNIQUE INDEX teaching_assignments_class_offering_id_teacher_id_key ON public.teaching_assignments USING btree (class_offering_id, teacher_id);

CREATE UNIQUE INDEX time_slots_school_id_day_of_week_start_time_key ON public.time_slots USING btree (school_id, day_of_week, start_time);

CREATE UNIQUE INDEX timetable_generations_pkey ON public.timetable_generations USING btree (id);

alter table "public"."scheduled_lessons" add constraint "scheduled_lessons_pkey" PRIMARY KEY using index "scheduled_lessons_pkey";

alter table "public"."timetable_generations" add constraint "timetable_generations_pkey" PRIMARY KEY using index "timetable_generations_pkey";

alter table "public"."class_offerings" add constraint "class_offerings_term_id_class_section_id_subject_id_key" UNIQUE using index "class_offerings_term_id_class_section_id_subject_id_key";

alter table "public"."class_sections" add constraint "class_sections_class_teacher_id_fkey" FOREIGN KEY (class_teacher_id) REFERENCES teachers(id) not valid;

alter table "public"."class_sections" validate constraint "class_sections_class_teacher_id_fkey";

alter table "public"."class_sections" add constraint "class_sections_school_id_grade_level_name_key" UNIQUE using index "class_sections_school_id_grade_level_name_key";

alter table "public"."holidays" add constraint "holidays_date_key" UNIQUE using index "holidays_date_key";

alter table "public"."holidays" add constraint "holidays_term_id_fkey" FOREIGN KEY (term_id) REFERENCES terms(id) not valid;

alter table "public"."holidays" validate constraint "holidays_term_id_fkey";

alter table "public"."scheduled_lessons" add constraint "scheduled_lessons_generation_id_fkey" FOREIGN KEY (generation_id) REFERENCES timetable_generations(id) not valid;

alter table "public"."scheduled_lessons" validate constraint "scheduled_lessons_generation_id_fkey";

alter table "public"."scheduled_lessons" add constraint "scheduled_lessons_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) not valid;

alter table "public"."scheduled_lessons" validate constraint "scheduled_lessons_room_id_fkey";

alter table "public"."scheduled_lessons" add constraint "scheduled_lessons_substitute_teacher_id_fkey" FOREIGN KEY (substitute_teacher_id) REFERENCES teachers(id) not valid;

alter table "public"."scheduled_lessons" validate constraint "scheduled_lessons_substitute_teacher_id_fkey";

alter table "public"."scheduled_lessons" add constraint "scheduled_lessons_teaching_assignment_id_fkey" FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id) not valid;

alter table "public"."scheduled_lessons" validate constraint "scheduled_lessons_teaching_assignment_id_fkey";

alter table "public"."scheduled_lessons" add constraint "scheduled_lessons_timeslot_id_fkey" FOREIGN KEY (timeslot_id) REFERENCES time_slots(id) not valid;

alter table "public"."scheduled_lessons" validate constraint "scheduled_lessons_timeslot_id_fkey";

alter table "public"."subjects" add constraint "subjects_school_id_name_key" UNIQUE using index "subjects_school_id_name_key";

alter table "public"."teachers" add constraint "teachers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."teachers" validate constraint "teachers_user_id_fkey";

alter table "public"."teaching_assignments" add constraint "teaching_assignments_class_offering_id_teacher_id_key" UNIQUE using index "teaching_assignments_class_offering_id_teacher_id_key";

alter table "public"."time_slots" add constraint "time_slots_day_of_week_check" CHECK (((day_of_week >= 1) AND (day_of_week <= 7))) not valid;

alter table "public"."time_slots" validate constraint "time_slots_day_of_week_check";

alter table "public"."time_slots" add constraint "time_slots_school_id_day_of_week_start_time_key" UNIQUE using index "time_slots_school_id_day_of_week_start_time_key";

alter table "public"."timetable_generations" add constraint "timetable_generations_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES auth.users(id) not valid;

alter table "public"."timetable_generations" validate constraint "timetable_generations_generated_by_fkey";

alter table "public"."timetable_generations" add constraint "timetable_generations_term_id_fkey" FOREIGN KEY (term_id) REFERENCES terms(id) not valid;

alter table "public"."timetable_generations" validate constraint "timetable_generations_term_id_fkey";

alter table "public"."academic_years" add constraint "academic_years_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) not valid;

alter table "public"."academic_years" validate constraint "academic_years_school_id_fkey";

alter table "public"."class_offerings" add constraint "class_offerings_class_section_id_fkey" FOREIGN KEY (class_section_id) REFERENCES class_sections(id) not valid;

alter table "public"."class_offerings" validate constraint "class_offerings_class_section_id_fkey";

alter table "public"."class_offerings" add constraint "class_offerings_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) not valid;

alter table "public"."class_offerings" validate constraint "class_offerings_subject_id_fkey";

alter table "public"."class_offerings" add constraint "class_offerings_term_id_fkey" FOREIGN KEY (term_id) REFERENCES terms(id) not valid;

alter table "public"."class_offerings" validate constraint "class_offerings_term_id_fkey";

alter table "public"."class_sections" add constraint "class_sections_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) not valid;

alter table "public"."class_sections" validate constraint "class_sections_school_id_fkey";

alter table "public"."rooms" add constraint "rooms_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) not valid;

alter table "public"."rooms" validate constraint "rooms_school_id_fkey";

alter table "public"."subjects" add constraint "subjects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) not valid;

alter table "public"."subjects" validate constraint "subjects_school_id_fkey";

alter table "public"."teacher_qualifications" add constraint "teacher_qualifications_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) not valid;

alter table "public"."teacher_qualifications" validate constraint "teacher_qualifications_subject_id_fkey";

alter table "public"."teacher_qualifications" add constraint "teacher_qualifications_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) not valid;

alter table "public"."teacher_qualifications" validate constraint "teacher_qualifications_teacher_id_fkey";

alter table "public"."teachers" add constraint "teachers_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) not valid;

alter table "public"."teachers" validate constraint "teachers_school_id_fkey";

alter table "public"."teaching_assignments" add constraint "teaching_assignments_class_offering_id_fkey" FOREIGN KEY (class_offering_id) REFERENCES class_offerings(id) not valid;

alter table "public"."teaching_assignments" validate constraint "teaching_assignments_class_offering_id_fkey";

alter table "public"."teaching_assignments" add constraint "teaching_assignments_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) not valid;

alter table "public"."teaching_assignments" validate constraint "teaching_assignments_teacher_id_fkey";

alter table "public"."terms" add constraint "terms_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) not valid;

alter table "public"."terms" validate constraint "terms_academic_year_id_fkey";

alter table "public"."time_slots" add constraint "time_slots_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) not valid;

alter table "public"."time_slots" validate constraint "time_slots_school_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.set_holiday_school_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- For now, we'll set a default school_id
  -- You should update this with your actual default school_id
  NEW.school_id := '00000000-0000-0000-0000-000000000000';
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_term_school_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
     BEGIN
       SELECT ay.school_id INTO NEW.school_id
       FROM academic_years ay
       WHERE ay.id = NEW.academic_year_id;
       RETURN NEW;
     END;
     $function$
;

CREATE OR REPLACE FUNCTION public.validate_term_dates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE acad_year_start_date date; acad_year_end_date date;
BEGIN
  SELECT start_date, end_date INTO acad_year_start_date, acad_year_end_date FROM public.academic_years WHERE id = NEW.academic_year_id;
  IF (NEW.start_date < acad_year_start_date OR NEW.end_date > acad_year_end_date) THEN
    RAISE EXCEPTION 'Term dates must be within the parent academic year dates.';
  END IF;
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."scheduled_lessons" to "anon";

grant insert on table "public"."scheduled_lessons" to "anon";

grant references on table "public"."scheduled_lessons" to "anon";

grant select on table "public"."scheduled_lessons" to "anon";

grant trigger on table "public"."scheduled_lessons" to "anon";

grant truncate on table "public"."scheduled_lessons" to "anon";

grant update on table "public"."scheduled_lessons" to "anon";

grant delete on table "public"."scheduled_lessons" to "authenticated";

grant insert on table "public"."scheduled_lessons" to "authenticated";

grant references on table "public"."scheduled_lessons" to "authenticated";

grant select on table "public"."scheduled_lessons" to "authenticated";

grant trigger on table "public"."scheduled_lessons" to "authenticated";

grant truncate on table "public"."scheduled_lessons" to "authenticated";

grant update on table "public"."scheduled_lessons" to "authenticated";

grant delete on table "public"."scheduled_lessons" to "service_role";

grant insert on table "public"."scheduled_lessons" to "service_role";

grant references on table "public"."scheduled_lessons" to "service_role";

grant select on table "public"."scheduled_lessons" to "service_role";

grant trigger on table "public"."scheduled_lessons" to "service_role";

grant truncate on table "public"."scheduled_lessons" to "service_role";

grant update on table "public"."scheduled_lessons" to "service_role";

grant delete on table "public"."timetable_generations" to "anon";

grant insert on table "public"."timetable_generations" to "anon";

grant references on table "public"."timetable_generations" to "anon";

grant select on table "public"."timetable_generations" to "anon";

grant trigger on table "public"."timetable_generations" to "anon";

grant truncate on table "public"."timetable_generations" to "anon";

grant update on table "public"."timetable_generations" to "anon";

grant delete on table "public"."timetable_generations" to "authenticated";

grant insert on table "public"."timetable_generations" to "authenticated";

grant references on table "public"."timetable_generations" to "authenticated";

grant select on table "public"."timetable_generations" to "authenticated";

grant trigger on table "public"."timetable_generations" to "authenticated";

grant truncate on table "public"."timetable_generations" to "authenticated";

grant update on table "public"."timetable_generations" to "authenticated";

grant delete on table "public"."timetable_generations" to "service_role";

grant insert on table "public"."timetable_generations" to "service_role";

grant references on table "public"."timetable_generations" to "service_role";

grant select on table "public"."timetable_generations" to "service_role";

grant trigger on table "public"."timetable_generations" to "service_role";

grant truncate on table "public"."timetable_generations" to "service_role";

grant update on table "public"."timetable_generations" to "service_role";

CREATE TRIGGER validate_term_dates_before_insert_update BEFORE INSERT OR UPDATE ON public.terms FOR EACH ROW EXECUTE FUNCTION validate_term_dates();


