-- Add email tracking fields to patient_intake_forms table
ALTER TABLE public.patient_intake_forms 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS calendar_link_clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

-- Create index for tracking token lookups
CREATE INDEX IF NOT EXISTS patient_intake_forms_tracking_token_idx 
ON public.patient_intake_forms(tracking_token);

