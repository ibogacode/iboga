-- Function to promote a user to owner role
-- This is useful for creating the first owner account
CREATE OR REPLACE FUNCTION public.promote_to_owner(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  -- If user doesn't exist, return false
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist', user_email;
  END IF;
  
  -- Update profile to owner role
  UPDATE public.profiles
  SET role = 'owner'
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.promote_to_owner(TEXT) TO authenticated;

-- Function to set first user as owner automatically
-- This will make the first user who signs up an owner
CREATE OR REPLACE FUNCTION public.handle_first_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count
  FROM public.profiles;
  
  -- If this is the first user, make them owner
  IF user_count = 0 THEN
    UPDATE public.profiles
    SET role = 'owner'
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically make first user owner
DROP TRIGGER IF EXISTS on_first_user_created ON public.profiles;
CREATE TRIGGER on_first_user_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_user();

