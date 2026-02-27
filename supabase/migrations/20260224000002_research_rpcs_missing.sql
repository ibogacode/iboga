-- Phase 1: Missing Research RPCs

-- RPC 1: Admissions by month for Overview area chart
CREATE OR REPLACE FUNCTION get_admissions_by_month(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  program_types text[] DEFAULT NULL
)
RETURNS TABLE(
  month text,
  month_date date,
  neurological bigint,
  mental_health bigint,
  addiction bigint,
  total bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', pm.arrival_date), 'Mon YYYY') AS month,
    DATE_TRUNC('month', pm.arrival_date)::date AS month_date,
    COUNT(*) FILTER (WHERE pm.program_type = 'neurological')::bigint,
    COUNT(*) FILTER (WHERE pm.program_type = 'mental_health')::bigint,
    COUNT(*) FILTER (WHERE pm.program_type = 'addiction')::bigint,
    COUNT(*)::bigint AS total
  FROM patient_management pm
  WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
    AND (date_to IS NULL OR pm.arrival_date <= date_to)
    AND (program_types IS NULL OR cardinality(program_types) = 0
        OR pm.program_type = ANY(program_types))
  GROUP BY DATE_TRUNC('month', pm.arrival_date)
  ORDER BY DATE_TRUNC('month', pm.arrival_date);
END;
$$;

-- RPC 2: Parkinson's cohort data
CREATE OR REPLACE FUNCTION get_parkinsons_cohort(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL
)
RETURNS TABLE(
  patient_id uuid,
  patient_first_name text,
  patient_last_name text,
  arrival_date date,
  actual_departure_date date,
  stay_days int,
  age_years int,
  disease_duration_years int,
  hoehn_yahr_stage text,
  mds_updrs_total_score int,
  part_i_total_score int,
  part_ii_total_score int,
  part_iii_total_score int,
  part_iv_total_score int,
  schwab_england_total_score int,
  mds_pd_frailty_total_score int,
  risk_classification text,
  falls_past_6_12_months text,
  dementia text,
  psych_overall_mental_health text,
  psych_depression_severity text,
  psych_anxiety_severity text,
  psych_sleep_quality text,
  psych_emotional_numbness text,
  psych_motor_symptoms_severity text,
  psych_non_motor_symptoms_severity text,
  psych_treatment_outcome_hope text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.patient_id,
    pm.first_name,
    pm.last_name,
    pm.arrival_date::date,
    pm.actual_departure_date::date,
    CASE WHEN pm.actual_departure_date IS NOT NULL
      THEN (pm.actual_departure_date::date - pm.arrival_date::date)::int
      ELSE NULL
    END,
    ms.age_years,
    ms.disease_duration_years,
    ms.hoehn_yahr_stage,
    ms.mds_updrs_total_score,
    ms.part_i_total_score,
    ms.part_ii_total_score,
    ms.part_iii_total_score,
    ms.part_iv_total_score,
    ms.schwab_england_total_score,
    ms.mds_pd_frailty_total_score,
    ms.risk_classification,
    ms.falls_past_6_12_months,
    ms.dementia,
    pr.overall_mental_health_rating,
    pr.depression_sadness_severity,
    pr.anxiety_nervousness_severity,
    pr.sleep_quality,
    pr.emotional_numbness_frequency,
    pr.parkinsons_motor_symptoms_severity,
    pr.non_motor_symptoms_severity,
    pr.treatment_outcome_hope
  FROM patient_management pm
  LEFT JOIN patient_management_parkinsons_mortality_scales ms
    ON ms.management_id = pm.id
  LEFT JOIN patient_management_parkinsons_psychological_reports pr
    ON pr.management_id = pm.id
  WHERE pm.program_type = 'neurological'
    AND (date_from IS NULL OR pm.arrival_date >= date_from)
    AND (date_to IS NULL OR pm.arrival_date <= date_to)
  ORDER BY pm.arrival_date DESC;
END;
$$;

-- RPC 3: Dosing analysis
CREATE OR REPLACE FUNCTION get_dosing_analysis(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  program_types text[] DEFAULT NULL
)
RETURNS TABLE(
  management_id uuid,
  patient_id uuid,
  program_type text,
  form_date date,
  day_of_stay int,
  ibogaine_given text,
  ibogaine_dose int,
  ibogaine_doses jsonb,
  ibogaine_frequency text,
  morning_heart_rate int,
  afternoon_heart_rate int,
  night_heart_rate int,
  morning_blood_pressure text,
  afternoon_blood_pressure text,
  night_blood_pressure text,
  morning_oxygen_saturation int,
  afternoon_oxygen_saturation int,
  night_oxygen_saturation int,
  solutions_iv_saline_nadh text,
  medication_schedule text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.management_id,
    pm.patient_id,
    pm.program_type,
    d.form_date::date,
    (d.form_date::date - pm.arrival_date::date + 1)::int AS day_of_stay,
    d.ibogaine_given,
    d.ibogaine_dose,
    d.ibogaine_doses,
    d.ibogaine_frequency,
    d.morning_heart_rate,
    d.afternoon_heart_rate,
    d.night_heart_rate,
    d.morning_blood_pressure,
    d.afternoon_blood_pressure,
    d.night_blood_pressure,
    d.morning_oxygen_saturation,
    d.afternoon_oxygen_saturation,
    d.night_oxygen_saturation,
    d.solutions_iv_saline_nadh,
    d.medication_schedule
  FROM patient_management_daily_medical_updates d
  JOIN patient_management pm ON pm.id = d.management_id
  WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
    AND (date_to IS NULL OR pm.arrival_date <= date_to)
    AND (program_types IS NULL OR cardinality(program_types) = 0
        OR pm.program_type = ANY(program_types))
  ORDER BY pm.arrival_date, d.form_date;
END;
$$;

-- RPC 4: Withdrawal by substance
CREATE OR REPLACE FUNCTION get_withdrawal_by_substance(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL
)
RETURNS TABLE(
  substance_category text,
  patient_count bigint,
  avg_peak_sows numeric,
  avg_peak_oows numeric,
  severe_cases_count bigint,
  severe_cases_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH substance_patients AS (
    SELECT
      pm.id AS management_id,
      CASE
        WHEN cdf.substances_current ILIKE ANY(ARRAY['%heroin%','%opioid%','%opiate%','%fentanyl%','%morphine%','%oxycodone%','%hydrocodone%','%methadone%','%suboxone%','%buprenorphine%'])
          THEN 'Opioids'
        WHEN cdf.substances_current ILIKE ANY(ARRAY['%alcohol%','%beer%','%wine%','%whiskey%','%vodka%','%liquor%'])
          THEN 'Alcohol'
        WHEN cdf.substances_current ILIKE ANY(ARRAY['%benzo%','%diazepam%','%lorazepam%','%xanax%','%alprazolam%','%clonazepam%','%valium%','%klonopin%'])
          THEN 'Benzodiazepines'
        WHEN cdf.substances_current ILIKE ANY(ARRAY['%cocaine%','%crack%','%stimulant%','%amphetamine%','%meth%','%adderall%'])
          THEN 'Stimulants'
        WHEN cdf.substances_current ILIKE ANY(ARRAY['%cannabis%','%marijuana%','%weed%','%thc%'])
          THEN 'Cannabis'
        WHEN cdf.substances_current ILIKE ANY(ARRAY['%multiple%','%poly%','%various%','%several%'])
          THEN 'Polysubstance'
        WHEN cdf.substances_current IS NOT NULL
          THEN 'Other'
        ELSE 'Unknown'
      END AS substance_category
    FROM patient_management pm
    JOIN patient_onboarding po ON po.id = pm.onboarding_id
    LEFT JOIN clinical_director_consult_forms cdf ON cdf.onboarding_id = po.id
    WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
  ),
  sows_peaks AS (
    SELECT
      d.management_id,
      MAX(d.total_score) AS peak_sows
    FROM patient_management_daily_sows d
    GROUP BY d.management_id
  ),
  oows_peaks AS (
    SELECT
      d.management_id,
      MAX(d.total_score) AS peak_oows
    FROM patient_management_daily_oows d
    GROUP BY d.management_id
  )
  SELECT
    sp.substance_category,
    COUNT(DISTINCT sp.management_id)::bigint AS patient_count,
    ROUND(AVG(sows.peak_sows), 1) AS avg_peak_sows,
    ROUND(AVG(oows.peak_oows), 1) AS avg_peak_oows,
    COUNT(*) FILTER (WHERE sows.peak_sows > 36)::bigint AS severe_cases_count,
    CASE WHEN COUNT(DISTINCT sp.management_id) > 0
      THEN ROUND(100.0 * COUNT(*) FILTER (WHERE sows.peak_sows > 36) / COUNT(DISTINCT sp.management_id), 1)
      ELSE 0
    END AS severe_cases_pct
  FROM substance_patients sp
  LEFT JOIN sows_peaks sows ON sows.management_id = sp.management_id
  LEFT JOIN oows_peaks oows ON oows.management_id = sp.management_id
  GROUP BY sp.substance_category
  ORDER BY avg_peak_sows DESC NULLS LAST;
END;
$$;

-- RPC 5: Form completion rates
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
    ('Social Media Consent'::text,
      total_count,
      (SELECT COUNT(*)::bigint FROM onboarding_social_media_forms f
        JOIN patient_onboarding po ON po.id = f.onboarding_id
        WHERE f.is_completed = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)),
      ROUND(100.0 * (SELECT COUNT(*) FROM onboarding_social_media_forms f
        JOIN patient_onboarding po ON po.id = f.onboarding_id
        WHERE f.is_completed = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)) / NULLIF(total_count, 0), 1)),
    ('Informed Dissent'::text,
      total_count,
      (SELECT COUNT(*)::bigint FROM onboarding_informed_dissent_forms f
        JOIN patient_onboarding po ON po.id = f.onboarding_id
        WHERE f.is_completed = true
          AND (date_from IS NULL OR po.created_at >= date_from)
          AND (date_to IS NULL OR po.created_at <= date_to)),
      ROUND(100.0 * (SELECT COUNT(*) FROM onboarding_informed_dissent_forms f
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

-- RPC 6: Daily submissions activity for operational chart
CREATE OR REPLACE FUNCTION get_daily_submissions_activity(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL
)
RETURNS TABLE(
  submission_date date,
  medical_updates bigint,
  psychological_updates bigint,
  sows_assessments bigint,
  oows_assessments bigint,
  total bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      COALESCE(date_from, (CURRENT_DATE - INTERVAL '90 days')::date),
      COALESCE(date_to, CURRENT_DATE),
      '1 day'::interval
    )::date AS d
  )
  SELECT
    dates.d,
    COUNT(DISTINCT mu.id)::bigint AS medical_updates,
    COUNT(DISTINCT pu.id)::bigint AS psychological_updates,
    COUNT(DISTINCT sw.id)::bigint AS sows_assessments,
    COUNT(DISTINCT ow.id)::bigint AS oows_assessments,
    (COUNT(DISTINCT mu.id) + COUNT(DISTINCT pu.id) +
     COUNT(DISTINCT sw.id) + COUNT(DISTINCT ow.id))::bigint AS total
  FROM dates
  LEFT JOIN patient_management_daily_medical_updates mu
    ON mu.form_date::date = dates.d
  LEFT JOIN patient_management_daily_psychological_updates pu
    ON pu.form_date::date = dates.d
  LEFT JOIN patient_management_daily_sows sw
    ON sw.form_date::date = dates.d
  LEFT JOIN patient_management_daily_oows ow
    ON ow.form_date::date = dates.d
  GROUP BY dates.d
  ORDER BY dates.d;
END;
$$;

-- RPC 7: Withdrawal KPIs summary
CREATE OR REPLACE FUNCTION get_withdrawal_kpis(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  program_types text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_peak_sows numeric;
  avg_peak_oows numeric;
  severe_pct numeric;
  avg_days_resolution numeric;
BEGIN
  SELECT ROUND(AVG(peak), 1) INTO avg_peak_sows
  FROM (
    SELECT d.management_id, MAX(d.total_score) AS peak
    FROM patient_management_daily_sows d
    JOIN patient_management pm ON pm.id = d.management_id
    WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
      AND (program_types IS NULL OR cardinality(program_types) = 0
          OR pm.program_type = ANY(program_types))
    GROUP BY d.management_id
  ) peaks;

  SELECT ROUND(AVG(peak), 1) INTO avg_peak_oows
  FROM (
    SELECT d.management_id, MAX(d.total_score) AS peak
    FROM patient_management_daily_oows d
    JOIN patient_management pm ON pm.id = d.management_id
    WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
      AND (program_types IS NULL OR cardinality(program_types) = 0
          OR pm.program_type = ANY(program_types))
    GROUP BY d.management_id
  ) peaks;

  SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE peak > 36) / NULLIF(COUNT(*), 0), 1)
  INTO severe_pct
  FROM (
    SELECT d.management_id, MAX(d.total_score) AS peak
    FROM patient_management_daily_sows d
    JOIN patient_management pm ON pm.id = d.management_id
    WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
    GROUP BY d.management_id
  ) peaks;

  SELECT ROUND(AVG(first_below_10_day), 1) INTO avg_days_resolution
  FROM (
    SELECT
      d.management_id,
      MIN((d.form_date::date - pm.arrival_date::date + 1)) AS first_below_10_day
    FROM patient_management_daily_sows d
    JOIN patient_management pm ON pm.id = d.management_id
    WHERE d.total_score < 10
      AND (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
    GROUP BY d.management_id
  ) resolution;

  RETURN jsonb_build_object(
    'avgPeakSows', COALESCE(avg_peak_sows, 0),
    'avgPeakOows', COALESCE(avg_peak_oows, 0),
    'severePct', COALESCE(severe_pct, 0),
    'avgDaysToResolution', COALESCE(avg_days_resolution, 0)
  );
END;
$$;

-- RPC 8: Dosing KPIs summary
CREATE OR REPLACE FUNCTION get_dosing_kpis(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  program_types text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_dosing_days numeric;
  most_common_frequency text;
  patients_receiving bigint;
BEGIN
  SELECT ROUND(AVG(dosing_days), 1) INTO avg_dosing_days
  FROM (
    SELECT d.management_id, COUNT(*) AS dosing_days
    FROM patient_management_daily_medical_updates d
    JOIN patient_management pm ON pm.id = d.management_id
    WHERE d.ibogaine_given = 'yes'
      AND (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
      AND (program_types IS NULL OR cardinality(program_types) = 0
          OR pm.program_type = ANY(program_types))
    GROUP BY d.management_id
  ) days;

  SELECT COUNT(DISTINCT d.management_id) INTO patients_receiving
  FROM patient_management_daily_medical_updates d
  JOIN patient_management pm ON pm.id = d.management_id
  WHERE d.ibogaine_given = 'yes'
    AND (date_from IS NULL OR pm.arrival_date >= date_from)
    AND (date_to IS NULL OR pm.arrival_date <= date_to)
    AND (program_types IS NULL OR cardinality(program_types) = 0
        OR pm.program_type = ANY(program_types));

  SELECT d.ibogaine_frequency INTO most_common_frequency
  FROM patient_management_daily_medical_updates d
  JOIN patient_management pm ON pm.id = d.management_id
  WHERE d.ibogaine_given = 'yes'
    AND d.ibogaine_frequency IS NOT NULL
    AND (date_from IS NULL OR pm.arrival_date >= date_from)
    AND (date_to IS NULL OR pm.arrival_date <= date_to)
  GROUP BY d.ibogaine_frequency
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'avgDosingDays', COALESCE(avg_dosing_days, 0),
    'patientsReceiving', patients_receiving,
    'mostCommonFrequency', COALESCE(most_common_frequency, 'N/A')
  );
END;
$$;

COMMENT ON FUNCTION get_admissions_by_month IS 'Research: monthly admissions by program type for area chart';
COMMENT ON FUNCTION get_parkinsons_cohort IS 'Research: full neurological cohort with MDS-UPDRS and psych data';
COMMENT ON FUNCTION get_dosing_analysis IS 'Research: daily ibogaine dosing with vitals for treatment tab';
COMMENT ON FUNCTION get_withdrawal_by_substance IS 'Research: SOWS/OOWS peaks grouped by substance category';
COMMENT ON FUNCTION get_form_completion_rates IS 'Research: form completion % across onboarding form types';
COMMENT ON FUNCTION get_daily_submissions_activity IS 'Research: daily form submission counts for operational chart';
COMMENT ON FUNCTION get_withdrawal_kpis IS 'Research: aggregate withdrawal KPI metrics';
COMMENT ON FUNCTION get_dosing_kpis IS 'Research: aggregate dosing KPI metrics';
