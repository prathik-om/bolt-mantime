-- Debug Profile Creation Issue
-- Run this in your Supabase SQL Editor

-- 1. Check if the function exists
SELECT 
    routine_name, 
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'create_admin_profile_with_school';

-- 2. Check current user (replace with your actual user ID)
-- You can find your user ID in the browser console or from the debug page
-- SELECT auth.uid() as current_user_id;

-- 3. Check if you have any schools
SELECT 
    id,
    name,
    user_id,
    created_at
FROM schools 
WHERE user_id = auth.uid();  -- This will use your current user ID

-- 4. Check if you already have a profile
SELECT 
    id,
    role,
    school_id,
    created_at
FROM profiles 
WHERE id = auth.uid();

-- 5. If you have schools but no profile, create one manually:
-- (Uncomment and run this if you have schools but no profile)

/*
INSERT INTO profiles (id, role, school_id)
SELECT 
    auth.uid(),
    'admin',
    s.id
FROM schools s
WHERE s.user_id = auth.uid()
LIMIT 1
ON CONFLICT (id) DO NOTHING;
*/

-- 6. Check the result
SELECT 
    p.id,
    p.role,
    p.school_id,
    s.name as school_name
FROM profiles p
LEFT JOIN schools s ON p.school_id = s.id
WHERE p.id = auth.uid();

-- 7. Test the function manually (if you have a school)
-- (Uncomment and run this to test the function)

/*
SELECT create_admin_profile_with_school(
    auth.uid(),
    (SELECT id FROM schools WHERE user_id = auth.uid() LIMIT 1)
);
*/ 