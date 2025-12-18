-- Add 'admin' role to the profiles table role constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('owner', 'admin', 'manager', 'doctor', 'psych', 'nurse', 'driver', 'patient'));
