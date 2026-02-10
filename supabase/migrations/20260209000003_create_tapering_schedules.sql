-- Migration: Create tapering schedules table
-- This table stores medication tapering schedules for patients in onboarding

-- Create the tapering_schedules table
CREATE TABLE IF NOT EXISTS public.tapering_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links to patient
  onboarding_id UUID REFERENCES public.patient_onboarding(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Schedule metadata
  starting_dose TEXT NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 7,
  
  -- Schedule details as JSONB array
  -- Each day: { day: number, dose: string, notes: string }
  schedule_days JSONB NOT NULL DEFAULT '[]',
  
  -- Additional notes
  additional_notes TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged')),
  
  -- Email tracking
  admin_notified_at TIMESTAMPTZ,  -- When admin was notified about onboarding
  client_notified_at TIMESTAMPTZ, -- When client was notified schedule is ready
  
  -- Timestamps
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS tapering_schedules_onboarding_id_idx ON public.tapering_schedules(onboarding_id);
CREATE INDEX IF NOT EXISTS tapering_schedules_patient_id_idx ON public.tapering_schedules(patient_id);
CREATE INDEX IF NOT EXISTS tapering_schedules_status_idx ON public.tapering_schedules(status);
CREATE INDEX IF NOT EXISTS tapering_schedules_created_at_idx ON public.tapering_schedules(created_at DESC);

-- Enable RLS
ALTER TABLE public.tapering_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Staff can view all tapering schedules
CREATE POLICY "Staff can view all tapering schedules"
  ON public.tapering_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'doctor', 'nurse', 'manager', 'psych')
    )
  );

-- Staff can insert tapering schedules
CREATE POLICY "Staff can insert tapering schedules"
  ON public.tapering_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

-- Staff can update tapering schedules
CREATE POLICY "Staff can update tapering schedules"
  ON public.tapering_schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

-- Staff can delete tapering schedules (draft only)
CREATE POLICY "Staff can delete draft tapering schedules"
  ON public.tapering_schedules
  FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

-- Patients can view their own tapering schedule (only when sent)
CREATE POLICY "Patients can view their own tapering schedule"
  ON public.tapering_schedules
  FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    AND status IN ('sent', 'acknowledged')
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_tapering_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tapering_schedules_updated_at ON public.tapering_schedules;
CREATE TRIGGER set_tapering_schedules_updated_at
  BEFORE UPDATE ON public.tapering_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tapering_schedules_updated_at();

-- Comments
COMMENT ON TABLE public.tapering_schedules IS 'Stores medication tapering schedules for patients preparing for ibogaine treatment';
COMMENT ON COLUMN public.tapering_schedules.schedule_days IS 'JSON array of day schedules: [{ day: number, dose: string, notes: string }]';
COMMENT ON COLUMN public.tapering_schedules.status IS 'draft: being created, sent: sent to patient, acknowledged: patient has viewed';
