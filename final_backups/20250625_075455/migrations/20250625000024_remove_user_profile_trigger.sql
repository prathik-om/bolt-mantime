-- Remove the trigger that creates profiles on new user signup
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users; 