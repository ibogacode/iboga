-- Phase 0: Bug fixes for Research RPCs
-- Drop functions first because we are changing their return types (Postgres does not allow CREATE OR REPLACE when return type changes).

DROP FUNCTION IF EXISTS get_symptom_heatmap_data(date, date, text);

-- BUG 1: Symptom heatmap RPC — support assessment_type and add patient_count
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
    GROUP BY 1, 2
    ORDER BY 1, 2;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS get_capacity_heatmap(int);

-- BUG 2: Capacity heatmap — use capacity_used from treatment_schedule
CREATE OR REPLACE FUNCTION get_capacity_heatmap(p_year int DEFAULT NULL)
RETURNS TABLE(
  treatment_date date,
  slots_used int,
  capacity_max int,
  utilization_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.treatment_date::date,
    ts.capacity_used::int,
    ts.capacity_max::int,
    CASE WHEN ts.capacity_max > 0
      THEN ROUND((ts.capacity_used::numeric / ts.capacity_max::numeric) * 100, 1)
      ELSE 0
    END AS utilization_pct
  FROM treatment_schedule ts
  WHERE (p_year IS NULL OR EXTRACT(YEAR FROM ts.treatment_date) = p_year)
  ORDER BY ts.treatment_date;
END;
$$;

COMMENT ON FUNCTION get_symptom_heatmap_data IS 'Research: symptom heatmap by day and symptom index (SOWS or OOWS)';
COMMENT ON FUNCTION get_capacity_heatmap IS 'Research: treatment slot utilization by date using capacity_used';
