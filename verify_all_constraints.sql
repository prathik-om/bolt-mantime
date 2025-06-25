-- Verify all unique constraints mentioned by dev lead
-- This will show the actual constraints present in the database DDL

-- 1. Academic Years constraints
SELECT 
    'academic_years' as table_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.academic_years'::regclass 
AND contype = 'u'
ORDER BY conname;

-- 2. Terms constraints
SELECT 
    'terms' as table_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.terms'::regclass 
AND contype = 'u'
ORDER BY conname;

-- 3. Time Slots constraints
SELECT 
    'time_slots' as table_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.time_slots'::regclass 
AND contype = 'u'
ORDER BY conname;

-- 4. Class Offerings constraints
SELECT 
    'class_offerings' as table_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.class_offerings'::regclass 
AND contype = 'u'
ORDER BY conname;

-- 5. Teaching Assignments constraints
SELECT 
    'teaching_assignments' as table_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.teaching_assignments'::regclass 
AND contype = 'u'
ORDER BY conname;

-- 6. Also check for unique indexes (which might be used instead of constraints)
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('academic_years', 'terms', 'time_slots', 'class_offerings', 'teaching_assignments')
AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename, indexname; 