-- Add source to profiles: 'public' (default) or 'admin_owner_added'
-- Used on patient profile to show "Source: Public" or "Source: Admin/Owner added"
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'public'
  CHECK (source IS NULL OR source IN ('public', 'admin_owner_added'));

COMMENT ON COLUMN public.profiles.source IS 'Patient source: public (from public intake) or admin_owner_added (added by admin/owner)';
