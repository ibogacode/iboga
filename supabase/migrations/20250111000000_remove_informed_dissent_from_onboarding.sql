-- =============================================================================
-- Remove Informed Dissent and Social Media Release Forms from Onboarding Process
-- =============================================================================
-- This migration removes the Informed Dissent and Social Media Release forms from the onboarding flow
-- The tables and data are preserved, but they're no longer part of onboarding
-- =============================================================================

BEGIN;

-- 1. Remove the informed_dissent_completed and social_media_release_completed columns from patient_onboarding table
ALTER TABLE public.patient_onboarding 
  DROP COLUMN IF EXISTS informed_dissent_completed,
  DROP COLUMN IF EXISTS social_media_release_completed;

-- 2. Update the check_onboarding_completion function to check for only 3 forms
CREATE OR REPLACE FUNCTION public.check_onboarding_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Auto-complete when all 3 forms done (removed informed_dissent and social_media_release)
  IF NEW.release_form_completed
     AND NEW.outing_consent_completed
     AND NEW.internal_regulations_completed
     AND NEW.status = 'in_progress'
  THEN
    NEW.status := 'completed';
    NEW.completed_at := NOW();
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- 3. Update the propagate_form_completion function to remove informed_dissent and social_media handling
CREATE OR REPLACE FUNCTION public.propagate_form_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only act on false -> true transition
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    IF TG_TABLE_NAME = 'onboarding_release_forms' THEN
      UPDATE public.patient_onboarding
      SET release_form_completed = true
      WHERE id = NEW.onboarding_id;

    ELSIF TG_TABLE_NAME = 'onboarding_outing_consent_forms' THEN
      UPDATE public.patient_onboarding
      SET outing_consent_completed = true
      WHERE id = NEW.onboarding_id;

    ELSIF TG_TABLE_NAME = 'onboarding_internal_regulations_forms' THEN
      UPDATE public.patient_onboarding
      SET internal_regulations_completed = true
      WHERE id = NEW.onboarding_id;

    -- Removed: informed_dissent_forms and social_media_forms handling
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Remove informed_dissent_forms and social_media_forms from trigger setup (if exists in a setup function)
-- Note: The triggers are set up per-table, so removing the columns and updating functions is sufficient
-- The triggers on those tables can remain but won't affect onboarding completion

-- 5. Update any existing onboarding records to mark as completed if they have the 3 required forms
-- (This handles cases where informed_dissent or social_media_release were the only missing forms)
UPDATE public.patient_onboarding
SET 
  status = 'completed',
  completed_at = COALESCE(completed_at, NOW())
WHERE status = 'in_progress'
  AND release_form_completed = true
  AND outing_consent_completed = true
  AND internal_regulations_completed = true;

COMMIT;
