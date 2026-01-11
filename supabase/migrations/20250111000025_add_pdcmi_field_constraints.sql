-- =============================================================================
-- Add CHECK Constraints for PDCMI Categorical Fields and Hoehn & Yahr Staging
-- =============================================================================
-- Ensures data integrity by restricting values to valid options:
-- - dementia: 'No', 'Possible', 'Confirmed'
-- - falls_past_6_12_months: 'None', '1–2', '≥3 / recurrent'
-- - risk_classification: 'Low', 'Moderate', 'High'
-- - hoehn_yahr_stage: 'Stage 1', 'Stage 1.5', 'Stage 2', 'Stage 2.5', 'Stage 3', 'Stage 4', 'Stage 5'
-- =============================================================================

BEGIN;

-- Add CHECK constraint for dementia field
ALTER TABLE public.patient_management_parkinsons_mortality_scales
  DROP CONSTRAINT IF EXISTS dementia_check;

ALTER TABLE public.patient_management_parkinsons_mortality_scales
  ADD CONSTRAINT dementia_check 
  CHECK (dementia IS NULL OR dementia IN ('No', 'Possible', 'Confirmed'));

-- Add CHECK constraint for falls_past_6_12_months field
ALTER TABLE public.patient_management_parkinsons_mortality_scales
  DROP CONSTRAINT IF EXISTS falls_past_6_12_months_check;

ALTER TABLE public.patient_management_parkinsons_mortality_scales
  ADD CONSTRAINT falls_past_6_12_months_check 
  CHECK (falls_past_6_12_months IS NULL OR falls_past_6_12_months IN ('None', '1–2', '≥3 / recurrent'));

-- Add CHECK constraint for risk_classification field
ALTER TABLE public.patient_management_parkinsons_mortality_scales
  DROP CONSTRAINT IF EXISTS risk_classification_check;

ALTER TABLE public.patient_management_parkinsons_mortality_scales
  ADD CONSTRAINT risk_classification_check 
  CHECK (risk_classification IS NULL OR risk_classification IN ('Low', 'Moderate', 'High'));

-- Add CHECK constraint for hoehn_yahr_stage field
ALTER TABLE public.patient_management_parkinsons_mortality_scales
  DROP CONSTRAINT IF EXISTS hoehn_yahr_stage_check;

ALTER TABLE public.patient_management_parkinsons_mortality_scales
  ADD CONSTRAINT hoehn_yahr_stage_check 
  CHECK (hoehn_yahr_stage IS NULL OR hoehn_yahr_stage IN ('Stage 1', 'Stage 1.5', 'Stage 2', 'Stage 2.5', 'Stage 3', 'Stage 4', 'Stage 5'));

-- Update column comments for clarity
COMMENT ON COLUMN public.patient_management_parkinsons_mortality_scales.dementia IS 
  'Dementia status. Valid values: No, Possible, Confirmed';

COMMENT ON COLUMN public.patient_management_parkinsons_mortality_scales.falls_past_6_12_months IS 
  'Falls in past 6-12 months. Valid values: None, 1–2, ≥3 / recurrent';

COMMENT ON COLUMN public.patient_management_parkinsons_mortality_scales.risk_classification IS 
  'Risk classification. Valid values: Low, Moderate, High';

COMMENT ON COLUMN public.patient_management_parkinsons_mortality_scales.hoehn_yahr_stage IS 
  'Hoehn & Yahr staging scale. Valid values: Stage 1, Stage 1.5, Stage 2, Stage 2.5, Stage 3, Stage 4, Stage 5';

COMMIT;
