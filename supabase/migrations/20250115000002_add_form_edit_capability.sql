-- =============================================================================
-- Add Form Edit Capability with Comprehensive Audit Logging
-- =============================================================================
-- This migration adds edit capability to all completed forms with full audit trail
-- Owner, Admin, and Manager roles can edit completed forms
-- All edits are automatically logged to form_edit_history table
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Add audit columns to all 8 form tables
-- =============================================================================

-- Daily Psychological Updates
ALTER TABLE public.patient_management_daily_psychological_updates
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Daily Medical Updates
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Daily SOWS
ALTER TABLE public.patient_management_daily_sows
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Daily OOWS
ALTER TABLE public.patient_management_daily_oows
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Intake Reports
ALTER TABLE public.patient_management_intake_reports
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Medical Intake Reports
ALTER TABLE public.patient_management_medical_intake_reports
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Parkinson's Psychological Reports
ALTER TABLE public.patient_management_parkinsons_psychological_reports
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Parkinson's Mortality Scales
ALTER TABLE public.patient_management_parkinsons_mortality_scales
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- =============================================================================
-- PART 2: Create form_edit_history table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.form_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_table TEXT NOT NULL,
  form_id UUID NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  editor_name TEXT,
  editor_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_edit_history_form ON public.form_edit_history(form_table, form_id);
CREATE INDEX IF NOT EXISTS idx_form_edit_history_edited_by ON public.form_edit_history(edited_by);
CREATE INDEX IF NOT EXISTS idx_form_edit_history_edited_at ON public.form_edit_history(edited_at DESC);

-- Enable RLS
ALTER TABLE public.form_edit_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view all form edit history"
  ON public.form_edit_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse')
    )
  );

CREATE POLICY "System can insert form edit history"
  ON public.form_edit_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================================================
-- PART 3: Create audit logging trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_form_edit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  field_record RECORD;
  old_val TEXT;
  new_val TEXT;
  editor_profile RECORD;
  full_name TEXT;
