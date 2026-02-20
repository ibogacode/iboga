-- Add lead source and notes-related fields to partial_intake_forms for Add Client flow
ALTER TABLE public.partial_intake_forms
ADD COLUMN IF NOT EXISTS lead_source TEXT,
ADD COLUMN IF NOT EXISTS lead_source_other TEXT;

COMMENT ON COLUMN public.partial_intake_forms.lead_source IS 'Lead source: instagram, facebook, website, tiktok, youtube, recovery_com, other';
COMMENT ON COLUMN public.partial_intake_forms.lead_source_other IS 'Free text when lead_source is other';
