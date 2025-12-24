# How to View Supabase Edge Function Logs

If you're not seeing logs from the `fetch-metricool` edge function, follow these steps:

## 1. Check Supabase Dashboard Logs

### Method 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click on **`fetch-metricool`** function
4. Click on the **Logs** tab
5. You should see real-time logs from the function

### Method 2: Via Supabase CLI
```bash
# View logs in real-time
supabase functions logs fetch-metricool --follow

# View recent logs
supabase functions logs fetch-metricool
```

## 2. Verify Function is Deployed

Make sure the function is actually deployed:

```bash
# List all deployed functions
supabase functions list

# If fetch-metricool is not listed, deploy it:
supabase functions deploy fetch-metricool
```

## 3. Check Function Invocation

The function should log when it's called. Look for:
- `=== fetch-metricool Edge Function Invoked ===`
- `Method: POST`
- `Request body received:`

If you don't see these logs, the function might not be getting called.

## 4. Check Browser Console

The server action (`src/actions/metricool.action.ts`) also logs to the browser console:
- `[fetchMetricoolMetrics] Calling edge function:`
- `[fetchMetricoolMetrics] Request body:`
- `[fetchMetricoolMetrics] Edge function response:`

Open your browser's developer console (F12) and check the Console tab when visiting the marketing dashboard.

## 5. Common Issues

### Issue: Function not being called
**Solution**: Check browser console for errors. Verify:
- `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- The marketing page is actually making the API call

### Issue: Function called but no logs
**Solution**: 
- Check if the function is deployed to the correct project
- Verify you're looking at the right Supabase project
- Check if logs are filtered (some dashboards have log level filters)

### Issue: Function errors before logging
**Solution**: The function now logs at the very start, so you should see at least the invocation log even if it errors.

## 6. Test Function Directly

You can test the function directly using curl:

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/fetch-metricool' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "endpoint": "/v2/analytics/posts/facebook",
    "from": "2024-11-01T00:00:00",
    "to": "2024-12-01T23:59:59"
  }'
```

Replace:
- `YOUR_PROJECT` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key

## 7. Enable Detailed Logging

The function now includes detailed logging at every step:
- Function invocation
- Request parsing
- API token check
- URL building
- API call
- Response handling
- Error handling

All logs use `console.log()` or `console.error()` which should appear in Supabase Edge Function logs.

## 8. Check Log Retention

Supabase logs are retained for a limited time (usually 7-30 days depending on your plan). If you're looking for old logs, they might have been rotated out.

## Still Not Seeing Logs?

1. **Verify deployment**: Run `supabase functions list` to confirm the function is deployed
2. **Check project**: Make sure you're looking at the correct Supabase project
3. **Check environment**: Verify you're testing against the correct environment (local vs production)
4. **Contact support**: If logs still don't appear, there might be an issue with your Supabase project configuration

