# Metricool API Integration Setup

This document explains how to configure the Metricool API integration for the marketing dashboard.

## Configuration

### 1. Set API Token in Supabase

Add the following environment variable to your Supabase project:

1. **METRICOOL_API_TOKEN** - Your Metricool API token
   - Get this from your Metricool account settings → API section
   - Required for all API calls
   - Set in Supabase Dashboard → Settings → Edge Functions → Secrets

### 2. Configure API Endpoints

The Metricool API uses endpoints (paths) that come after `https://app.metricool.com/api`.

**Option A: In Code (Recommended)**
Edit `src/config/metricool-urls.ts` and add your Metricool API endpoint paths:

```typescript
export const METRICOOL_ENDPOINTS = {
  facebook: '/facebook/metrics',  // Full URL: https://app.metricool.com/api/facebook/metrics
  instagram: '/instagram/metrics',
  youtube: '/youtube/metrics',
  web: '/web/metrics',
}
```

**Option B: Via Environment Variables**
Set these in your `.env.local` file:
- `NEXT_PUBLIC_METRICOOL_FB_ENDPOINT`
- `NEXT_PUBLIC_METRICOOL_IG_ENDPOINT`
- `NEXT_PUBLIC_METRICOOL_YT_ENDPOINT`
- `NEXT_PUBLIC_METRICOOL_WEB_ENDPOINT`

**Option C: Pass Endpoints Dynamically**
You can also pass endpoints directly to the `MetricoolDataProvider`:

```tsx
<MetricoolDataProvider
  endpoints={{
    facebook: '/facebook/metrics',
    instagram: '/instagram/metrics',
    youtube: '/youtube/metrics',
    web: '/web/metrics',
  }}
  from="2024-01-01"
  to="2024-12-31"
>
  {/* Your marketing dashboard */}
</MetricoolDataProvider>
```

### 3. Optional: User ID and Blog ID

These can be set in Supabase secrets or passed per request:
- **METRICOOL_USER_ID** - Your Metricool user ID (defaults to '3950725' if not set)
- **METRICOOL_BLOG_ID** - Your Metricool blog/account ID (defaults to '5077788' if not set)

You can also pass these as props to `MetricoolDataProvider`:

```tsx
<MetricoolDataProvider
  endpoints={...}
  userId="your-user-id"
  blogId="your-blog-id"
  from="2024-01-01"
  to="2024-12-31"
>
```

## Setting Up in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add the following secrets:
   ```
   METRICOOL_API_TOKEN=your_api_token_here
   METRICOOL_USER_ID=your_user_id_here (optional, defaults to 3950725)
   METRICOOL_BLOG_ID=your_blog_id_here (optional, defaults to 5077788)
   ```

## API Endpoint Structure

The Metricool API base URL is: `https://app.metricool.com/api`

Each endpoint should be the **path** that comes after `/api`. For example:

- If your full URL is: `https://app.metricool.com/api/facebook/metrics`
- Then the endpoint should be: `/facebook/metrics`

**Important:** 
- Provide only the **path** (starting with `/`), not the full URL
- The base URL (`https://app.metricool.com/api`) is automatically prepended by the edge function
- Endpoints can be different for different metrics or graphs - just update them in `src/config/metricool-urls.ts` or pass them dynamically
- The edge function automatically adds `userId`, `blogId`, `timezone` (America/Indianapolis), and date range (`from`/`to`) as query parameters
- The API uses `X-Mc-Auth` header for authentication (not `Authorization: Bearer`)

## Expected API Response Format

The integration expects Metricool API responses to include:

### Social Media Platforms (Facebook, Instagram, YouTube)
```json
{
  "followers": 82400,
  "fans": 82400,
  "total_followers": 82400,
  "engagement_rate": 4.7,
  "avg_engagement_rate": 4.7,
  "followers_change": "12%",
  "posts_this_week": 24,
  "videos_this_week": 0
}
```

### Web Analytics
```json
{
  "sessions": 18200,
  "visits": 18200,
  "total_sessions": 18200,
  "sessions_change": "12%",
  "articles": 112,
  "posts": 112,
  "total_posts": 112,
  "seo_score": 38,
  "authority": 38,
  "domain_authority": 38
}
```

**Important:** You'll need to adjust the data extraction logic in `src/lib/utils/metricool.ts` to match your actual Metricool API response structure.

## Testing

1. Deploy the edge function:
   ```bash
   supabase functions deploy fetch-metricool
   ```

2. Test the integration by visiting the marketing dashboard
3. Check browser console and Supabase logs for any API errors
4. Adjust endpoint paths and data extraction logic as needed

## Troubleshooting

- **401 Unauthorized**: Check that your `METRICOOL_API_TOKEN` is correct and set in Supabase secrets
- **404 Not Found**: Verify the API endpoint paths match your Metricool API documentation
- **Invalid response**: Check that the API response structure matches what's expected in `metricool.ts`
- Check Supabase Edge Function logs for detailed error messages

## Next Steps

1. Review your Metricool API documentation
2. Update endpoint paths in `src/config/metricool-urls.ts` with your actual Metricool endpoints
3. Adjust data extraction in `src/lib/utils/metricool.ts` to match your API response format
4. Test with real data and refine the formatting functions
