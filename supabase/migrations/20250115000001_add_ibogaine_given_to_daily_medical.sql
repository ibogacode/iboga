-- =============================================================================
-- Add ibogaine_given field to daily medical update
-- =============================================================================
-- Adds a yes/no field to indicate whether ibogaine was given to the patient
-- This allows the form to conditionally show/hide the dosage fields
-- =============================================================================

BEGIN;

-- Add ibogaine_given field
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS ibogaine_given TEXT CHECK (ibogaine_given IN ('yes', 'no'));

-- Set default value for existing records based on whether they have ibogaine data
-- If they have ibogaine_doses, ibogaine_dose, or ibogaine_dose_time, set to 'yes', otherwise 'no'
UPDATE public.patient_management_daily_medical_updates
SET ibogaine_given = CASE
  WHEN ibogaine_doses IS NOT NULL AND jsonb_typeof(ibogaine_doses) = 'array' AND jsonb_array_length(ibogaine_doses) > 0 THEN 'yes'
  WHEN ibogaine_dose IS NOT NULL AND ibogaine_dose > 0 THEN 'yes'
  WHEN ibogaine_dose_time IS NOT NULL AND ibogaine_dose_time != '' THEN 'yes'
  ELSE 'no'
END
WHERE ibogaine_given IS NULL;

-- Add comment
COMMENT ON COLUMN public.patient_management_daily_medical_updates.ibogaine_given IS 'Whether ibogaine was given to the patient: yes or no';

COMMIT;
