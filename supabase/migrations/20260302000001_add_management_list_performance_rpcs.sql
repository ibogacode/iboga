-- =============================================================================
-- Performance: Replace 16 client-side queries with 2 DB-side RPCs
-- =============================================================================
-- getPatientManagementList was running 16 separate Supabase queries (8 tables ×
-- 2 helper functions) and fetching up to 5 000 rows each time just to compute
-- which management IDs have form activity and what their earliest form date is.
-- These two SECURITY DEFINER functions do the same work inside the database and
-- return only the aggregated result, reducing round-trips from 16 to 2.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Distinct management IDs that have at least one form record
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_management_ids_with_forms()
RETURNS TABLE (management_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT management_id FROM patient_management_intake_reports             WHERE management_id IS NOT NULL
  UNION
  SELECT management_id FROM patient_management_medical_intake_reports     WHERE management_id IS NOT NULL
  UNION
  SELECT management_id FROM patient_management_parkinsons_psychological_reports WHERE management_id IS NOT NULL
  UNION
  SELECT management_id FROM patient_management_parkinsons_mortality_scales WHERE management_id IS NOT NULL
  UNION
  SELECT management_id FROM patient_management_daily_psychological_updates WHERE management_id IS NOT NULL
  UNION
  SELECT management_id FROM patient_management_daily_medical_updates      WHERE management_id IS NOT NULL
  UNION
  SELECT management_id FROM patient_management_daily_sows                 WHERE management_id IS NOT NULL
  UNION
  SELECT management_id FROM patient_management_daily_oows                 WHERE management_id IS NOT NULL
$$;

-- -----------------------------------------------------------------------------
-- 2. Earliest form date (YYYY-MM-DD) per management ID across all 8 tables
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_earliest_form_dates()
RETURNS TABLE (management_id UUID, earliest_date TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT management_id, MIN(form_date)
  FROM (
    SELECT management_id,
           (COALESCE(completed_at, filled_at))::DATE::TEXT AS form_date
    FROM   patient_management_intake_reports
    WHERE  management_id IS NOT NULL
      AND  COALESCE(completed_at, filled_at) IS NOT NULL

    UNION ALL

    SELECT management_id,
           (COALESCE(completed_at, submitted_at))::DATE::TEXT AS form_date
    FROM   patient_management_medical_intake_reports
    WHERE  management_id IS NOT NULL
      AND  COALESCE(completed_at, submitted_at) IS NOT NULL

    UNION ALL

    SELECT management_id,
           (COALESCE(completed_at, filled_at))::DATE::TEXT AS form_date
    FROM   patient_management_parkinsons_psychological_reports
    WHERE  management_id IS NOT NULL
      AND  COALESCE(completed_at, filled_at) IS NOT NULL

    UNION ALL

    SELECT management_id,
           (COALESCE(completed_at, filled_at))::DATE::TEXT AS form_date
    FROM   patient_management_parkinsons_mortality_scales
    WHERE  management_id IS NOT NULL
      AND  COALESCE(completed_at, filled_at) IS NOT NULL

    UNION ALL

    SELECT management_id,
           form_date::TEXT AS form_date
    FROM   patient_management_daily_psychological_updates
    WHERE  management_id IS NOT NULL AND form_date IS NOT NULL

    UNION ALL

    SELECT management_id,
           form_date::TEXT AS form_date
    FROM   patient_management_daily_medical_updates
    WHERE  management_id IS NOT NULL AND form_date IS NOT NULL

    UNION ALL

    SELECT management_id,
           form_date::TEXT AS form_date
    FROM   patient_management_daily_sows
    WHERE  management_id IS NOT NULL AND form_date IS NOT NULL

    UNION ALL

    SELECT management_id,
           form_date::TEXT AS form_date
    FROM   patient_management_daily_oows
    WHERE  management_id IS NOT NULL AND form_date IS NOT NULL
  ) all_dates
  GROUP BY management_id
$$;

-- Allow authenticated users (staff) to call these functions
GRANT EXECUTE ON FUNCTION public.get_management_ids_with_forms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_earliest_form_dates()        TO authenticated;
