-- Research module: Postgres RPCs for analytics.
-- Call these from the app via supabase.rpc('function_name', { ... }).
-- Adjust to your exact schema (column names, table names) as needed.

-- 1. Overview stats (single call for all KPIs)
CREATE OR REPLACE FUNCTION get_overview_stats(
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL,
  program_types text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_patients bigint;
  active_patients bigint;
  avg_stay_days numeric;
  completion_rate numeric;
  medical_clearance_rate numeric;
BEGIN
  SELECT COUNT(*) INTO total_patients
  FROM patient_management pm
  WHERE (date_from IS NULL OR pm.arrival_date::date >= date_from::date)
    AND (date_to IS NULL OR pm.arrival_date::date <= date_to::date)
    AND (program_types IS NULL OR cardinality(program_types) = 0 OR pm.program_type = ANY(program_types));

  SELECT COUNT(*) INTO active_patients
  FROM patient_management pm
  WHERE pm.status = 'active'
    AND (date_from IS NULL OR pm.arrival_date::date >= date_from::date)
    AND (date_to IS NULL OR pm.arrival_date::date <= date_to::date)
    AND (program_types IS NULL OR cardinality(program_types) = 0 OR pm.program_type = ANY(program_types));

  SELECT COALESCE(AVG((pm.actual_departure_date::date - pm.arrival_date::date)), 0) INTO avg_stay_days
  FROM patient_management pm
  WHERE pm.actual_departure_date IS NOT NULL
    AND (date_from IS NULL OR pm.arrival_date::date >= date_from::date)
    AND (date_to IS NULL OR pm.arrival_date::date <= date_to::date)
    AND (program_types IS NULL OR cardinality(program_types) = 0 OR pm.program_type = ANY(program_types));

  completion_rate := CASE WHEN total_patients > 0
    THEN 100.0 * (SELECT COUNT(*) FROM patient_management pm
                  WHERE pm.status IN ('discharged', 'transferred')
                    AND (date_from IS NULL OR pm.arrival_date::date >= date_from::date)
                    AND (date_to IS NULL OR pm.arrival_date::date <= date_to::date)
                    AND (program_types IS NULL OR cardinality(program_types) = 0 OR pm.program_type = ANY(program_types))) / total_patients
    ELSE 0 END;

  SELECT CASE WHEN COUNT(*) > 0
    THEN 100.0 * COUNT(*) FILTER (WHERE medical_clearance = true) / COUNT(*)
    ELSE 0 END INTO medical_clearance_rate
  FROM patient_onboarding po
  WHERE (date_from IS NULL OR po.created_at >= date_from)
    AND (date_to IS NULL OR po.created_at <= date_to);

  RETURN jsonb_build_object(
    'totalPatients', total_patients,
    'activePatients', active_patients,
    'avgLengthOfStay', ROUND(avg_stay_days),
    'completionRate', ROUND(completion_rate),
    'medicalClearanceRate', ROUND(medical_clearance_rate)
  );
END;
$$;

-- 2. Withdrawal trajectory: avg SOWS/OOWS by day_of_stay
CREATE OR REPLACE FUNCTION get_withdrawal_trajectory(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  program_types text[] DEFAULT NULL,
  assessment_type text DEFAULT 'sows'
)
RETURNS TABLE(day_of_stay int, avg_score numeric, patient_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF assessment_type = 'oows' THEN
    RETURN QUERY
    SELECT
      (d.form_date::date - pm.arrival_date::date + 1)::int AS day_of_stay,
      AVG(COALESCE(d.total_score, 0))::numeric AS avg_score,
      COUNT(*)::bigint
    FROM patient_management_daily_oows d
    JOIN patient_management pm ON pm.id = d.management_id
    WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
      AND (program_types IS NULL OR cardinality(program_types) = 0 OR pm.program_type = ANY(program_types))
    GROUP BY 1
    ORDER BY 1;
  ELSE
    RETURN QUERY
    SELECT
      (d.form_date::date - pm.arrival_date::date + 1)::int AS day_of_stay,
      AVG(COALESCE(d.total_score, 0))::numeric AS avg_score,
      COUNT(*)::bigint
    FROM patient_management_daily_sows d
    JOIN patient_management pm ON pm.id = d.management_id
    WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
      AND (program_types IS NULL OR cardinality(program_types) = 0 OR pm.program_type = ANY(program_types))
    GROUP BY 1
    ORDER BY 1;
  END IF;
END;
$$;

-- 3. Symptom heatmap: avg per symptom per day (sows)
CREATE OR REPLACE FUNCTION get_symptom_heatmap_data(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  assessment_type text DEFAULT 'sows'
)
RETURNS TABLE(day_of_stay int, symptom_index int, avg_value numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (d.form_date::date - pm.arrival_date::date + 1)::int,
    gs.n,
    AVG(
      CASE gs.n
        WHEN 1 THEN d.symptom_1_anxious WHEN 2 THEN d.symptom_2_yawning WHEN 3 THEN d.symptom_3_perspiring WHEN 4 THEN d.symptom_4_eyes_tearing
        WHEN 5 THEN d.symptom_5_nose_running WHEN 6 THEN d.symptom_6_goosebumps WHEN 7 THEN d.symptom_7_shaking WHEN 8 THEN d.symptom_8_hot_flushes
        WHEN 9 THEN d.symptom_9_cold_flushes WHEN 10 THEN d.symptom_10_bones_muscles_ache WHEN 11 THEN d.symptom_11_restless WHEN 12 THEN d.symptom_12_nauseous
        WHEN 13 THEN d.symptom_13_vomiting WHEN 14 THEN d.symptom_14_muscles_twitch WHEN 15 THEN d.symptom_15_stomach_cramps WHEN 16 THEN d.symptom_16_feel_like_using_now
        ELSE NULL
      END
    )::numeric
  FROM patient_management_daily_sows d
  JOIN patient_management pm ON pm.id = d.management_id
  CROSS JOIN generate_series(1, 16) AS gs(n)
  WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
    AND (date_to IS NULL OR pm.arrival_date <= date_to)
  GROUP BY 1, 2
  ORDER BY 1, 2;
END;
$$;

-- 4. Capacity heatmap for operational tab (year)
CREATE OR REPLACE FUNCTION get_capacity_heatmap(p_year int DEFAULT NULL)
RETURNS TABLE(treatment_date date, slots_used bigint, capacity_max int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.treatment_date::date,
    COALESCE(COUNT(DISTINCT po.id), 0)::bigint AS slots_used,
    COALESCE(ts.capacity_max, 5)::int
  FROM treatment_schedule ts
  LEFT JOIN patient_onboarding po ON po.treatment_date = ts.treatment_date AND po.status = 'moved_to_management'
  WHERE (p_year IS NULL OR EXTRACT(YEAR FROM ts.treatment_date) = p_year)
  GROUP BY ts.treatment_date, ts.capacity_max
  ORDER BY 1;
END;
$$;

-- 5. Operational funnel counts
CREATE OR REPLACE FUNCTION get_operational_funnel(
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intake_count bigint;
  onboarding_count bigint;
  payment_count bigint;
  clearance_count bigint;
  treatment_date_count bigint;
  moved_count bigint;
BEGIN
  SELECT COUNT(*) INTO intake_count FROM patient_intake_forms p
  WHERE (date_from IS NULL OR p.created_at >= date_from) AND (date_to IS NULL OR p.created_at <= date_to);

  SELECT COUNT(*) INTO onboarding_count FROM patient_onboarding p
  WHERE (date_from IS NULL OR p.created_at >= date_from) AND (date_to IS NULL OR p.created_at <= date_to);

  SELECT COUNT(*) INTO payment_count FROM patient_onboarding p
  WHERE p.payment_received = true AND (date_from IS NULL OR p.created_at >= date_from) AND (date_to IS NULL OR p.created_at <= date_to);

  SELECT COUNT(*) INTO clearance_count FROM patient_onboarding p
  WHERE p.medical_clearance = true AND (date_from IS NULL OR p.created_at >= date_from) AND (date_to IS NULL OR p.created_at <= date_to);

  SELECT COUNT(*) INTO treatment_date_count FROM patient_onboarding p
  WHERE p.treatment_date IS NOT NULL AND (date_from IS NULL OR p.created_at >= date_from) AND (date_to IS NULL OR p.created_at <= date_to);

  SELECT COUNT(*) INTO moved_count FROM patient_onboarding p
  WHERE p.status = 'moved_to_management' AND (date_from IS NULL OR p.created_at >= date_from) AND (date_to IS NULL OR p.created_at <= date_to);

  RETURN jsonb_build_object(
    'intakeFormSubmitted', intake_count,
    'onboardingCreated', onboarding_count,
    'paymentReceived', payment_count,
    'medicalClearance', clearance_count,
    'treatmentDateAssigned', treatment_date_count,
    'movedToManagement', moved_count
  );
END;
$$;

COMMENT ON FUNCTION get_overview_stats IS 'Research: overview KPIs for date range and program filter';
COMMENT ON FUNCTION get_withdrawal_trajectory IS 'Research: avg SOWS/OOWS by day of stay';
COMMENT ON FUNCTION get_symptom_heatmap_data IS 'Research: symptom heatmap by day and symptom index';
COMMENT ON FUNCTION get_capacity_heatmap IS 'Research: treatment slot utilization by date';
COMMENT ON FUNCTION get_operational_funnel IS 'Research: onboarding funnel stage counts';
