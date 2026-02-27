-- Remove Social Media Consent and Informed Dissent from Form completion rates (Research)
-- These forms are no longer shown in the Form completion rates chart.

CREATE OR REPLACE FUNCTION get_form_completion_rates(
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  form_name text,
  total_onboarding bigint,
  completed bigint,
  completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count bigint;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM patient_onboarding po
  WHERE (date_from IS NULL OR po.created_at >= date_from)
    AND (date_to IS NULL OR po.created_at <= date_to);

  RETURN QUERY
  SELECT * FROM (VALUES
    ('Release Form'::text,
      total_count,
      (SELECT COUNT(*)::bigint FROM onboarding_release_forms f
        JOIN patient_onboarding po ON po.id = f.onboarding_id
        WHERE f.is_completed = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)),
      ROUND(100.0 * (SELECT COUNT(*) FROM onboarding_release_forms f
        JOIN patient_onboarding po ON po.id = f.onboarding_id
        WHERE f.is_completed = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)) / NULLIF(total_count, 0), 1)),
    ('Outing Consent'::text,
      total_count,
      (SELECT COUNT(*)::bigint FROM onboarding_outing_consent_forms f
        JOIN patient_onboarding po ON po.id = f.onboarding_id
        WHERE f.is_completed = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)),
      ROUND(100.0 * (SELECT COUNT(*) FROM onboarding_outing_consent_forms f
        JOIN patient_onboarding po ON po.id = f.onboarding_id
        WHERE f.is_completed = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)) / NULLIF(total_count, 0), 1)),
    ('Internal Regulations'::text,
      total_count,
      (SELECT COUNT(*)::bigint FROM onboarding_internal_regulations_forms f
        JOIN patient_onboarding po ON po.id = f.onboarding_id
        WHERE f.is_completed = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)),
      ROUND(100.0 * (SELECT COUNT(*) FROM onboarding_internal_regulations_forms f
        JOIN patient_onboarding po ON po.id = f.onboarding_id
        WHERE f.is_completed = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)) / NULLIF(total_count, 0), 1)),
    ('Service Agreement'::text,
      total_count,
      (SELECT COUNT(*)::bigint FROM service_agreements sa
        JOIN patient_onboarding po ON po.patient_id = sa.patient_id
        WHERE sa.is_activated = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)),
      ROUND(100.0 * (SELECT COUNT(*) FROM service_agreements sa
        JOIN patient_onboarding po ON po.patient_id = sa.patient_id
        WHERE sa.is_activated = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)) / NULLIF(total_count, 0), 1)),
    ('Ibogaine Consent'::text,
      total_count,
      (SELECT COUNT(*)::bigint FROM ibogaine_consent_forms icf
        JOIN patient_onboarding po ON po.patient_id = icf.patient_id
        WHERE icf.is_activated = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)),
      ROUND(100.0 * (SELECT COUNT(*) FROM ibogaine_consent_forms icf
        JOIN patient_onboarding po ON po.patient_id = icf.patient_id
        WHERE icf.is_activated = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)) / NULLIF(total_count, 0), 1))
  ) AS t(form_name, total_onboarding, completed, completion_rate);
END;
$$;

COMMENT ON FUNCTION get_form_completion_rates IS 'Research: form completion % (excludes Social Media Consent and Informed Dissent)';
