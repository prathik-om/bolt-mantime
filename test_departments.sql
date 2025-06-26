-- Test Departments Table
-- Run this in your Supabase SQL editor to debug the departments issue

-- 1. Check if departments table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'departments'
) as table_exists;

-- 2. Check departments table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'departments'
ORDER BY ordinal_position;

-- 3. Check RLS policies on departments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'departments';

-- 4. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'departments';

-- 5. Check existing departments (replace with your school_id)
SELECT * FROM departments WHERE school_id = '54924b8f-53e4-41ee-886b-7a52177fff58';

-- 6. Check existing department codes to avoid conflicts
SELECT code FROM departments WHERE code IS NOT NULL;

-- 7. Try to insert a test department with unique code (replace with your school_id)
INSERT INTO departments (name, code, description, school_id)
VALUES (
    'SQL Test Department ' || EXTRACT(EPOCH FROM NOW())::text,
    'SQL' || EXTRACT(EPOCH FROM NOW())::text,
    'Test department created via SQL',
    '54924b8f-53e4-41ee-886b-7a52177fff58'
)
RETURNING *;

-- 8. Try to insert a test department without code
INSERT INTO departments (name, description, school_id)
VALUES (
    'SQL Test No Code ' || EXTRACT(EPOCH FROM NOW())::text,
    'Test department without code via SQL',
    '54924b8f-53e4-41ee-886b-7a52177fff58'
)
RETURNING *;

-- 9. Check teacher_departments table
SELECT * FROM teacher_departments LIMIT 5;

-- 10. Check courses table
SELECT * FROM courses LIMIT 5;

-- 11. Test the complex query that the page uses
SELECT 
    d.*,
    COUNT(td.teacher_id) as teacher_count,
    COUNT(c.id) as course_count
FROM departments d
LEFT JOIN teacher_departments td ON d.id = td.department_id
LEFT JOIN courses c ON d.id = c.department_id
WHERE d.school_id = '54924b8f-53e4-41ee-886b-7a52177fff58'
GROUP BY d.id, d.name, d.code, d.description, d.school_id, d.created_at, d.updated_at;

-- 12. Check unique constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'departments' 
    AND tc.constraint_type = 'UNIQUE'; 