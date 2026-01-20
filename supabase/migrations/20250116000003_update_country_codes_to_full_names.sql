-- Update country codes to full country names
-- This migration converts any existing 'US'/'CA' codes to 'United States'/'Canada'

BEGIN;

-- Update patient_intake_forms: convert codes to full names
UPDATE public.patient_intake_forms
SET country = CASE 
  WHEN country = 'US' THEN 'United States'
  WHEN country = 'CA' THEN 'Canada'
  ELSE country
END
WHERE country IN ('US', 'CA');

-- Update partial_intake_forms: convert codes to full names
UPDATE public.partial_intake_forms
SET country = CASE 
  WHEN country = 'US' THEN 'United States'
  WHEN country = 'CA' THEN 'Canada'
  ELSE country
END
WHERE country IN ('US', 'CA');

-- Drop the old check constraint and add new one with full names
ALTER TABLE public.patient_intake_forms
DROP CONSTRAINT IF EXISTS patient_intake_forms_country_check;

ALTER TABLE public.partial_intake_forms
DROP CONSTRAINT IF EXISTS partial_intake_forms_country_check;

-- Add new check constraints with full country names
ALTER TABLE public.patient_intake_forms
ADD CONSTRAINT patient_intake_forms_country_check 
CHECK (country IN ('United States', 'Canada'));

ALTER TABLE public.partial_intake_forms
ADD CONSTRAINT partial_intake_forms_country_check 
CHECK (country IN ('United States', 'Canada'));

-- Update default values
ALTER TABLE public.patient_intake_forms
ALTER COLUMN country SET DEFAULT 'United States';

ALTER TABLE public.partial_intake_forms
ALTER COLUMN country SET DEFAULT 'United States';

COMMIT;
