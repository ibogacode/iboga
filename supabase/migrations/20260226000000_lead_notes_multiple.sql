-- Multiple notes per lead (patient profile). Replaces single-note lead_notes table.

-- New table: many rows per lead_id
CREATE TABLE IF NOT EXISTS public.lead_note_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.lead_note_entries IS 'Multiple notes per lead (patient profile page id); lead_id = profiles.id or partial_intake_forms.id';

CREATE INDEX IF NOT EXISTS idx_lead_note_entries_lead_id ON public.lead_note_entries(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_note_entries_created_at ON public.lead_note_entries(created_at DESC);

ALTER TABLE public.lead_note_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view lead note entries"
  ON public.lead_note_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

CREATE POLICY "Staff can insert lead note entries"
  ON public.lead_note_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

CREATE POLICY "Staff can delete lead note entries"
  ON public.lead_note_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

-- Migrate existing single notes into one entry per lead
INSERT INTO public.lead_note_entries (lead_id, notes, created_at)
  SELECT lead_id, COALESCE(notes, ''), updated_at
  FROM public.lead_notes
  WHERE notes IS NOT NULL AND trim(notes) != '';

-- Drop old table
DROP TABLE IF EXISTS public.lead_notes;
