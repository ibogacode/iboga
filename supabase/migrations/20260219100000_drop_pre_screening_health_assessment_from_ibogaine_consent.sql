-- Remove Pre-Screening and Health Assessment from Ibogaine consent form (frontend + DB)
ALTER TABLE public.ibogaine_consent_forms
  DROP COLUMN IF EXISTS pre_screening_health_assessment;
