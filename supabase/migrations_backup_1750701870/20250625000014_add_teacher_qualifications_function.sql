-- Function to get teacher qualifications based on department assignments
-- This function returns all courses that a teacher is qualified to teach based on their department assignments

CREATE OR REPLACE FUNCTION "public"."get_teacher_qualifications"("p_teacher_id" "uuid")
RETURNS TABLE(
    "course_id" "uuid",
    "course_name" "text",
    "course_code" "text",
    "department_id" "uuid",
    "department_name" "text",
    "grade_level" integer,
    "is_primary_department" boolean
)
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

COMMENT ON FUNCTION "public"."get_teacher_qualifications"("p_teacher_id" "uuid") IS 'Returns all courses that a teacher is qualified to teach based on their department assignments. Teachers are automatically qualified for all courses in departments they are assigned to.';

-- Function to get teachers qualified for a specific course
CREATE OR REPLACE FUNCTION "public"."get_teachers_for_course"("p_course_id" "uuid")
RETURNS TABLE(
    "teacher_id" "uuid",
    "teacher_name" "text",
    "teacher_email" "text",
    "department_id" "uuid",
    "department_name" "text",
    "is_primary_department" boolean
)
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

COMMENT ON FUNCTION "public"."get_teachers_for_course"("p_course_id" "uuid") IS 'Returns all teachers qualified to teach a specific course based on their department assignments.';

-- Function to get teacher department summary
CREATE OR REPLACE FUNCTION "public"."get_teacher_department_summary"("p_teacher_id" "uuid")
RETURNS TABLE(
    "department_id" "uuid",
    "department_name" "text",
    "department_code" "text",
    "is_primary" boolean,
    "course_count" bigint,
    "courses" "text"[]
)
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

COMMENT ON FUNCTION "public"."get_teacher_department_summary"("p_teacher_id" "uuid") IS 'Returns a summary of a teacher''s department assignments with course counts and course names.'; 