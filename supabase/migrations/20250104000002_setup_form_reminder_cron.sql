CREATE OR REPLACE FUNCTION public.send_form_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url TEXT;
  request_id BIGINT;
BEGIN
  api_url := 'https://portal.theibogainstitute.org/api/cron/send-form-reminders';
  
  SELECT net.http_get(
    url := api_url,
    headers := jsonb_build_object('Content-Type', 'application/json')
  ) INTO request_id;
  
  RAISE NOTICE 'Form reminder cron job initiated. Request ID: %', request_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in form reminder cron job: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_form_reminders() TO postgres;
GRANT EXECUTE ON FUNCTION public.send_form_reminders() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('send-form-reminders-48h')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-form-reminders-48h'
  );
END $$;

SELECT cron.schedule(
  'send-form-reminders-48h',
  '0 */12 * * *',
  $$
  SELECT public.send_form_reminders();
  $$
);

