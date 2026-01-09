-- =============================================================================
-- Iboga - Restrict Intake Report to Non-Neurological Programs Only
-- =============================================================================
-- Goals:
--   - Update RLS policies for intake_reports to prevent neurological programs
--   - Make it idempotent (safe to run multiple times)
--   - Do NOT break existing data
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Update Intake Report INSERT Policy
-- =============================================================================
-- Restrict Intake Reports to non-neurological programs only
-- Neurological programs should use Parkinson's forms instead

DROP POLICY IF EXISTS "Staff can insert intake reports" ON public.patient_management_intake_reports;

CREATE POLICY "Staff can insert intake reports"
  ON public.patient_management_intake_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND NOT public.is_neurological_management(management_id)
  );

-- =============================================================================
-- PART 2: Update Intake Report UPDATE Policy
-- =============================================================================
-- Also restrict updates to non-neurological programs only

DROP POLICY IF EXISTS "Staff can update intake reports" ON public.patient_management_intake_reports;

CREATE POLICY "Staff can update intake reports"
  ON public.patient_management_intake_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_management_record(management_id)
    AND NOT public.is_neurological_management(management_id)
  )
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND NOT public.is_neurological_management(management_id)
  );

-- =============================================================================
-- PART 3: Comments (optional, safe)
-- =============================================================================

COMMENT ON POLICY "Staff can insert intake reports" ON public.patient_management_intake_reports IS 
  'Restricts Intake Reports to non-neurological programs only. Neurological programs must use Parkinson''s forms instead.';

COMMENT ON POLICY "Staff can update intake reports" ON public.patient_management_intake_reports IS 
  'Restricts Intake Report updates to non-neurological programs only. Neurological programs must use Parkinson''s forms instead.';

COMMIT;
