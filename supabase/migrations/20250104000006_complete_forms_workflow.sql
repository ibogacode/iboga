-- =============================================================================
-- Draft Forms + Activation Enforcement + Race-safe Auto-create
-- For: service_agreements, ibogaine_consent_forms
-- =============================================================================

BEGIN;

-- 0) Ensure gen_random_uuid exists (Supabase usually has pgcrypto enabled)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1) Make fields nullable to allow draft/placeholder rows
-- =============================================================================

ALTER TABLE public.service_agreements
  ALTER COLUMN total_program_fee DROP NOT NULL,
  ALTER COLUMN deposit_amount DROP NOT NULL,
  ALTER COLUMN deposit_percentage DROP NOT NULL,
  ALTER COLUMN remaining_balance DROP NOT NULL,
  ALTER COLUMN payment_method DROP NOT NULL,
  ALTER COLUMN patient_signature_name DROP NOT NULL,
  ALTER COLUMN patient_signature_first_name DROP NOT NULL,
  ALTER COLUMN patient_signature_last_name DROP NOT NULL,
  ALTER COLUMN patient_signature_date DROP NOT NULL,
  ALTER COLUMN provider_signature_name DROP NOT NULL,
  ALTER COLUMN provider_signature_first_name DROP NOT NULL,
  ALTER COLUMN provider_signature_last_name DROP NOT NULL,
  ALTER COLUMN provider_signature_date DROP NOT NULL;

ALTER TABLE public.ibogaine_consent_forms
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN treatment_date DROP NOT NULL,
  ALTER COLUMN facilitator_doctor_name DROP NOT NULL,
  ALTER COLUMN signature_data DROP NOT NULL,
  ALTER COLUMN signature_date DROP NOT NULL,
  ALTER COLUMN signature_name DROP NOT NULL;

-- NOTE: Your tables still have other NOT NULL fields (name/email/phone etc).
-- That’s fine: drafts will still have patient identity info.


-- =============================================================================
-- 2) Create form_defaults (admin-editable defaults)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.form_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL UNIQUE CHECK (form_type IN ('service_agreement', 'ibogaine_consent')),
  default_values JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS form_defaults_form_type_idx ON public.form_defaults(form_type);

ALTER TABLE public.form_defaults ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'form_defaults'
      AND policyname = 'Admins and owners can view form defaults'
  ) THEN
    CREATE POLICY "Admins and owners can view form defaults"
      ON public.form_defaults
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'form_defaults'
      AND policyname = 'Admins and owners can update form defaults'
  ) THEN
    CREATE POLICY "Admins and owners can update form defaults"
      ON public.form_defaults
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
  END IF;
END $$;

INSERT INTO public.form_defaults (form_type, default_values)
VALUES
  (
    'service_agreement',
    '{
      "deposit_percentage": 40.00,
      "provider_signature_name": "Iboga Wellness Institute"
    }'::jsonb
  ),
  (
    'ibogaine_consent',
    '{
      "treatment_date": null
    }'::jsonb
  )
ON CONFLICT (form_type) DO NOTHING;


-- =============================================================================
-- 3) Add dedupe_key (prevents duplicates even when patient later gets patient_id)
--    Uses patient_id when present, else lower(email).
-- =============================================================================

-- =============================================================================
-- 3) Add dedupe_key + normalized intake id, then unique constraints
-- =============================================================================

ALTER TABLE public.service_agreements
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN patient_id IS NOT NULL THEN 'pid:' || patient_id::text
      ELSE 'email:' || lower(patient_email)
    END
  ) STORED;

ALTER TABLE public.service_agreements
  ADD COLUMN IF NOT EXISTS intake_form_id_norm UUID
  GENERATED ALWAYS AS (
    COALESCE(intake_form_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) STORED;

ALTER TABLE public.ibogaine_consent_forms
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN patient_id IS NOT NULL THEN 'pid:' || patient_id::text
      ELSE 'email:' || lower(email)
    END
  ) STORED;

ALTER TABLE public.ibogaine_consent_forms
  ADD COLUMN IF NOT EXISTS intake_form_id_norm UUID
  GENERATED ALWAYS AS (
    COALESCE(intake_form_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) STORED;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_agreements_dedupe_unique'
  ) THEN
    ALTER TABLE public.service_agreements
      ADD CONSTRAINT service_agreements_dedupe_unique
      UNIQUE (dedupe_key, intake_form_id_norm);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ibogaine_consent_forms_dedupe_unique'
  ) THEN
    ALTER TABLE public.ibogaine_consent_forms
      ADD CONSTRAINT ibogaine_consent_forms_dedupe_unique
      UNIQUE (dedupe_key, intake_form_id_norm);
  END IF;
END $$;


