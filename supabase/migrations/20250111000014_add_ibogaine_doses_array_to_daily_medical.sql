-- =============================================================================
-- Add ibogaine_doses JSONB array to support multiple doses per day
-- =============================================================================
-- Changes from single dose/time to array of doses to support multiple
-- administrations with different amounts and times
-- =============================================================================

BEGIN;

-- Add JSONB field for multiple ibogaine doses
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS ibogaine_doses JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single dose/time to array format if they exist
UPDATE public.patient_management_daily_medical_updates
SET ibogaine_doses = CASE
  WHEN ibogaine_dose IS NOT NULL AND ibogaine_time IS NOT NULL THEN
    jsonb_build_array(
      jsonb_build_object(
        'dose', ibogaine_dose,
        'time', ibogaine_time
      )
    )
  WHEN ibogaine_dose IS NOT NULL THEN
    jsonb_build_array(
      jsonb_build_object(
        'dose', ibogaine_dose,
        'time', NULL
      )
    )
  ELSE '[]'::jsonb
END
WHERE ibogaine_doses IS NULL OR ibogaine_doses = '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN public.patient_management_daily_medical_updates.ibogaine_doses IS 'Array of ibogaine doses: [{"dose": 500, "time": "10:00"}, {"dose": 300, "time": "14:00"}]';

COMMIT;
