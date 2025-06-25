-- Remove the automatic profile creation trigger (if it still exists)
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;

-- Drop the function as well since we're not using it anymore
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a better function for creating profiles during onboarding
CREATE OR REPLACE FUNCTION create_admin_profile_with_school(
    p_user_id UUID,
    p_school_id UUID
)
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
BEGIN
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Profile already exists for user %', p_user_id;
    END IF;
    
    -- Check if school exists and user owns it
    IF NOT EXISTS (
        SELECT 1 FROM public.schools 
        WHERE id = p_school_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'School not found or user does not own school %', p_school_id;
    END IF;
    
    -- Create the profile
    INSERT INTO public.profiles (id, role, school_id)
    VALUES (p_user_id, 'admin', p_school_id)
    RETURNING id INTO profile_id;
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_admin_profile_with_school(UUID, UUID) TO authenticated;

-- Add a policy to allow authenticated users to create their own profiles
CREATE POLICY "Users can create their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure the trigger policy allows profile creation
CREATE POLICY "Allow profile creation during onboarding" ON public.profiles
FOR INSERT WITH CHECK (true);

COMMENT ON FUNCTION create_admin_profile_with_school(UUID, UUID) IS 
'Creates an admin profile for a user with a specific school. 
This function should be called during the onboarding process after school creation.'; 