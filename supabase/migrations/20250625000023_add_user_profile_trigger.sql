-- Add trigger to automatically create profile when new user is created
CREATE TRIGGER trigger_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions for the trigger to work
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT ON auth.users TO postgres;

-- Ensure the profiles table allows the trigger to insert
-- The SECURITY DEFINER function should bypass RLS, but let's make sure
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows the trigger function to insert profiles
CREATE POLICY "Allow trigger to create profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (true); 