-- Add manager role access to patient pipeline tables
-- Managers should be able to view (SELECT) all records, but not modify them

-- =============================================================================
-- 1. Update partial_intake_forms RLS policies
-- =============================================================================

-- Update SELECT policy to include manager
DROP POLICY IF EXISTS "Admin and owner can view partial intake forms" ON public.partial_intake_forms;
CREATE POLICY "Staff can view partial intake forms"
  ON public.partial_intake_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'manager')
    )
  );

-- =============================================================================
-- 2. Update patient_intake_forms RLS policies
-- =============================================================================

-- Update SELECT policy to include manager
DROP POLICY IF EXISTS "Owners and admins can view all intake forms" ON public.patient_intake_forms;
CREATE POLICY "Staff can view all intake forms"
  ON public.patient_intake_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'manager')
    )
  );

-- =============================================================================
-- 3. Update medical_history_forms RLS policies
-- =============================================================================

-- Update SELECT policy to include manager
DROP POLICY IF EXISTS "Owners and admins can view all medical history forms" ON public.medical_history_forms;
CREATE POLICY "Staff can view all medical history forms"
  ON public.medical_history_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

-- =============================================================================
-- 4. Update service_agreements RLS policies
-- =============================================================================
-- Note: service_agreements already includes 'manager' in the SELECT policy,
-- so no changes needed here

-- =============================================================================
-- 5. Update ibogaine_consent_forms RLS policies
-- =============================================================================
-- Note: ibogaine_consent_forms already includes 'manager' in the SELECT policy,
-- so no changes needed here

