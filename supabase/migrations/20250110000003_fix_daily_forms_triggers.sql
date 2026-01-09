-- =============================================================================
-- Fix Daily Forms Triggers
-- =============================================================================
-- This migration fixes two issues:
-- 1. Daily forms trigger tries to access filled_at which doesn't exist
-- 2. Create separate trigger function for daily forms
-- =============================================================================

BEGIN;

-- Create a separate trigger function for daily forms (they don't have filled_at)
CREATE OR REPLACE FUNCTION public.set_daily_form_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    -- Daily forms don't have filled_at, they use submitted_at and filled_by instead
    -- These are set in the application code, not in the trigger
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Update triggers for daily psychological updates
DROP TRIGGER IF EXISTS set_daily_psychological_completed_at ON public.patient_management_daily_psychological_updates;
CREATE TRIGGER set_daily_psychological_completed_at
  BEFORE UPDATE ON public.patient_management_daily_psychological_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_daily_form_completed_at();

-- Update triggers for daily medical updates
DROP TRIGGER IF EXISTS set_daily_medical_completed_at ON public.patient_management_daily_medical_updates;
CREATE TRIGGER set_daily_medical_completed_at
  BEFORE UPDATE ON public.patient_management_daily_medical_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_daily_form_completed_at();

-- Grant execute permission
REVOKE ALL ON FUNCTION public.set_daily_form_completed_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_daily_form_completed_at() TO authenticated;

COMMIT;
