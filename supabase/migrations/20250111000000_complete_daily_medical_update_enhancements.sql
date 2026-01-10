-- =============================================================================
-- Complete Daily Medical Update Form Enhancements
-- =============================================================================
-- This migration combines all enhancements to the daily medical update form:
-- 1. Detailed vital signs (blood pressure, heart rate, O2 saturation) for Morning/Afternoon/Night
-- 2. Client presence tracking for each time period
-- 3. Vital signs checkboxes (which specific vitals were checked)
-- 4. Ibogaine dose and time fields (separate fields)
-- 5. Ibogaine frequency field
-- 6. Submitter and inspector name fields
-- 7. Multiple ibogaine doses support (JSONB array)
-- 8. Multiple vitals photos support (JSONB array)
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Detailed Vital Signs Fields
-- =============================================================================
-- Add specific fields for blood pressure, heart rate, and oxygen saturation
-- for each time period (Morning, Afternoon, Night)

ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS morning_blood_pressure TEXT,
  ADD COLUMN IF NOT EXISTS morning_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS morning_oxygen_saturation INTEGER,
  ADD COLUMN IF NOT EXISTS afternoon_blood_pressure TEXT,
  ADD COLUMN IF NOT EXISTS afternoon_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS afternoon_oxygen_saturation INTEGER,
  ADD COLUMN IF NOT EXISTS night_blood_pressure TEXT,
  ADD COLUMN IF NOT EXISTS night_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS night_oxygen_saturation INTEGER;

-- Add constraints for heart rate (reasonable range: 30-200 bpm)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_medical_morning_heart_rate_check'
  ) THEN
    ALTER TABLE public.patient_management_daily_medical_updates
      ADD CONSTRAINT daily_medical_morning_heart_rate_check 
      CHECK (morning_heart_rate IS NULL OR (morning_heart_rate >= 30 AND morning_heart_rate <= 200));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_medical_afternoon_heart_rate_check'
  ) THEN
    ALTER TABLE public.patient_management_daily_medical_updates
      ADD CONSTRAINT daily_medical_afternoon_heart_rate_check 
      CHECK (afternoon_heart_rate IS NULL OR (afternoon_heart_rate >= 30 AND afternoon_heart_rate <= 200));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_medical_night_heart_rate_check'
  ) THEN
    ALTER TABLE public.patient_management_daily_medical_updates
      ADD CONSTRAINT daily_medical_night_heart_rate_check 
      CHECK (night_heart_rate IS NULL OR (night_heart_rate >= 30 AND night_heart_rate <= 200));
  END IF;
END $$;

