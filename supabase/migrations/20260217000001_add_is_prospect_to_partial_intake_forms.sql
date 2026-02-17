-- Add is_prospect to partial_intake_forms so Add Client can mark prospect and skip application email
ALTER TABLE public.partial_intake_forms
ADD COLUMN IF NOT EXISTS is_prospect BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.partial_intake_forms.is_prospect IS 'When true, the fill-application email was not sent; profile will get is_prospect when form is completed.';
