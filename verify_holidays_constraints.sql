-- Verify holidays table constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.holidays'::regclass 
AND contype = 'u'
ORDER BY conname; 