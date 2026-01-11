-- =============================================================================
-- Fix SOWS and OOWS Triggers
-- =============================================================================
-- This migration fixes the trigger issue where set_management_form_completed_at()
-- tries to access filled_at field which doesn't exist in SOWS and OOWS tables.
-- These tables should use set_daily_form_completed_at() instead, which is
-- designed for daily forms that don't have filled_at.
-- =============================================================================

BEGIN;

-- Update SOWS trigger to use the correct function for daily forms
DROP TRIGGER IF EXISTS set_daily_sows_completed_at ON public.patient_management_daily_sows;
CREATE TRIGGER set_daily_sows_completed_at
  BEFORE UPDATE ON public.patient_management_daily_sows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_daily_form_completed_at();

-- Update OOWS trigger to use the correct function for daily forms
DROP TRIGGER IF EXISTS set_daily_oows_completed_at ON public.patient_management_daily_oows;
CREATE TRIGGER set_daily_oows_completed_at
  BEFORE UPDATE ON public.patient_management_daily_oows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_daily_form_completed_at();

COMMIT;
