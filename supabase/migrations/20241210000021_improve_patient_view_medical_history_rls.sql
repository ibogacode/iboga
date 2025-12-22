-- Improve RLS policy for patients to view their own medical history forms
-- This policy allows patients to view forms filled by admins by matching email, intake_form_id, or name

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Patients can view their own medical history forms" ON public.medical_history_forms;

-- Create improved policy that checks multiple matching strategies
CREATE POLICY "Patients can view their own medical history forms"
  ON public.medical_history_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'patient'
      AND (
        -- Strategy 1: Match by email (case-insensitive)
        LOWER(TRIM(profiles.email)) = LOWER(TRIM(medical_history_forms.email))
        OR
        -- Strategy 2: Match via intake_form_id (if intake form email matches patient email)
        EXISTS (
          SELECT 1 FROM public.patient_intake_forms
          WHERE patient_intake_forms.id = medical_history_forms.intake_form_id
          AND (
            LOWER(TRIM(patient_intake_forms.email)) = LOWER(TRIM(profiles.email))
            OR
            -- Also match by name if email doesn't match (for cases where admin filled intake form)
            (
              profiles.first_name IS NOT NULL 
              AND profiles.last_name IS NOT NULL
              AND LOWER(TRIM(profiles.first_name)) = LOWER(TRIM(patient_intake_forms.first_name))
              AND LOWER(TRIM(profiles.last_name)) = LOWER(TRIM(patient_intake_forms.last_name))
            )
          )
        )
        OR
        -- Strategy 3: Match by name directly (for cases where admin filled medical history form)
        (
          profiles.first_name IS NOT NULL 
          AND profiles.last_name IS NOT NULL
          AND LOWER(TRIM(profiles.first_name)) = LOWER(TRIM(medical_history_forms.first_name))
          AND LOWER(TRIM(profiles.last_name)) = LOWER(TRIM(medical_history_forms.last_name))
        )
      )
    )
  );
