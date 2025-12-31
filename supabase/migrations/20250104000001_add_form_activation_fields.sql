ALTER TABLE public.service_agreements
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.ibogaine_consent_forms
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS service_agreements_is_activated_idx ON public.service_agreements(is_activated) WHERE is_activated = false;
CREATE INDEX IF NOT EXISTS ibogaine_consent_forms_is_activated_idx ON public.ibogaine_consent_forms(is_activated) WHERE is_activated = false;

COMMENT ON COLUMN public.service_agreements.is_activated IS 'Whether this form has been activated by admin for patient access';
COMMENT ON COLUMN public.service_agreements.activated_at IS 'Timestamp when form was activated';
COMMENT ON COLUMN public.service_agreements.activated_by IS 'Admin user who activated this form';

COMMENT ON COLUMN public.ibogaine_consent_forms.is_activated IS 'Whether this form has been activated by admin for patient access';
COMMENT ON COLUMN public.ibogaine_consent_forms.activated_at IS 'Timestamp when form was activated';
COMMENT ON COLUMN public.ibogaine_consent_forms.activated_by IS 'Admin user who activated this form';

