-- Quick note per lead (patient profile page [id] = patient id or partial form id)
CREATE TABLE IF NOT EXISTS public.lead_notes (
  lead_id UUID PRIMARY KEY,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.lead_notes IS 'One row per lead; lead_id is the patient profile page id (profiles.id or partial_intake_forms.id)';

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view lead notes"
  ON public.lead_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

CREATE POLICY "Staff can insert lead notes"
  ON public.lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

CREATE POLICY "Staff can update lead notes"
  ON public.lead_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );
