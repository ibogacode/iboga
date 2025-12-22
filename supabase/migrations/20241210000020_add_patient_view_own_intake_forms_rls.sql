-- Add RLS policies to allow patients to view their own forms
-- Patients can view intake forms where the email matches their profile email

-- Allow patients to view their own intake forms
CREATE POLICY "Patients can view their own intake forms"
  ON public.patient_intake_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'patient'
      AND LOWER(TRIM(profiles.email)) = LOWER(TRIM(patient_intake_forms.email))
    )
  );

-- Allow patients to view their own medical history forms
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
        LOWER(TRIM(profiles.email)) = LOWER(TRIM(medical_history_forms.email))
        OR EXISTS (
          SELECT 1 FROM public.patient_intake_forms
          WHERE patient_intake_forms.id = medical_history_forms.intake_form_id
          AND LOWER(TRIM(patient_intake_forms.email)) = LOWER(TRIM(profiles.email))
        )
      )
    )
  );
