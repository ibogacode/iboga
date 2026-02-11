-- Add prospect status fields to profiles table.
-- When is_prospect = true, all reminder emails are disabled for this profile.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_prospect BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prospect_marked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS prospect_marked_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_profiles_is_prospect ON public.profiles(is_prospect) WHERE is_prospect = TRUE;

COMMENT ON COLUMN public.profiles.is_prospect IS 'When true, all reminder emails are disabled for this profile';
COMMENT ON COLUMN public.profiles.prospect_marked_at IS 'Timestamp when profile was marked as prospect';
COMMENT ON COLUMN public.profiles.prospect_marked_by IS 'User ID who marked the profile as prospect';
