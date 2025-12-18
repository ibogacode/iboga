-- Update RLS policies for patient_intake_forms to allow admin access
-- Drop existing policies
DROP POLICY IF EXISTS "Owners can view all intake forms" ON public.patient_intake_forms;
DROP POLICY IF EXISTS "Owners can update intake forms" ON public.patient_intake_forms;
DROP POLICY IF EXISTS "Owners can delete intake forms" ON public.patient_intake_forms;

-- Recreate policies to allow both owner and admin roles

-- Owners and admins can view all forms
CREATE POLICY "Owners and admins can view all intake forms"
  ON public.patient_intake_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update forms
CREATE POLICY "Owners and admins can update intake forms"
  ON public.patient_intake_forms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can delete forms
CREATE POLICY "Owners and admins can delete intake forms"
  ON public.patient_intake_forms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );
