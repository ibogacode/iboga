-- Add RLS policy to allow patients to view their own existing patient documents
-- Patients can view documents linked to partial intake forms with their email

BEGIN;

-- Drop existing policy if it exists (to update it)
DROP POLICY IF EXISTS "Owners and admins can view existing patient documents" ON public.existing_patient_documents;

-- Re-create policy for staff (owners, admins, managers, doctors, nurses)
CREATE POLICY "Staff can view existing patient documents"
  ON public.existing_patient_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse')
    )
  );

-- Add new policy for patients to view their own documents
CREATE POLICY "Patients can view their own existing patient documents"
  ON public.existing_patient_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'patient'
      AND EXISTS (
        SELECT 1 FROM public.partial_intake_forms
        WHERE partial_intake_forms.id = existing_patient_documents.partial_intake_form_id
        AND LOWER(TRIM(partial_intake_forms.email)) = LOWER(TRIM(profiles.email))
      )
    )
  );

COMMIT;
