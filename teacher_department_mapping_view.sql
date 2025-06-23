-- Create a view for teacher-department mapping
CREATE OR REPLACE VIEW teacher_department_mappings AS
SELECT DISTINCT 
    t.id as teacher_id,
    t.first_name,
    t.last_name,
    t.email,
    d.id as department_id,
    d.name as department_name,
    d.code as department_code,
    COUNT(DISTINCT ta.id) as assignment_count,
    COUNT(DISTINCT c.id) as courses_taught,
    t.school_id
FROM teachers t
JOIN teaching_assignments ta ON t.id = ta.teacher_id
JOIN class_offerings co ON ta.class_offering_id = co.id
JOIN courses c ON co.course_id = c.id
JOIN departments d ON c.department_id = d.id
GROUP BY t.id, t.first_name, t.last_name, t.email, d.id, d.name, d.code, t.school_id;

-- Add comment to explain the view
COMMENT ON VIEW teacher_department_mappings IS 'Maps teachers to departments through their course assignments. This view shows which departments each teacher is associated with based on the courses they teach.';

-- Create a function to get teacher's primary department (most assignments)
CREATE OR REPLACE FUNCTION get_teacher_primary_department(teacher_uuid uuid)
RETURNS TABLE(department_id uuid, department_name text, assignment_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tdm.department_id,
        tdm.department_name,
        tdm.assignment_count
    FROM teacher_department_mappings tdm
    WHERE tdm.teacher_id = teacher_uuid
    ORDER BY tdm.assignment_count DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_teacher_primary_department(uuid) IS 'Returns the department where a teacher has the most assignments.'; 