BEGIN
  -- Only log edits if form is completed and stays completed
  IF OLD.is_completed = true AND NEW.is_completed = true THEN
    -- Get editor profile information
    SELECT 
      COALESCE(p.name, CONCAT(p.first_name, ' ', p.last_name), p.first_name, p.last_name, 'Unknown') as full_name,
      p.role
    INTO editor_profile
    FROM public.profiles p
    WHERE p.id = auth.uid();

    -- Update audit fields
    NEW.edited_at = NOW();
    NEW.edited_by = auth.uid();
    NEW.edit_count = COALESCE(OLD.edit_count, 0) + 1;

    -- Log changes for each field
    FOR field_record IN 
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = TG_TABLE_NAME
        AND column_name NOT IN (
          'id', 'created_at', 'updated_at', 'edited_at', 'edited_by', 
          'edit_count', 'is_completed', 'completed_at'
        )
    LOOP
      EXECUTE format(
        'SELECT ($1).%I::TEXT, ($2).%I::TEXT', 
        field_record.column_name, 
        field_record.column_name
      ) INTO old_val, new_val USING OLD, NEW;

      -- Only log if value actually changed
      IF old_val IS DISTINCT FROM new_val THEN
        INSERT INTO public.form_edit_history (
          form_table, 
          form_id, 
          edited_by, 
          edited_at, 
          field_name, 
          old_value, 
          new_value, 
          editor_name, 
          editor_role
        )
        VALUES (
          TG_TABLE_NAME, 
          NEW.id, 
          auth.uid(), 
          NOW(), 
          field_record.column_name, 
          old_val, 
          new_val, 
          editor_profile.full_name, 
          editor_profile.role
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- PART 4: Apply trigger to all 8 form tables
-- =============================================================================

-- Daily Psychological Updates
DROP TRIGGER IF EXISTS trigger_log_form_edit ON public.patient_management_daily_psychological_updates;
CREATE TRIGGER trigger_log_form_edit
  BEFORE UPDATE ON public.patient_management_daily_psychological_updates
  FOR EACH ROW EXECUTE FUNCTION public.log_form_edit();

-- Daily Medical Updates
DROP TRIGGER IF EXISTS trigger_log_form_edit ON public.patient_management_daily_medical_updates;
CREATE TRIGGER trigger_log_form_edit
  BEFORE UPDATE ON public.patient_management_daily_medical_updates
  FOR EACH ROW EXECUTE FUNCTION public.log_form_edit();

-- Daily SOWS
DROP TRIGGER IF EXISTS trigger_log_form_edit ON public.patient_management_daily_sows;
CREATE TRIGGER trigger_log_form_edit
  BEFORE UPDATE ON public.patient_management_daily_sows
  FOR EACH ROW EXECUTE FUNCTION public.log_form_edit();

-- Daily OOWS
DROP TRIGGER IF EXISTS trigger_log_form_edit ON public.patient_management_daily_oows;
CREATE TRIGGER trigger_log_form_edit
  BEFORE UPDATE ON public.patient_management_daily_oows
  FOR EACH ROW EXECUTE FUNCTION public.log_form_edit();

-- Intake Reports
DROP TRIGGER IF EXISTS trigger_log_form_edit ON public.patient_management_intake_reports;
CREATE TRIGGER trigger_log_form_edit
  BEFORE UPDATE ON public.patient_management_intake_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_form_edit();

-- Medical Intake Reports
DROP TRIGGER IF EXISTS trigger_log_form_edit ON public.patient_management_medical_intake_reports;
CREATE TRIGGER trigger_log_form_edit
  BEFORE UPDATE ON public.patient_management_medical_intake_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_form_edit();

-- Parkinson's Psychological Reports
DROP TRIGGER IF EXISTS trigger_log_form_edit ON public.patient_management_parkinsons_psychological_reports;
CREATE TRIGGER trigger_log_form_edit
  BEFORE UPDATE ON public.patient_management_parkinsons_psychological_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_form_edit();

-- Parkinson's Mortality Scales
DROP TRIGGER IF EXISTS trigger_log_form_edit ON public.patient_management_parkinsons_mortality_scales;
CREATE TRIGGER trigger_log_form_edit
  BEFORE UPDATE ON public.patient_management_parkinsons_mortality_scales
  FOR EACH ROW EXECUTE FUNCTION public.log_form_edit();

-- =============================================================================
-- PART 5: Create RPC function to fetch edit history
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_form_edit_history(p_form_table TEXT, p_form_id UUID)
RETURNS TABLE (
  id UUID, 
  edited_by UUID, 
  edited_at TIMESTAMPTZ, 
  field_name TEXT, 
  old_value TEXT, 
  new_value TEXT, 
  editor_name TEXT, 
  editor_role TEXT
)
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, pg_temp AS $$
BEGIN
  -- Check if user is staff
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse')
  ) THEN
    RAISE EXCEPTION 'Only staff can view form edit history';
  END IF;
  
  RETURN QUERY
  SELECT 
    feh.id, 
    feh.edited_by, 
    feh.edited_at, 
    feh.field_name, 
    feh.old_value, 
    feh.new_value, 
    feh.editor_name, 
    feh.editor_role
  FROM public.form_edit_history feh
  WHERE feh.form_table = p_form_table 
    AND feh.form_id = p_form_id
  ORDER BY feh.edited_at DESC;
END;
$$;

-- Add comments
COMMENT ON TABLE public.form_edit_history IS 'Audit trail for all form edits';
COMMENT ON COLUMN public.form_edit_history.form_table IS 'Name of the form table that was edited';
COMMENT ON COLUMN public.form_edit_history.form_id IS 'ID of the form record that was edited';
COMMENT ON COLUMN public.form_edit_history.field_name IS 'Name of the field that was changed';
COMMENT ON COLUMN public.form_edit_history.old_value IS 'Previous value of the field';
COMMENT ON COLUMN public.form_edit_history.new_value IS 'New value of the field';
COMMENT ON COLUMN public.form_edit_history.editor_name IS 'Name of the person who made the edit';
COMMENT ON COLUMN public.form_edit_history.editor_role IS 'Role of the person who made the edit';

COMMIT;