-- =============================================================================
-- 4) Enforce required fields ONLY when activated
--    (Drafts can be incomplete; activation will fail if missing fields)
-- =============================================================================

ALTER TABLE public.service_agreements
  DROP CONSTRAINT IF EXISTS service_agreements_activated_fields_check;

ALTER TABLE public.service_agreements
  ADD CONSTRAINT service_agreements_activated_fields_check
  CHECK (
    (is_activated IS NOT TRUE)
    OR (
      -- Admin/financial fields
      total_program_fee IS NOT NULL AND
      deposit_amount IS NOT NULL AND
      deposit_percentage IS NOT NULL AND
      remaining_balance IS NOT NULL AND
      payment_method IS NOT NULL AND
      btrim(payment_method) <> '' AND

      -- Provider signature fields
      provider_signature_name IS NOT NULL AND btrim(provider_signature_name) <> '' AND
      provider_signature_first_name IS NOT NULL AND btrim(provider_signature_first_name) <> '' AND
      provider_signature_last_name IS NOT NULL AND btrim(provider_signature_last_name) <> '' AND
      provider_signature_date IS NOT NULL AND

      -- Patient signature fields (you said you want these enforced on activation)
      patient_signature_name IS NOT NULL AND btrim(patient_signature_name) <> '' AND
      patient_signature_first_name IS NOT NULL AND btrim(patient_signature_first_name) <> '' AND
      patient_signature_last_name IS NOT NULL AND btrim(patient_signature_last_name) <> '' AND
      patient_signature_date IS NOT NULL
    )
  );

ALTER TABLE public.ibogaine_consent_forms
  DROP CONSTRAINT IF EXISTS ibogaine_consent_forms_activated_fields_check;

ALTER TABLE public.ibogaine_consent_forms
  ADD CONSTRAINT ibogaine_consent_forms_activated_fields_check
  CHECK (
    (is_activated IS NOT TRUE)
    OR (
      treatment_date IS NOT NULL AND
      facilitator_doctor_name IS NOT NULL AND btrim(facilitator_doctor_name) <> '' AND
      date_of_birth IS NOT NULL AND
      address IS NOT NULL AND btrim(address) <> '' AND
      signature_data IS NOT NULL AND btrim(signature_data) <> '' AND
      signature_date IS NOT NULL AND
      signature_name IS NOT NULL AND btrim(signature_name) <> ''
    )
  );


-- =============================================================================
-- 5) Auto-create forms after medical history insert (race-safe, dedupe-safe)
--    NOTE: This assumes public.medical_history_forms exists with:
--          email, first_name, last_name, phone_number, date_of_birth, intake_form_id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_forms_after_medical_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_patient_id UUID;
  v_intake_form_id UUID;
  v_patient_email TEXT;
  v_patient_first_name TEXT;
  v_patient_last_name TEXT;
  v_patient_phone TEXT;
  v_date_of_birth DATE;
  v_address TEXT;
  v_service_defaults JSONB;
  v_consent_defaults JSONB;
  v_deposit_pct NUMERIC;
  v_provider_sig_name TEXT;
