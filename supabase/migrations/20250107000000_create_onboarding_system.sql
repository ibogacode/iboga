-- =============================================================================
-- Iboga - Onboarding System (Production-Ready)
-- =============================================================================
-- Features:
--   1) patient_onboarding table with proper constraints
--   2) 5 onboarding form tables (one per onboarding)
--   3) NO anon/public access - authenticated only
--   4) Patients: SELECT/UPDATE only their own records (via patient_id = auth.uid())
--   5) Staff: SELECT all; Admin staff: INSERT/UPDATE/DELETE
--   6) RPC for creating onboarding + prefilling forms (idempotent)
--   7) RPC for linking patient_id when patient account is created
--   8) AFTER UPDATE triggers for form completion propagation
--   9) Proper unique constraints to prevent duplicates
--
-- Security Model:
--   - Patients can ONLY access records where patient_id = auth.uid()
--   - Email-only onboarding records are NOT accessible to patients until linked
--   - Staff must use link_patient_to_onboarding RPC to attach patient_id
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 0: Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- PART 1: Helper Functions for Role Checking
-- =============================================================================

-- Check if current user is any staff role
CREATE OR REPLACE FUNCTION public.is_staff_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
  );
END;
$$;

-- Check if current user is admin staff (can create/modify onboarding)
CREATE OR REPLACE FUNCTION public.is_admin_staff_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager')
  );
END;
$$;

-- Check if patient owns an onboarding record (ONLY via patient_id, not email)
CREATE OR REPLACE FUNCTION public.owns_onboarding(p_onboarding_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.patient_onboarding o
    WHERE o.id = p_onboarding_id
      AND o.patient_id IS NOT NULL
      AND o.patient_id = auth.uid()
  );
END;
$$;

-- =============================================================================
-- PART 2: patient_onboarding Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to source data
  intake_form_id UUID REFERENCES public.patient_intake_forms(id) ON DELETE SET NULL,
  partial_intake_form_id UUID NULL, -- Set FK if partial_intake_forms exists
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Patient info (denormalized for display)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  date_of_birth DATE,
  program_type TEXT,

  -- Emergency contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_email TEXT,
  emergency_contact_relationship TEXT,

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'moved_to_management')),
  
  -- Admin checklist items
  payment_received BOOLEAN NOT NULL DEFAULT false,
  travel_arranged BOOLEAN NOT NULL DEFAULT false,
  medical_clearance BOOLEAN NOT NULL DEFAULT false,

  -- Form completion flags (updated by triggers)
  release_form_completed BOOLEAN NOT NULL DEFAULT false,
  outing_consent_completed BOOLEAN NOT NULL DEFAULT false,
  social_media_release_completed BOOLEAN NOT NULL DEFAULT false,
  internal_regulations_completed BOOLEAN NOT NULL DEFAULT false,
  informed_dissent_completed BOOLEAN NOT NULL DEFAULT false,

  -- Workflow metadata
  notes TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expected_arrival_date DATE,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  moved_to_management_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- =============================================================================
-- PART 3: Unique Constraints for patient_onboarding
-- =============================================================================

-- One onboarding per intake form
CREATE UNIQUE INDEX IF NOT EXISTS patient_onboarding_intake_form_id_uniq_idx
  ON public.patient_onboarding(intake_form_id)
  WHERE intake_form_id IS NOT NULL;

-- One onboarding per partial intake form
CREATE UNIQUE INDEX IF NOT EXISTS patient_onboarding_partial_intake_form_id_uniq_idx
  ON public.patient_onboarding(partial_intake_form_id)
  WHERE partial_intake_form_id IS NOT NULL;

-- One onboarding per patient profile
CREATE UNIQUE INDEX IF NOT EXISTS patient_onboarding_patient_id_uniq_idx
  ON public.patient_onboarding(patient_id)
  WHERE patient_id IS NOT NULL;

-- One onboarding per email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS patient_onboarding_email_lower_uniq_idx
  ON public.patient_onboarding(LOWER(email));

-- Performance indexes
CREATE INDEX IF NOT EXISTS patient_onboarding_status_idx 
  ON public.patient_onboarding(status);
CREATE INDEX IF NOT EXISTS patient_onboarding_created_at_idx 
  ON public.patient_onboarding(created_at DESC);
