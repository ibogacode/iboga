-- Migration: Remove consent fields from patient_intake_forms
-- These fields are being moved to separate individual agreement/consent forms
-- Each will have its own dedicated table for better tracking and management

-- Remove Ibogaine Therapy Consent fields (will become separate consent form)
ALTER TABLE public.patient_intake_forms
  DROP COLUMN IF EXISTS consent_for_treatment,
  DROP COLUMN IF EXISTS risks_and_benefits,
  DROP COLUMN IF EXISTS pre_screening_health_assessment,
  DROP COLUMN IF EXISTS voluntary_participation,
  DROP COLUMN IF EXISTS confidentiality,
  DROP COLUMN IF EXISTS liability_release,
  DROP COLUMN IF EXISTS payment_collection_1,
  DROP COLUMN IF EXISTS payment_collection_2,
  DROP COLUMN IF EXISTS ibogaine_therapy_consent_accepted;

-- Remove Release Consent field (will become separate consent form)
ALTER TABLE public.patient_intake_forms
  DROP COLUMN IF EXISTS release_consent_accepted;

-- Remove Patient Acknowledgment field (will become separate form)
ALTER TABLE public.patient_intake_forms
  DROP COLUMN IF EXISTS final_acknowledgment_accepted;

-- Remove signature fields (signatures will be on individual consent forms)
ALTER TABLE public.patient_intake_forms
  DROP COLUMN IF EXISTS signature_data,
  DROP COLUMN IF EXISTS signature_date;

-- Remove service_agreement_accepted as well (already has its own table: service_agreements)
ALTER TABLE public.patient_intake_forms
  DROP COLUMN IF EXISTS service_agreement_accepted;

