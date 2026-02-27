-- Only show day of stay from Day 1 onward (exclude forms dated before arrival_date).
-- Day = (form_date - arrival_date + 1); we require form_date >= arrival_date so Day >= 1.

-- 1. Withdrawal trajectory: exclude pre-arrival forms
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
      AND d.form_date::date >= pm.arrival_date::date
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
      AND d.form_date::date >= pm.arrival_date::date
    GROUP BY 1
    ORDER BY 1;
  END IF;
END;
$$;

-- 2. Symptom heatmap: exclude pre-arrival forms (same return type as 20260224000001)
CREATE OR REPLACE FUNCTION get_symptom_heatmap_data(
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  assessment_type text DEFAULT 'sows'
)
RETURNS TABLE(day_of_stay int, symptom_index int, avg_value numeric, patient_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF assessment_type = 'oows' THEN
    RETURN QUERY
    SELECT
      (d.form_date::date - pm.arrival_date::date + 1)::int,
      gs.n,
      AVG(
        CASE gs.n
          WHEN 1 THEN d.symptom_1_yawning
          WHEN 2 THEN d.symptom_2_rhinorrhoea
          WHEN 3 THEN d.symptom_3_piloerection
          WHEN 4 THEN d.symptom_4_perspiration
          WHEN 5 THEN d.symptom_5_lacrimation
          WHEN 6 THEN d.symptom_6_tremor
          WHEN 7 THEN d.symptom_7_mydriasis
          WHEN 8 THEN d.symptom_8_hot_cold_flushes
          WHEN 9 THEN d.symptom_9_restlessness
          WHEN 10 THEN d.symptom_10_vomiting
          WHEN 11 THEN d.symptom_11_muscle_twitches
          WHEN 12 THEN d.symptom_12_abdominal_cramps
          WHEN 13 THEN d.symptom_13_anxiety
          ELSE NULL
        END
      )::numeric,
      COUNT(DISTINCT d.management_id)::bigint
    FROM patient_management_daily_oows d
    JOIN patient_management pm ON pm.id = d.management_id
    CROSS JOIN generate_series(1, 13) AS gs(n)
    WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
      AND d.form_date::date >= pm.arrival_date::date
    GROUP BY 1, 2
    ORDER BY 1, 2;
  ELSE
    RETURN QUERY
    SELECT
      (d.form_date::date - pm.arrival_date::date + 1)::int,
      gs.n,
      AVG(
        CASE gs.n
          WHEN 1 THEN d.symptom_1_anxious
          WHEN 2 THEN d.symptom_2_yawning
          WHEN 3 THEN d.symptom_3_perspiring
          WHEN 4 THEN d.symptom_4_eyes_tearing
          WHEN 5 THEN d.symptom_5_nose_running
          WHEN 6 THEN d.symptom_6_goosebumps
          WHEN 7 THEN d.symptom_7_shaking
          WHEN 8 THEN d.symptom_8_hot_flushes
          WHEN 9 THEN d.symptom_9_cold_flushes
          WHEN 10 THEN d.symptom_10_bones_muscles_ache
          WHEN 11 THEN d.symptom_11_restless
          WHEN 12 THEN d.symptom_12_nauseous
          WHEN 13 THEN d.symptom_13_vomiting
          WHEN 14 THEN d.symptom_14_muscles_twitch
          WHEN 15 THEN d.symptom_15_stomach_cramps
          WHEN 16 THEN d.symptom_16_feel_like_using_now
          ELSE NULL
        END
      )::numeric,
      COUNT(DISTINCT d.management_id)::bigint
    FROM patient_management_daily_sows d
    JOIN patient_management pm ON pm.id = d.management_id
    CROSS JOIN generate_series(1, 16) AS gs(n)
    WHERE (date_from IS NULL OR pm.arrival_date >= date_from)
      AND (date_to IS NULL OR pm.arrival_date <= date_to)
      AND d.form_date::date >= pm.arrival_date::date
    GROUP BY 1, 2
    ORDER BY 1, 2;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_withdrawal_trajectory IS 'Research: avg withdrawal score by day of stay (Day 1+ only)';
COMMENT ON FUNCTION get_symptom_heatmap_data IS 'Research: symptom heatmap by day and symptom index (Day 1+ only)';
