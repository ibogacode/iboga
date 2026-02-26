-- Allow staff to update lead note entries (edit existing notes)
CREATE POLICY "Staff can update lead note entries"
  ON public.lead_note_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );
