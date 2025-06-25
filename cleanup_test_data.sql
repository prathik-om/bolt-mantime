-- =====================================================
-- CLEANUP SCRIPT FOR TEST DATA AND DUPLICATES
-- =====================================================

-- Remove test teachers by email
DELETE FROM teachers WHERE email = 'test.teacher@school.com';

-- Remove test departments by code
DELETE FROM departments WHERE code = 'TEST';

-- Remove test courses by code
DELETE FROM courses WHERE code = 'TEST101';

-- Remove test schools by name
DELETE FROM schools WHERE name LIKE 'Test School%';

-- Remove test academic years by name
DELETE FROM academic_years WHERE name LIKE 'Test Academic Year%' OR name LIKE 'Updated Academic Year%';

-- Remove test terms by name
DELETE FROM terms WHERE name LIKE 'Test Term%' OR name LIKE 'Updated Term%';

-- Remove test classes by name
DELETE FROM classes WHERE name LIKE 'Test Class%' OR name LIKE 'Updated Class%';

-- Remove test class offerings with periods_per_week = 5 or 6 (common test values)
DELETE FROM class_offerings WHERE periods_per_week IN (5, 6);

-- Remove test teaching assignments with assignment_type in ('manual', 'ai_suggested')
DELETE FROM teaching_assignments WHERE assignment_type IN ('manual', 'ai_suggested');

-- Remove test time slots by slot_name
DELETE FROM time_slots WHERE slot_name LIKE 'Test Period 1%' OR slot_name LIKE 'Updated Period 1%';

-- Remove test holidays by reason
DELETE FROM holidays WHERE reason LIKE 'Christmas Day%' OR reason LIKE 'Updated Christmas Day%';

-- Remove test rooms by name
DELETE FROM rooms WHERE name LIKE 'Test Room%' OR name LIKE 'Updated Room%';

-- Commit changes
COMMIT; 