BEGIN
  v_patient_email := NEW.email;
  v_patient_first_name := NEW.first_name;
  v_patient_last_name := NEW.last_name;
  v_patient_phone := NEW.phone_number;
  v_date_of_birth := NEW.date_of_birth;
  v_intake_form_id := NEW.intake_form_id;

  SELECT id INTO v_patient_id
  FROM public.profiles
  WHERE email = v_patient_email
    AND role = 'patient'
  LIMIT 1;

  IF v_intake_form_id IS NOT NULL THEN
    SELECT
      COALESCE(
        address ||
        CASE WHEN city IS NOT NULL THEN ', ' || city ELSE '' END ||
        CASE WHEN state IS NOT NULL THEN ', ' || state ELSE '' END ||
        CASE WHEN zip_code IS NOT NULL THEN ' ' || zip_code ELSE '' END,
        address,
        ''
      )
    INTO v_address
    FROM public.patient_intake_forms
    WHERE id = v_intake_form_id;
  END IF;

  SELECT default_values INTO v_service_defaults
  FROM public.form_defaults
  WHERE form_type = 'service_agreement';

  SELECT default_values INTO v_consent_defaults
  FROM public.form_defaults
  WHERE form_type = 'ibogaine_consent';

  IF v_service_defaults ? 'deposit_percentage' THEN
    v_deposit_pct := (v_service_defaults->>'deposit_percentage')::numeric;
  ELSE
    v_deposit_pct := NULL;
  END IF;

  v_provider_sig_name := NULLIF(v_service_defaults->>'provider_signature_name', '');

  -- Insert Service Agreement draft (race-safe)
  INSERT INTO public.service_agreements (
    patient_id,
    intake_form_id,
    patient_first_name,
    patient_last_name,
    patient_email,
    patient_phone_number,
    is_activated,
    total_program_fee,
    deposit_amount,
    deposit_percentage,
    remaining_balance,
    payment_method,
    provider_signature_name,
    provider_signature_first_name,
    provider_signature_last_name,
    provider_signature_date,
    patient_signature_name,
    patient_signature_first_name,
    patient_signature_last_name,
    patient_signature_date
  ) VALUES (
    v_patient_id,
    v_intake_form_id,
    v_patient_first_name,
    v_patient_last_name,
    v_patient_email,
    v_patient_phone,
    false,
    NULL,
    NULL,
    v_deposit_pct,
    NULL,
    NULL,
    v_provider_sig_name,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT ON CONSTRAINT service_agreements_dedupe_unique
  DO NOTHING;

  -- Insert Ibogaine Consent draft (race-safe)
  INSERT INTO public.ibogaine_consent_forms (
    patient_id,
    intake_form_id,
    first_name,
    last_name,
    date_of_birth,
    phone_number,
    email,
    address,
    treatment_date,
    facilitator_doctor_name,
    is_activated,
    signature_data,
    signature_date,
    signature_name
  ) VALUES (
    v_patient_id,
    v_intake_form_id,
    v_patient_first_name,
    v_patient_last_name,
    v_date_of_birth,
    v_patient_phone,
    v_patient_email,
    COALESCE(NULLIF(v_address, ''), ''), -- drafts allowed to be empty, activation check will enforce
    NULL,
    NULL,
    false,
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT ON CONSTRAINT ibogaine_consent_forms_dedupe_unique
  DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in auto_create_forms_after_medical_history: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_create_forms_after_medical_history ON public.medical_history_forms;

CREATE TRIGGER trigger_auto_create_forms_after_medical_history
  AFTER INSERT ON public.medical_history_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_forms_after_medical_history();

REVOKE ALL ON FUNCTION public.auto_create_forms_after_medical_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_create_forms_after_medical_history() TO service_role;


-- =============================================================================
-- 6) Helper validation functions (optional, nice for UI)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_service_agreement_admin_fields_complete(form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_form public.service_agreements%ROWTYPE;
BEGIN
  SELECT * INTO v_form FROM public.service_agreements WHERE id = form_id;
  IF NOT FOUND THEN RETURN false; END IF;

  RETURN (
    -- Admin/financial fields
    v_form.total_program_fee IS NOT NULL AND
    v_form.deposit_amount IS NOT NULL AND
    v_form.deposit_percentage IS NOT NULL AND
    v_form.remaining_balance IS NOT NULL AND
    v_form.payment_method IS NOT NULL AND btrim(v_form.payment_method) <> '' AND
    -- Provider signature fields
    v_form.provider_signature_name IS NOT NULL AND btrim(v_form.provider_signature_name) <> '' AND
    v_form.provider_signature_first_name IS NOT NULL AND btrim(v_form.provider_signature_first_name) <> '' AND
    v_form.provider_signature_last_name IS NOT NULL AND btrim(v_form.provider_signature_last_name) <> '' AND
    v_form.provider_signature_date IS NOT NULL AND
    -- Patient signature fields (required for activation per CHECK constraint)
    v_form.patient_signature_name IS NOT NULL AND btrim(v_form.patient_signature_name) <> '' AND
    v_form.patient_signature_first_name IS NOT NULL AND btrim(v_form.patient_signature_first_name) <> '' AND
    v_form.patient_signature_last_name IS NOT NULL AND btrim(v_form.patient_signature_last_name) <> '' AND
    v_form.patient_signature_date IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_ibogaine_consent_admin_fields_complete(form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_form public.ibogaine_consent_forms%ROWTYPE;
BEGIN
  SELECT * INTO v_form FROM public.ibogaine_consent_forms WHERE id = form_id;
  IF NOT FOUND THEN RETURN false; END IF;

  RETURN (
    -- Admin fields
    v_form.treatment_date IS NOT NULL AND
    v_form.facilitator_doctor_name IS NOT NULL AND btrim(v_form.facilitator_doctor_name) <> '' AND
    v_form.date_of_birth IS NOT NULL AND
    v_form.address IS NOT NULL AND btrim(v_form.address) <> '' AND
    -- Patient signature fields (required for activation per CHECK constraint)
    v_form.signature_data IS NOT NULL AND btrim(v_form.signature_data) <> '' AND
    v_form.signature_date IS NOT NULL AND
    v_form.signature_name IS NOT NULL AND btrim(v_form.signature_name) <> ''
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_service_agreement_admin_fields_complete(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_ibogaine_consent_admin_fields_complete(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.check_service_agreement_admin_fields_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ibogaine_consent_admin_fields_complete(UUID) TO authenticated;

COMMIT;