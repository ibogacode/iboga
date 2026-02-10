-- Migration: Remove medication_name from tapering_schedules
-- Medication name is no longer used in the tapering schedule form

ALTER TABLE public.tapering_schedules
  DROP COLUMN IF EXISTS medication_name;