CREATE INDEX IF NOT EXISTS patient_onboarding_assigned_to_idx 
  ON public.patient_onboarding(assigned_to) 
  WHERE assigned_to IS NOT NULL;

-- =============================================================================
-- PART 4: Onboarding Form Tables (5 tables)
-- =============================================================================

-- 4.1 Release Form
CREATE TABLE IF NOT EXISTS public.onboarding_release_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.patient_onboarding(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Form fields
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_email TEXT NOT NULL,
  emergency_contact_relationship TEXT NOT NULL,

  -- Consent checkboxes
  voluntary_participation BOOLEAN NOT NULL DEFAULT false,
  medical_conditions_disclosed BOOLEAN NOT NULL DEFAULT false,
  risks_acknowledged BOOLEAN NOT NULL DEFAULT false,
  medical_supervision_agreed BOOLEAN NOT NULL DEFAULT false,
  confidentiality_understood BOOLEAN NOT NULL DEFAULT false,
  liability_waiver_accepted BOOLEAN NOT NULL DEFAULT false,
  compliance_agreed BOOLEAN NOT NULL DEFAULT false,
  consent_to_treatment BOOLEAN NOT NULL DEFAULT false,

  -- Signature
  signature_data TEXT,
  signature_date DATE,

  -- Status
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_activated BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_release_forms_onboarding_id_uniq_idx
  ON public.onboarding_release_forms(onboarding_id);

-- 4.2 Outing Consent Form
CREATE TABLE IF NOT EXISTS public.onboarding_outing_consent_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.patient_onboarding(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  date_of_outing DATE,
  email TEXT NOT NULL,

  protocol_compliance BOOLEAN NOT NULL DEFAULT false,
  proper_conduct BOOLEAN NOT NULL DEFAULT false,
  no_harassment BOOLEAN NOT NULL DEFAULT false,
  substance_prohibition BOOLEAN NOT NULL DEFAULT false,
  financial_penalties_accepted BOOLEAN NOT NULL DEFAULT false,
  additional_consequences_understood BOOLEAN NOT NULL DEFAULT false,
  declaration_read_understood BOOLEAN NOT NULL DEFAULT false,

  signature_data TEXT,
  signature_date DATE,

  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_activated BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_outing_consent_forms_onboarding_id_uniq_idx
  ON public.onboarding_outing_consent_forms(onboarding_id);

-- 4.3 Social Media Form
CREATE TABLE IF NOT EXISTS public.onboarding_social_media_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.patient_onboarding(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,

  consent_image_photograph BOOLEAN NOT NULL DEFAULT false,
  consent_video_recordings BOOLEAN NOT NULL DEFAULT false,
  consent_voice_recordings BOOLEAN NOT NULL DEFAULT false,
  consent_written_testimonials BOOLEAN NOT NULL DEFAULT false,
  consent_first_name_only BOOLEAN NOT NULL DEFAULT false,

  authorize_recording BOOLEAN NOT NULL DEFAULT false,
  authorize_promotional_use BOOLEAN NOT NULL DEFAULT false,

  voluntary_participation_understood BOOLEAN NOT NULL DEFAULT false,
  confidentiality_understood BOOLEAN NOT NULL DEFAULT false,
  revocation_understood BOOLEAN NOT NULL DEFAULT false,
  anonymity_option_understood BOOLEAN NOT NULL DEFAULT false,

  signature_data TEXT,
  signature_date DATE,

  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_activated BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_social_media_forms_onboarding_id_uniq_idx
  ON public.onboarding_social_media_forms(onboarding_id);

-- 4.4 Internal Regulations Form
CREATE TABLE IF NOT EXISTS public.onboarding_internal_regulations_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.patient_onboarding(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,

  regulations_read_understood BOOLEAN NOT NULL DEFAULT false,
  rights_acknowledged BOOLEAN NOT NULL DEFAULT false,
  obligations_acknowledged BOOLEAN NOT NULL DEFAULT false,
  coexistence_rules_acknowledged BOOLEAN NOT NULL DEFAULT false,
  sanctions_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acceptance_confirmed BOOLEAN NOT NULL DEFAULT false,

  signature_data TEXT,
  signature_date DATE,

  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_activated BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_internal_regulations_forms_onboarding_id_uniq_idx
  ON public.onboarding_internal_regulations_forms(onboarding_id);

-- 4.5 Informed Dissent Form
CREATE TABLE IF NOT EXISTS public.onboarding_informed_dissent_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.patient_onboarding(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  official_identification TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  address TEXT NOT NULL,
  email TEXT NOT NULL,

  treatment_refused BOOLEAN NOT NULL DEFAULT false,
  liability_release_accepted BOOLEAN NOT NULL DEFAULT false,
  no_refund_understood BOOLEAN NOT NULL DEFAULT false,
  decision_voluntary BOOLEAN NOT NULL DEFAULT false,
  no_legal_action_agreed BOOLEAN NOT NULL DEFAULT false,

  signature_data TEXT,
  signature_date DATE,

  representative_name TEXT,
  representative_position TEXT,
  representative_signature_data TEXT,
  representative_signature_date DATE,

  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_activated BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_informed_dissent_forms_onboarding_id_uniq_idx
  ON public.onboarding_informed_dissent_forms(onboarding_id);

-- =============================================================================
-- PART 5: Trigger Functions
-- =============================================================================

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Check if all 5 forms are completed and update status
CREATE OR REPLACE FUNCTION public.check_onboarding_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Auto-complete when all 5 forms done
  IF NEW.release_form_completed
     AND NEW.outing_consent_completed
     AND NEW.social_media_release_completed
     AND NEW.internal_regulations_completed
     AND NEW.informed_dissent_completed
     AND NEW.status = 'in_progress'
  THEN
    NEW.status := 'completed';
    NEW.completed_at := NOW();
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Propagate form completion to patient_onboarding (AFTER UPDATE)
CREATE OR REPLACE FUNCTION public.propagate_form_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only act on false -> true transition
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    IF TG_TABLE_NAME = 'onboarding_release_forms' THEN
      UPDATE public.patient_onboarding
      SET release_form_completed = true
      WHERE id = NEW.onboarding_id;

    ELSIF TG_TABLE_NAME = 'onboarding_outing_consent_forms' THEN
      UPDATE public.patient_onboarding
      SET outing_consent_completed = true
      WHERE id = NEW.onboarding_id;

    ELSIF TG_TABLE_NAME = 'onboarding_social_media_forms' THEN
      UPDATE public.patient_onboarding
      SET social_media_release_completed = true
      WHERE id = NEW.onboarding_id;

    ELSIF TG_TABLE_NAME = 'onboarding_internal_regulations_forms' THEN
      UPDATE public.patient_onboarding
      SET internal_regulations_completed = true
      WHERE id = NEW.onboarding_id;

    ELSIF TG_TABLE_NAME = 'onboarding_informed_dissent_forms' THEN
      UPDATE public.patient_onboarding
      SET informed_dissent_completed = true
      WHERE id = NEW.onboarding_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Set completed_at on form when is_completed becomes true (BEFORE UPDATE)
CREATE OR REPLACE FUNCTION public.set_form_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- PART 6: Create Triggers
-- =============================================================================

-- patient_onboarding triggers
DROP TRIGGER IF EXISTS trg_patient_onboarding_check_completion ON public.patient_onboarding;
CREATE TRIGGER trg_patient_onboarding_check_completion
  BEFORE UPDATE ON public.patient_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.check_onboarding_completion();

-- Form table triggers (BEFORE for completed_at, AFTER for propagation)
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'onboarding_release_forms',
    'onboarding_outing_consent_forms', 
    'onboarding_social_media_forms',
    'onboarding_internal_regulations_forms',
    'onboarding_informed_dissent_forms'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    -- Drop existing triggers
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_before_update ON public.%I', t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_after_update ON public.%I', t, t);
    
    -- BEFORE UPDATE: set completed_at and updated_at
    EXECUTE format('
      CREATE TRIGGER trg_%s_before_update
      BEFORE UPDATE ON public.%I
      FOR EACH ROW
      EXECUTE FUNCTION public.set_form_completed_at()
    ', t, t);
    
    -- AFTER UPDATE: propagate completion to parent
    EXECUTE format('
      CREATE TRIGGER trg_%s_after_update
      AFTER UPDATE ON public.%I
      FOR EACH ROW
      WHEN (NEW.is_completed = true AND OLD.is_completed = false)
      EXECUTE FUNCTION public.propagate_form_completion()
    ', t, t);
  END LOOP;
END $$;

-- =============================================================================
-- PART 7: RLS Policies
-- =============================================================================

ALTER TABLE public.patient_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_release_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_outing_consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_social_media_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_internal_regulations_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_informed_dissent_forms ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- patient_onboarding policies
-- -----------------------------------------------------------------------------

-- Staff can SELECT all
DROP POLICY IF EXISTS po_staff_select ON public.patient_onboarding;
CREATE POLICY po_staff_select ON public.patient_onboarding
  FOR SELECT TO authenticated
  USING (public.is_staff_role());

-- Patient can SELECT only their own (must have patient_id set)
DROP POLICY IF EXISTS po_patient_select ON public.patient_onboarding;
CREATE POLICY po_patient_select ON public.patient_onboarding
  FOR SELECT TO authenticated
  USING (patient_id IS NOT NULL AND patient_id = auth.uid());

-- Admin staff can INSERT
DROP POLICY IF EXISTS po_admin_insert ON public.patient_onboarding;
CREATE POLICY po_admin_insert ON public.patient_onboarding
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_staff_role());

-- Admin staff can UPDATE
DROP POLICY IF EXISTS po_admin_update ON public.patient_onboarding;
CREATE POLICY po_admin_update ON public.patient_onboarding
  FOR UPDATE TO authenticated
  USING (public.is_admin_staff_role())
  WITH CHECK (public.is_admin_staff_role());

-- Admin staff can DELETE
DROP POLICY IF EXISTS po_admin_delete ON public.patient_onboarding;
CREATE POLICY po_admin_delete ON public.patient_onboarding
  FOR DELETE TO authenticated
  USING (public.is_admin_staff_role());

-- -----------------------------------------------------------------------------
-- Form table policies (same pattern for all 5)
-- -----------------------------------------------------------------------------

-- Macro for form policies
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'onboarding_release_forms',
    'onboarding_outing_consent_forms',
    'onboarding_social_media_forms',
    'onboarding_internal_regulations_forms',
    'onboarding_informed_dissent_forms'
  ];
  t TEXT;
  prefix TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    -- Generate short prefix for policy names
    prefix := substring(t from 11 for 3); -- e.g., 'rel', 'out', 'soc', 'int', 'inf'
    
    -- Staff SELECT
    EXECUTE format('DROP POLICY IF EXISTS %s_staff_select ON public.%I', prefix, t);
    EXECUTE format('
      CREATE POLICY %s_staff_select ON public.%I
      FOR SELECT TO authenticated
      USING (public.is_staff_role())
    ', prefix, t);
    
    -- Patient SELECT (only if owns onboarding via patient_id)
    EXECUTE format('DROP POLICY IF EXISTS %s_patient_select ON public.%I', prefix, t);
    EXECUTE format('
      CREATE POLICY %s_patient_select ON public.%I
      FOR SELECT TO authenticated
      USING (public.owns_onboarding(onboarding_id))
    ', prefix, t);
    
    -- Admin INSERT
    EXECUTE format('DROP POLICY IF EXISTS %s_admin_insert ON public.%I', prefix, t);
    EXECUTE format('
      CREATE POLICY %s_admin_insert ON public.%I
      FOR INSERT TO authenticated
      WITH CHECK (public.is_admin_staff_role())
    ', prefix, t);
    
    -- Admin UPDATE
    EXECUTE format('DROP POLICY IF EXISTS %s_admin_update ON public.%I', prefix, t);
    EXECUTE format('
      CREATE POLICY %s_admin_update ON public.%I
      FOR UPDATE TO authenticated
      USING (public.is_admin_staff_role())
      WITH CHECK (public.is_admin_staff_role())
    ', prefix, t);
    
    -- Patient UPDATE (only if owns onboarding)
    EXECUTE format('DROP POLICY IF EXISTS %s_patient_update ON public.%I', prefix, t);
    EXECUTE format('
      CREATE POLICY %s_patient_update ON public.%I
      FOR UPDATE TO authenticated
      USING (public.owns_onboarding(onboarding_id))
      WITH CHECK (public.owns_onboarding(onboarding_id))
    ', prefix, t);
    
    -- Admin DELETE
    EXECUTE format('DROP POLICY IF EXISTS %s_admin_delete ON public.%I', prefix, t);
    EXECUTE format('
      CREATE POLICY %s_admin_delete ON public.%I
      FOR DELETE TO authenticated
      USING (public.is_admin_staff_role())
    ', prefix, t);
  END LOOP;
END $$;

-- =============================================================================
-- PART 8: RPC Functions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 8.1 Create Onboarding with Prefill (Admin only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_onboarding_with_prefill(
  p_patient_id UUID DEFAULT NULL,
  p_intake_form_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT;
  v_patient_id UUID;
  v_intake_id UUID;
  v_onboarding_id UUID;
  v_first TEXT;
  v_last TEXT;
  v_phone TEXT;
  v_dob DATE;
  v_program TEXT;
  v_addr TEXT;
  v_city TEXT;
  v_state TEXT;
  v_zip TEXT;
  v_ec_first TEXT;
  v_ec_last TEXT;
  v_ec_phone TEXT;
  v_ec_email TEXT;
  v_ec_rel TEXT;
  v_full_name TEXT;
BEGIN
  -- Authorization check
  IF NOT public.is_admin_staff_role() THEN
    RAISE EXCEPTION 'Not authorized: admin staff role required';
  END IF;

  v_patient_id := p_patient_id;
  v_intake_id := p_intake_form_id;

  -- Get data from intake form if provided
  IF v_intake_id IS NOT NULL THEN
    SELECT
      i.email, i.first_name, i.last_name, i.phone_number, i.date_of_birth, i.program_type,
      i.address, i.city, i.state, i.zip_code,
      i.emergency_contact_first_name, i.emergency_contact_last_name, i.emergency_contact_phone,
      i.emergency_contact_email, i.emergency_contact_relationship
    INTO
      v_email, v_first, v_last, v_phone, v_dob, v_program,
      v_addr, v_city, v_state, v_zip,
      v_ec_first, v_ec_last, v_ec_phone, v_ec_email, v_ec_rel
    FROM public.patient_intake_forms i
    WHERE i.id = v_intake_id;
    
    IF v_email IS NULL THEN
      RAISE EXCEPTION 'Intake form not found: %', v_intake_id;
    END IF;
  ELSE
    v_email := p_email;
  END IF;

  -- Validate email
  IF v_email IS NULL OR btrim(v_email) = '' THEN
    RAISE EXCEPTION 'Email is required (provide intake_form_id or email)';
  END IF;

  -- Try to find patient_id by email if not provided
  IF v_patient_id IS NULL THEN
    SELECT pr.id INTO v_patient_id
    FROM public.profiles pr
    WHERE lower(pr.email) = lower(v_email)
      AND pr.role = 'patient'
    LIMIT 1;
  END IF;

  -- Fallback to profile data if intake data missing
  IF (v_first IS NULL OR v_last IS NULL) AND v_patient_id IS NOT NULL THEN
    SELECT pr.first_name, pr.last_name, pr.phone, pr.date_of_birth, pr.address
    INTO v_first, v_last, v_phone, v_dob, v_addr
    FROM public.profiles pr
    WHERE pr.id = v_patient_id;
  END IF;

  -- Set defaults
  v_first := COALESCE(v_first, '');
  v_last := COALESCE(v_last, '');
  v_full_name := btrim(v_first || ' ' || v_last);

  -- Check for existing onboarding (by intake_form_id, patient_id, or email)
  SELECT o.id INTO v_onboarding_id
  FROM public.patient_onboarding o
  WHERE (v_intake_id IS NOT NULL AND o.intake_form_id = v_intake_id)
     OR (v_patient_id IS NOT NULL AND o.patient_id = v_patient_id)
     OR (lower(o.email) = lower(v_email))
  ORDER BY o.created_at DESC
  LIMIT 1;

  -- Create onboarding if not exists
  IF v_onboarding_id IS NULL THEN
    INSERT INTO public.patient_onboarding (
      intake_form_id, patient_id, first_name, last_name, email,
      phone_number, date_of_birth, program_type,
      emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_contact_relationship,
      address, city, state, zip_code, status, created_by
    )
    VALUES (
      v_intake_id, v_patient_id, v_first, v_last, v_email,
      v_phone, v_dob, v_program,
      NULLIF(btrim(COALESCE(v_ec_first,'') || ' ' || COALESCE(v_ec_last,'')), ''),
      v_ec_phone, v_ec_email, v_ec_rel,
      v_addr, v_city, v_state, v_zip, 'in_progress', auth.uid()
    )
    RETURNING id INTO v_onboarding_id;
  ELSE
    -- Update patient_id if we found one and it's not set
    IF v_patient_id IS NOT NULL THEN
      UPDATE public.patient_onboarding
      SET patient_id = v_patient_id
      WHERE id = v_onboarding_id AND patient_id IS NULL;
    END IF;
  END IF;

  -- Create 5 form rows (idempotent via ON CONFLICT)
  INSERT INTO public.onboarding_release_forms (
    onboarding_id, patient_id, full_name, date_of_birth, phone_number, email,
    emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_contact_relationship
  ) VALUES (
    v_onboarding_id, v_patient_id,
    COALESCE(NULLIF(v_full_name,''), v_email),
    COALESCE(v_dob, CURRENT_DATE),
    COALESCE(v_phone, ''),
    v_email,
    COALESCE(NULLIF(btrim(COALESCE(v_ec_first,'') || ' ' || COALESCE(v_ec_last,'')), ''), ''),
    COALESCE(v_ec_phone, ''),
    COALESCE(v_ec_email, ''),
    COALESCE(v_ec_rel, '')
  ) ON CONFLICT (onboarding_id) DO NOTHING;

  INSERT INTO public.onboarding_outing_consent_forms (
    onboarding_id, patient_id, first_name, last_name, date_of_birth, email
  ) VALUES (
    v_onboarding_id, v_patient_id, v_first, v_last, COALESCE(v_dob, CURRENT_DATE), v_email
  ) ON CONFLICT (onboarding_id) DO NOTHING;

  INSERT INTO public.onboarding_social_media_forms (
    onboarding_id, patient_id, first_name, last_name, email, phone_number
  ) VALUES (
    v_onboarding_id, v_patient_id, v_first, v_last, v_email, v_phone
  ) ON CONFLICT (onboarding_id) DO NOTHING;

  INSERT INTO public.onboarding_internal_regulations_forms (
    onboarding_id, patient_id, first_name, last_name, email, phone_number
  ) VALUES (
    v_onboarding_id, v_patient_id, v_first, v_last, v_email, v_phone
  ) ON CONFLICT (onboarding_id) DO NOTHING;

  INSERT INTO public.onboarding_informed_dissent_forms (
    onboarding_id, patient_id, first_name, last_name, official_identification, phone_number, address, email
  ) VALUES (
    v_onboarding_id, v_patient_id, v_first, v_last, '', COALESCE(v_phone, ''), COALESCE(v_addr, ''), v_email
  ) ON CONFLICT (onboarding_id) DO NOTHING;

  RETURN v_onboarding_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8.2 Link Patient to Onboarding (Admin only)
-- Used when a patient account is created and needs to be linked to existing onboarding
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_patient_to_onboarding(
  p_onboarding_id UUID,
  p_patient_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT;
  v_patient_email TEXT;
BEGIN
  -- Authorization check
  IF NOT public.is_admin_staff_role() THEN
    RAISE EXCEPTION 'Not authorized: admin staff role required';
  END IF;

  -- Validate inputs
  IF p_onboarding_id IS NULL OR p_patient_id IS NULL THEN
    RAISE EXCEPTION 'Both onboarding_id and patient_id are required';
  END IF;

  -- Get onboarding email
  SELECT email INTO v_email
  FROM public.patient_onboarding
  WHERE id = p_onboarding_id;
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Onboarding record not found';
  END IF;

  -- Get patient email
  SELECT email INTO v_patient_email
  FROM public.profiles
  WHERE id = p_patient_id AND role = 'patient';
  
  IF v_patient_email IS NULL THEN
    RAISE EXCEPTION 'Patient profile not found';
  END IF;

  -- Verify emails match (case-insensitive)
  IF lower(v_email) != lower(v_patient_email) THEN
    RAISE EXCEPTION 'Email mismatch: onboarding email does not match patient email';
  END IF;

  -- Update onboarding and all forms
  UPDATE public.patient_onboarding
  SET patient_id = p_patient_id
  WHERE id = p_onboarding_id AND patient_id IS NULL;

  UPDATE public.onboarding_release_forms
  SET patient_id = p_patient_id
  WHERE onboarding_id = p_onboarding_id AND patient_id IS NULL;

  UPDATE public.onboarding_outing_consent_forms
  SET patient_id = p_patient_id
  WHERE onboarding_id = p_onboarding_id AND patient_id IS NULL;

  UPDATE public.onboarding_social_media_forms
  SET patient_id = p_patient_id
  WHERE onboarding_id = p_onboarding_id AND patient_id IS NULL;

  UPDATE public.onboarding_internal_regulations_forms
  SET patient_id = p_patient_id
  WHERE onboarding_id = p_onboarding_id AND patient_id IS NULL;

  UPDATE public.onboarding_informed_dissent_forms
  SET patient_id = p_patient_id
  WHERE onboarding_id = p_onboarding_id AND patient_id IS NULL;

  RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8.3 Auto-link patient on profile creation (optional trigger)
-- When a patient profile is created, auto-link to any matching onboarding
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_link_patient_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_onboarding_id UUID;
BEGIN
  -- Only for patient role
  IF NEW.role != 'patient' THEN
    RETURN NEW;
  END IF;

  -- Find matching onboarding by email
  SELECT id INTO v_onboarding_id
  FROM public.patient_onboarding
  WHERE lower(email) = lower(NEW.email)
    AND patient_id IS NULL
  LIMIT 1;

  -- If found, link it
  IF v_onboarding_id IS NOT NULL THEN
    UPDATE public.patient_onboarding
    SET patient_id = NEW.id
    WHERE id = v_onboarding_id;

    UPDATE public.onboarding_release_forms
    SET patient_id = NEW.id
    WHERE onboarding_id = v_onboarding_id;

    UPDATE public.onboarding_outing_consent_forms
    SET patient_id = NEW.id
    WHERE onboarding_id = v_onboarding_id;

    UPDATE public.onboarding_social_media_forms
    SET patient_id = NEW.id
    WHERE onboarding_id = v_onboarding_id;

    UPDATE public.onboarding_internal_regulations_forms
    SET patient_id = NEW.id
    WHERE onboarding_id = v_onboarding_id;

    UPDATE public.onboarding_informed_dissent_forms
    SET patient_id = NEW.id
    WHERE onboarding_id = v_onboarding_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-linking (on profiles table)
DROP TRIGGER IF EXISTS trg_auto_link_patient_onboarding ON public.profiles;
CREATE TRIGGER trg_auto_link_patient_onboarding
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'patient')
  EXECUTE FUNCTION public.auto_link_patient_onboarding();

-- =============================================================================
-- PART 9: Function Grants
-- =============================================================================

-- Revoke public access
REVOKE ALL ON FUNCTION public.is_staff_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_staff_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_onboarding(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_onboarding_with_prefill(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_patient_to_onboarding(UUID, UUID) FROM PUBLIC;

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION public.is_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_onboarding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_onboarding_with_prefill(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_patient_to_onboarding(UUID, UUID) TO authenticated;

-- =============================================================================
-- PART 10: Comments
-- =============================================================================

COMMENT ON TABLE public.patient_onboarding IS 
  'Tracks patients in onboarding stage. One record per patient (enforced by unique constraints).';

COMMENT ON FUNCTION public.create_onboarding_with_prefill IS 
  'Creates onboarding record + 5 forms with prefilled data. Admin staff only. Idempotent.';

COMMENT ON FUNCTION public.link_patient_to_onboarding IS 
  'Links a patient profile to an existing onboarding record. Admin staff only. Validates email match.';

COMMENT ON FUNCTION public.auto_link_patient_onboarding IS 
  'Trigger function: auto-links new patient profiles to matching onboarding records by email.';

COMMIT;
