-- Migration: Only migrate subjects not already in departments, then drop the subjects table

-- 1. Insert only missing subjects into departments
INSERT INTO departments (id, name, school_id)
SELECT s.id, s.name, s.school_id
FROM subjects s
LEFT JOIN departments d ON s.id = d.id
WHERE d.id IS NULL;

-- 2. Drop the subjects table
DROP TABLE IF EXISTS subjects CASCADE; 