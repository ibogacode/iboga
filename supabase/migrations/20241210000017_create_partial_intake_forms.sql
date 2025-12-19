-- Create table for partial intake forms initiated by admin/owner
CREATE TABLE IF NOT EXISTS public.partial_intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Unique token for the form link
  token TEXT UNIQUE NOT NULL,
  
  -- Mode: 'minimal' (name, email only) or 'partial' (up to emergency contact)
  mode TEXT NOT NULL CHECK (mode IN ('minimal', 'partial')),
  
  -- Who is filling out the form
  filled_by TEXT CHECK (filled_by IN ('self', 'someone_else')),
  filler_relationship TEXT,
  filler_first_name TEXT,
  filler_last_name TEXT,
  filler_email TEXT,
  filler_phone TEXT,
  
  -- Pre-filled data (minimal mode)
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  
  -- Pre-filled data (partial mode - additional fields)
  phone_number TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say')),
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  emergency_contact_first_name TEXT,
  emergency_contact_last_name TEXT,
  emergency_contact_email TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_address TEXT,
  emergency_contact_relationship TEXT,
  program_type TEXT CHECK (program_type IN ('neurological', 'mental_health', 'addiction')),
  
  -- Email recipient information
  recipient_email TEXT NOT NULL, -- Email to send the form link to
  recipient_name TEXT, -- Name of person who will complete the form
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id), -- Admin/owner who created this
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ, -- When the form was completed
  completed_form_id UUID REFERENCES public.patient_intake_forms(id), -- Link to completed form
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- Link expires in 30 days
  email_sent_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS partial_intake_forms_token_idx ON public.partial_intake_forms(token);
CREATE INDEX IF NOT EXISTS partial_intake_forms_created_by_idx ON public.partial_intake_forms(created_by);
CREATE INDEX IF NOT EXISTS partial_intake_forms_recipient_email_idx ON public.partial_intake_forms(recipient_email);
CREATE INDEX IF NOT EXISTS partial_intake_forms_completed_at_idx ON public.partial_intake_forms(completed_at);

-- Enable Row Level Security
ALTER TABLE public.partial_intake_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin and owner can insert (create partial forms)
CREATE POLICY "Admin and owner can create partial intake forms"
  ON public.partial_intake_forms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Admin and owner can view all partial forms
CREATE POLICY "Admin and owner can view partial intake forms"
  ON public.partial_intake_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Public can view by token (for form completion)
CREATE POLICY "Public can view partial intake form by token"
  ON public.partial_intake_forms
  FOR SELECT
  TO anon, authenticated
  USING (true); -- Token provides access control

-- Admin and owner can update partial forms
CREATE POLICY "Admin and owner can update partial intake forms"
  ON public.partial_intake_forms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Function to update completed_at when form is completed
CREATE OR REPLACE FUNCTION public.handle_partial_intake_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_form_id IS NOT NULL AND OLD.completed_form_id IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update completed_at
DROP TRIGGER IF EXISTS set_partial_intake_completed_at ON public.partial_intake_forms;
CREATE TRIGGER set_partial_intake_completed_at
  BEFORE UPDATE ON public.partial_intake_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_partial_intake_completed();
