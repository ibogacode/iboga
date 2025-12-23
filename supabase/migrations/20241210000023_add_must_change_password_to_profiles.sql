-- Add must_change_password field to profiles table
-- This flag indicates if a user must change their password on first login

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.must_change_password IS 'Flag to indicate if user must change password on first login';

-- Create index for faster lookups (optional, but useful if querying by this field)
CREATE INDEX IF NOT EXISTS profiles_must_change_password_idx ON public.profiles(must_change_password) WHERE must_change_password = true;

