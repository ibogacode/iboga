-- Clinical Director consult questionnaire: align with structured question list (types and new fields)
-- Adds new columns, converts text to boolean where needed, splits arrival and substances current.

-- New text/long_text fields
ALTER TABLE public.clinical_director_consult_forms
  ADD COLUMN IF NOT EXISTS psychedelics_which TEXT,
  ADD COLUMN IF NOT EXISTS substance_use_frequency_amount TEXT,
  ADD COLUMN IF NOT EXISTS substances_started_when TEXT,
  ADD COLUMN IF NOT EXISTS substances_current TEXT,
  ADD COLUMN IF NOT EXISTS substances_current_frequency_amount TEXT;

-- New date/time fields
ALTER TABLE public.clinical_director_consult_forms
  ADD COLUMN IF NOT EXISTS arrival_date DATE,
  ADD COLUMN IF NOT EXISTS arrival_time TIME,
  ADD COLUMN IF NOT EXISTS substances_current_last_use_date DATE;

-- New integer field
ALTER TABLE public.clinical_director_consult_forms
  ADD COLUMN IF NOT EXISTS previous_detox_rehab_times INTEGER;

-- Convert psychedelics_before TEXT → BOOLEAN
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinical_director_consult_forms' AND column_name = 'psychedelics_before'
  ) AND (
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinical_director_consult_forms' AND column_name = 'psychedelics_before'
  ) = 'text' THEN
    ALTER TABLE public.clinical_director_consult_forms ADD COLUMN IF NOT EXISTS psychedelics_before_bool BOOLEAN;
    UPDATE public.clinical_director_consult_forms SET psychedelics_before_bool = (LOWER(TRIM(psychedelics_before)) IN ('true', 'yes', '1'));
    ALTER TABLE public.clinical_director_consult_forms DROP COLUMN psychedelics_before;
    ALTER TABLE public.clinical_director_consult_forms RENAME COLUMN psychedelics_before_bool TO psychedelics_before;
  END IF;
END $$;

-- Convert withdrawal_symptoms_before TEXT → BOOLEAN
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinical_director_consult_forms' AND column_name = 'withdrawal_symptoms_before'
  ) AND (
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinical_director_consult_forms' AND column_name = 'withdrawal_symptoms_before'
  ) = 'text' THEN
    ALTER TABLE public.clinical_director_consult_forms ADD COLUMN IF NOT EXISTS withdrawal_symptoms_before_bool BOOLEAN;
    UPDATE public.clinical_director_consult_forms SET withdrawal_symptoms_before_bool = (LOWER(TRIM(withdrawal_symptoms_before)) IN ('true', 'yes', '1'));
    ALTER TABLE public.clinical_director_consult_forms DROP COLUMN withdrawal_symptoms_before;
    ALTER TABLE public.clinical_director_consult_forms RENAME COLUMN withdrawal_symptoms_before_bool TO withdrawal_symptoms_before;
  END IF;
END $$;

-- Convert previous_detox_rehab TEXT → BOOLEAN
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinical_director_consult_forms' AND column_name = 'previous_detox_rehab'
  ) AND (
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinical_director_consult_forms' AND column_name = 'previous_detox_rehab'
  ) = 'text' THEN
    ALTER TABLE public.clinical_director_consult_forms ADD COLUMN IF NOT EXISTS previous_detox_rehab_bool BOOLEAN;
    UPDATE public.clinical_director_consult_forms SET previous_detox_rehab_bool = (LOWER(TRIM(previous_detox_rehab)) IN ('true', 'yes', '1'));
    ALTER TABLE public.clinical_director_consult_forms DROP COLUMN previous_detox_rehab;
    ALTER TABLE public.clinical_director_consult_forms RENAME COLUMN previous_detox_rehab_bool TO previous_detox_rehab;
  END IF;
END $$;

-- Drop old combined columns if they exist (after new columns added)
ALTER TABLE public.clinical_director_consult_forms DROP COLUMN IF EXISTS arrival_time_and_date;
ALTER TABLE public.clinical_director_consult_forms DROP COLUMN IF EXISTS substances_current_frequency_last_use;

COMMENT ON COLUMN public.clinical_director_consult_forms.psychedelics_before IS 'Have you used psychedelics before? (Yes/No)';
COMMENT ON COLUMN public.clinical_director_consult_forms.psychedelics_which IS 'If yes, which psychedelics have you used?';
COMMENT ON COLUMN public.clinical_director_consult_forms.diagnosed_conditions IS 'Multi-select: JSON array of options e.g. ["Depression","Anxiety"]';