-- Add constraints for oxygen saturation (0-100%)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_medical_morning_oxygen_saturation_check'
  ) THEN
    ALTER TABLE public.patient_management_daily_medical_updates
      ADD CONSTRAINT daily_medical_morning_oxygen_saturation_check 
      CHECK (morning_oxygen_saturation IS NULL OR (morning_oxygen_saturation >= 0 AND morning_oxygen_saturation <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_medical_afternoon_oxygen_saturation_check'
  ) THEN
    ALTER TABLE public.patient_management_daily_medical_updates
      ADD CONSTRAINT daily_medical_afternoon_oxygen_saturation_check 
      CHECK (afternoon_oxygen_saturation IS NULL OR (afternoon_oxygen_saturation >= 0 AND afternoon_oxygen_saturation <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_medical_night_oxygen_saturation_check'
  ) THEN
    ALTER TABLE public.patient_management_daily_medical_updates
      ADD CONSTRAINT daily_medical_night_oxygen_saturation_check 
      CHECK (night_oxygen_saturation IS NULL OR (night_oxygen_saturation >= 0 AND night_oxygen_saturation <= 100));
  END IF;
END $$;

-- =============================================================================
-- PART 2: Client Presence Fields
-- =============================================================================
-- Add fields to track if client is present at the institute for each time period

ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS morning_client_present BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS afternoon_client_present BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS night_client_present BOOLEAN DEFAULT true;

-- =============================================================================
-- PART 3: Vital Signs Checkboxes
-- =============================================================================
-- Add fields to track which specific vital signs were checked

ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS checked_blood_pressure BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_heart_rate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_oxygen_saturation BOOLEAN DEFAULT false;

-- =============================================================================
-- PART 4: Ibogaine Dose and Time Fields (Separate)
-- =============================================================================
-- Add separate fields for ibogaine dose (in mg) and time

ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS ibogaine_dose INTEGER,
  ADD COLUMN IF NOT EXISTS ibogaine_time TEXT;

-- Migrate existing ibogaine_dose_time to separate fields (best-effort)
UPDATE public.patient_management_daily_medical_updates
SET 
  ibogaine_dose = CASE 
    WHEN ibogaine_dose_time ~ '^[0-9]+' THEN (regexp_match(ibogaine_dose_time, '^[0-9]+'))[1]::INTEGER
    WHEN ibogaine_dose_time ~ '[0-9]+' THEN (regexp_match(ibogaine_dose_time, '[0-9]+'))[1]::INTEGER
    ELSE NULL
  END,
  ibogaine_time = CASE 
    WHEN ibogaine_dose_time ~ '[0-9]{1,2}:[0-9]{2}' THEN (regexp_match(ibogaine_dose_time, '[0-9]{1,2}:[0-9]{2}'))[1]
    WHEN ibogaine_dose_time ~ '[0-9]{1,2}:[0-9]{2}\s*(AM|PM|am|pm)' THEN (regexp_match(ibogaine_dose_time, '[0-9]{1,2}:[0-9]{2}\s*(AM|PM|am|pm)'))[1]
    ELSE NULL
  END
WHERE ibogaine_dose_time IS NOT NULL 
  AND ibogaine_dose_time != ''
  AND (ibogaine_dose IS NULL OR ibogaine_time IS NULL);

-- =============================================================================
-- PART 5: Ibogaine Frequency Field
-- =============================================================================
-- Add field to track if ibogaine is served once or twice a day

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_medical_ibogaine_frequency_check'
  ) THEN
    ALTER TABLE public.patient_management_daily_medical_updates
      ADD COLUMN IF NOT EXISTS ibogaine_frequency TEXT;
    
    ALTER TABLE public.patient_management_daily_medical_updates
      ADD CONSTRAINT daily_medical_ibogaine_frequency_check 
      CHECK (ibogaine_frequency IS NULL OR ibogaine_frequency IN ('once', 'twice'));
  ELSE
    ALTER TABLE public.patient_management_daily_medical_updates
      ADD COLUMN IF NOT EXISTS ibogaine_frequency TEXT;
  END IF;
END $$;

-- =============================================================================
-- PART 6: Submitter and Inspector Fields
-- =============================================================================
-- Add fields to track who submitted the form and who inspected each time period

ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS submitted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS morning_inspected_by TEXT,
  ADD COLUMN IF NOT EXISTS afternoon_inspected_by TEXT,
  ADD COLUMN IF NOT EXISTS night_inspected_by TEXT;

-- =============================================================================
-- PART 7: Multiple Ibogaine Doses Support (JSONB Array)
-- =============================================================================
-- Add JSONB field to support multiple ibogaine doses per day

ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS ibogaine_doses JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single dose/time to array format
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
WHERE (ibogaine_doses IS NULL OR ibogaine_doses = '[]'::jsonb)
  AND (ibogaine_dose IS NOT NULL OR ibogaine_time IS NOT NULL);

-- =============================================================================
-- PART 8: Multiple Vitals Photos Support (JSONB Array)
-- =============================================================================
-- Convert single photo URL to JSONB array of file objects

ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS vitals_photos JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single URL to array format
UPDATE public.patient_management_daily_medical_updates
SET vitals_photos = CASE
  WHEN photo_of_vitals_medical_notes_url IS NOT NULL AND photo_of_vitals_medical_notes_url != '' THEN
    jsonb_build_array(
      jsonb_build_object(
        'url', photo_of_vitals_medical_notes_url,
        'fileName', 'Vitals Photo',
        'fileType', 'image/jpeg'
      )
    )
  ELSE
    '[]'::jsonb
END
WHERE (vitals_photos IS NULL OR vitals_photos = '[]'::jsonb)
  AND photo_of_vitals_medical_notes_url IS NOT NULL
  AND photo_of_vitals_medical_notes_url != '';

-- =============================================================================
-- PART 9: Add Column Comments
-- =============================================================================

COMMENT ON COLUMN public.patient_management_daily_medical_updates.morning_client_present IS 'Whether the client was present at the institute during morning check';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.afternoon_client_present IS 'Whether the client was present at the institute during afternoon check';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.night_client_present IS 'Whether the client was present at the institute during night check';

COMMENT ON COLUMN public.patient_management_daily_medical_updates.checked_blood_pressure IS 'Whether blood pressure was checked';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.checked_heart_rate IS 'Whether heart rate was checked';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.checked_oxygen_saturation IS 'Whether oxygen saturation was checked';

COMMENT ON COLUMN public.patient_management_daily_medical_updates.ibogaine_dose IS 'Ibogaine dose in milligrams (mg)';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.ibogaine_time IS 'Time when ibogaine was administered (e.g., 10:00 AM)';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.ibogaine_frequency IS 'Frequency of ibogaine administration: once or twice per day';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.ibogaine_doses IS 'Array of ibogaine doses: [{"dose": 500, "time": "10:00"}, {"dose": 300, "time": "14:00"}]';

COMMENT ON COLUMN public.patient_management_daily_medical_updates.submitted_by_name IS 'Name of the staff member who submitted the form';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.morning_inspected_by IS 'Name of the staff member who inspected during morning';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.afternoon_inspected_by IS 'Name of the staff member who inspected during afternoon';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.night_inspected_by IS 'Name of the staff member who inspected during night';

COMMIT;
