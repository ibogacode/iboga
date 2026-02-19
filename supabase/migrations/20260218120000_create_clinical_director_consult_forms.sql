-- Clinical Director Consult Questionnaire: pre-consult form shown when consult with Clinical Director is scheduled
-- One row per onboarding; staff view/edit in patient profile (like tapering schedule)

CREATE TABLE IF NOT EXISTS public.clinical_director_consult_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.patient_onboarding(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 1–2. Psychedelics
  psychedelics_before BOOLEAN,
  psychedelics_which TEXT,
  -- 3. Supplements
  supplements_regular TEXT,
  -- 4–5. Arrival
  arrival_date DATE,
  arrival_time TIME,
  -- 6. Questions/concerns
  questions_concerns_prior_arrival TEXT,
  -- 7. Dietary
  dietary_restrictions_allergies TEXT,
  -- 8–9. Substances (caffeine, nicotine, etc.)
  substance_use_caffeine_nicotine_alcohol TEXT,
  substance_use_frequency_amount TEXT,
  -- 10. Diagnosed conditions (multi_select stored as JSON array text)
  diagnosed_conditions TEXT,
  -- 11–12. Past substances
  substances_used_past TEXT,
  substances_started_when TEXT,
  -- 13–15. Current substances
  substances_current TEXT,
  substances_current_frequency_amount TEXT,
  substances_current_last_use_date DATE,
  -- 16. Withdrawal
  withdrawal_symptoms_before BOOLEAN,
  -- 17–18. Detox/rehab
  previous_detox_rehab BOOLEAN,
  previous_detox_rehab_times INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS clinical_director_consult_forms_onboarding_id_idx ON public.clinical_director_consult_forms(onboarding_id);
CREATE INDEX IF NOT EXISTS clinical_director_consult_forms_updated_at_idx ON public.clinical_director_consult_forms(updated_at DESC);

ALTER TABLE public.clinical_director_consult_forms ENABLE ROW LEVEL SECURITY;

-- Staff can view all
CREATE POLICY "Staff can view clinical director consult forms"
  ON public.clinical_director_consult_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'doctor', 'nurse', 'manager', 'psych')
    )
  );

-- Staff can insert
CREATE POLICY "Staff can insert clinical director consult forms"
  ON public.clinical_director_consult_forms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'doctor', 'nurse', 'manager', 'psych')
    )
  );

-- Staff can update
CREATE POLICY "Staff can update clinical director consult forms"
  ON public.clinical_director_consult_forms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'doctor', 'nurse', 'manager', 'psych')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'doctor', 'nurse', 'manager', 'psych')
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_clinical_director_consult_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_clinical_director_consult_forms_updated_at ON public.clinical_director_consult_forms;
CREATE TRIGGER set_clinical_director_consult_forms_updated_at
  BEFORE UPDATE ON public.clinical_director_consult_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_clinical_director_consult_forms_updated_at();

COMMENT ON TABLE public.clinical_director_consult_forms IS 'Pre-consult questionnaire (Clinical Director call): answers to standard questions, filled by staff when consult is scheduled';
