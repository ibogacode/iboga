-- Add country field to patient_intake_forms and partial_intake_forms
-- This enables support for both US and Canadian addresses
-- Stores full country names: 'United States' or 'Canada'

BEGIN;

-- Add country field to patient_intake_forms
ALTER TABLE public.patient_intake_forms
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States' CHECK (country IN ('United States', 'Canada'));

-- Add country field to partial_intake_forms
ALTER TABLE public.partial_intake_forms
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States' CHECK (country IN ('United States', 'Canada'));

-- Update existing records to default to United States
UPDATE public.patient_intake_forms
SET country = 'United States'
WHERE country IS NULL;

UPDATE public.partial_intake_forms
SET country = 'United States'
WHERE country IS NULL;

-- Add comments
COMMENT ON COLUMN public.patient_intake_forms.country IS 'Full country name: United States or Canada';
COMMENT ON COLUMN public.partial_intake_forms.country IS 'Full country name: United States or Canada';

COMMIT;
