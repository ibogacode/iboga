-- ============================================================================
-- Treatment Date Scheduling System Migration
-- ============================================================================
-- This migration adds treatment date scheduling functionality to replace
-- automatic arrival date assignment with a capacity-managed scheduling system.
--
-- Key features:
-- - Treatment date assignment in onboarding stage (4 patients max per day)
-- - Auto-calculate expected departure dates based on service agreement
-- - Assessment tracking for post-arrival medical evaluation
-- - Discharge functionality with automatic actual_departure_date
-- ============================================================================

-- ============================================================================
-- STEP 1: Add treatment_date to patient_onboarding table
-- ============================================================================

ALTER TABLE public.patient_onboarding
  ADD COLUMN IF NOT EXISTS treatment_date DATE,
  ADD COLUMN IF NOT EXISTS treatment_date_assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS treatment_date_assigned_at TIMESTAMPTZ;

-- Add constraint: treatment_date cannot be in the past
ALTER TABLE public.patient_onboarding
  ADD CONSTRAINT treatment_date_future_check
  CHECK (treatment_date IS NULL OR treatment_date >= CURRENT_DATE);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS patient_onboarding_treatment_date_idx
  ON public.patient_onboarding(treatment_date)
  WHERE treatment_date IS NOT NULL;

-- Backfill treatment_date for existing onboarding patients
-- Use expected_arrival_date if available, otherwise leave null for manual assignment
UPDATE public.patient_onboarding
SET treatment_date = expected_arrival_date
WHERE status != 'moved_to_management'
  AND expected_arrival_date IS NOT NULL
  AND expected_arrival_date >= CURRENT_DATE
  AND treatment_date IS NULL;

-- ============================================================================
-- STEP 2: Add assessment fields to patient_management table
-- ============================================================================

ALTER TABLE public.patient_management
  ADD COLUMN IF NOT EXISTS assessment_date DATE,
  ADD COLUMN IF NOT EXISTS assessment_completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assessment_notes TEXT;

-- Add program tracking fields to patient_management
ALTER TABLE public.patient_management
  ADD COLUMN IF NOT EXISTS program_start_date DATE,
  ADD COLUMN IF NOT EXISTS program_end_date DATE,
  ADD COLUMN IF NOT EXISTS program_duration INTEGER,
  ADD COLUMN IF NOT EXISTS program_status TEXT
    CHECK (program_status IN ('scheduled', 'active', 'completed', 'cancelled', 'on_hold'));

-- ============================================================================
-- STEP 3: Create treatment_schedule table for capacity tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.treatment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_date DATE NOT NULL UNIQUE,
  capacity_used INTEGER NOT NULL DEFAULT 0,
  capacity_max INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT capacity_check CHECK (capacity_used >= 0 AND capacity_used <= capacity_max)
);

-- Create index for efficient date lookups
CREATE INDEX IF NOT EXISTS treatment_schedule_date_idx
  ON public.treatment_schedule(treatment_date);

-- ============================================================================
-- STEP 4: RLS Policies for treatment_schedule
-- ============================================================================

ALTER TABLE public.treatment_schedule ENABLE ROW LEVEL SECURITY;

-- Staff can view treatment schedule
CREATE POLICY "Staff can view treatment schedule"
  ON public.treatment_schedule FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

-- Admin staff can manage treatment schedule
CREATE POLICY "Admin staff can manage treatment schedule"
  ON public.treatment_schedule FOR ALL
  TO authenticated
  USING (public.is_admin_staff_role())
  WITH CHECK (public.is_admin_staff_role());

-- ============================================================================
-- STEP 5: Trigger to auto-sync treatment_schedule capacity
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_treatment_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Handle INSERT or UPDATE with new treatment_date
  IF (TG_OP = 'INSERT' AND NEW.treatment_date IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.treatment_date IS NOT NULL AND
      (OLD.treatment_date IS NULL OR OLD.treatment_date != NEW.treatment_date)) THEN

    -- Ensure schedule entry exists and increment capacity
    INSERT INTO public.treatment_schedule (treatment_date, capacity_used)
    VALUES (NEW.treatment_date, 1)
    ON CONFLICT (treatment_date)
    DO UPDATE SET
      capacity_used = public.treatment_schedule.capacity_used + 1,
      updated_at = NOW();

    -- If date changed (UPDATE), decrement old date
    IF TG_OP = 'UPDATE' AND OLD.treatment_date IS NOT NULL AND OLD.treatment_date != NEW.treatment_date THEN
      UPDATE public.treatment_schedule
      SET
        capacity_used = GREATEST(0, capacity_used - 1),
        updated_at = NOW()
      WHERE treatment_date = OLD.treatment_date;
    END IF;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' AND OLD.treatment_date IS NOT NULL THEN
    UPDATE public.treatment_schedule
    SET
      capacity_used = GREATEST(0, capacity_used - 1),
      updated_at = NOW()
    WHERE treatment_date = OLD.treatment_date;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on patient_onboarding
DROP TRIGGER IF EXISTS sync_treatment_schedule_trigger ON public.patient_onboarding;
CREATE TRIGGER sync_treatment_schedule_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_treatment_schedule();

-- ============================================================================
-- STEP 6: Trigger to auto-calculate expected_departure_date
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_expected_departure_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  service_days INTEGER;
BEGIN
  -- Get number_of_days from service_agreement
  SELECT COALESCE(number_of_days, 14) INTO service_days
  FROM public.service_agreements
  WHERE patient_id = NEW.patient_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate expected_departure_date
  IF NEW.program_start_date IS NOT NULL THEN
    -- If program started, use program_start_date + days
    NEW.expected_departure_date := (NEW.program_start_date::DATE + (service_days || ' days')::INTERVAL)::DATE;
  ELSIF NEW.arrival_date IS NOT NULL THEN
    -- Otherwise use arrival_date + days
    NEW.expected_departure_date := (NEW.arrival_date::DATE + (service_days || ' days')::INTERVAL)::DATE;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on patient_management
DROP TRIGGER IF EXISTS auto_calculate_expected_departure ON public.patient_management;
CREATE TRIGGER auto_calculate_expected_departure
  BEFORE INSERT OR UPDATE OF arrival_date, program_start_date
  ON public.patient_management
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expected_departure_date();

-- ============================================================================
-- STEP 7: Initialize treatment_schedule with existing data
-- ============================================================================

-- Populate treatment_schedule with counts from existing treatment dates
INSERT INTO public.treatment_schedule (treatment_date, capacity_used)
SELECT
  treatment_date,
  COUNT(*) as capacity_used
FROM public.patient_onboarding
WHERE treatment_date IS NOT NULL
  AND status != 'moved_to_management'
GROUP BY treatment_date
ON CONFLICT (treatment_date)
DO UPDATE SET
  capacity_used = EXCLUDED.capacity_used,
  updated_at = NOW();

-- ============================================================================
-- STEP 8: Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.treatment_schedule IS 'Tracks daily capacity for new patient arrivals (max 4 per day)';
COMMENT ON COLUMN public.patient_onboarding.treatment_date IS 'Date when patient is scheduled to arrive at facility';
COMMENT ON COLUMN public.patient_onboarding.treatment_date_assigned_by IS 'Admin who assigned the treatment date';
COMMENT ON COLUMN public.patient_management.assessment_date IS 'Date when medical staff completed initial assessment';
COMMENT ON COLUMN public.patient_management.assessment_completed_by IS 'Staff member who completed the assessment';
COMMENT ON COLUMN public.patient_management.assessment_notes IS 'Notes from initial medical assessment';
