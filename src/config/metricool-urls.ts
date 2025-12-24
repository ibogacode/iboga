/**
 * Metricool API Endpoints Configuration
 * 
 * Replace these endpoint paths with your actual Metricool API endpoints
 * These are the paths that come after https://app.metricool.com/api
 * 
 * Example: If your full URL is https://app.metricool.com/api/facebook/metrics
 *          Then the endpoint should be '/facebook/metrics'
 */

export const METRICOOL_ENDPOINTS = {
  // Facebook metrics endpoint path
  // Full URL: https://app.metricool.com/api/v2/analytics/posts/facebook
  // Example: https://app.metricool.com/api/v2/analytics/posts/facebook?from=2025-10-06T00:00:00&to=2025-11-04T23:59:59&timezone=America/Indianapolis&userId=3950725&blogId=5231058
  facebook: process.env.NEXT_PUBLIC_METRICOOL_FB_ENDPOINT || '/v2/analytics/posts/facebook',
  
  // Instagram metrics endpoint path
  instagram: process.env.NEXT_PUBLIC_METRICOOL_IG_ENDPOINT || '',
  
  // YouTube metrics endpoint path
  youtube: process.env.NEXT_PUBLIC_METRICOOL_YT_ENDPOINT || '',
  
  // Web analytics endpoint path
  web: process.env.NEXT_PUBLIC_METRICOOL_WEB_ENDPOINT || '',
}

/**
 * Facebook-specific Metricool API endpoints
 * These are used for the dedicated Facebook analytics page
 */
export const FACEBOOK_METRICOOL_ENDPOINTS = {
  // Followers timeline data
  // Full URL: https://app.metricool.com/api/v2/analytics/timelines?metric=pageFollows&network=facebook&subject=account
  followers: '/v2/analytics/timelines',
  
  // Views timeline data
  // Full URL: https://app.metricool.com/api/v2/analytics/timelines?metric=page_media_view&network=facebook&subject=account
  views: '/v2/analytics/timelines',
  
  // Likes timeline data
  // Full URL: https://app.metricool.com/api/v2/analytics/timelines?metric=likes&network=facebook&subject=account
  likes: '/v2/analytics/timelines',
  
  // Posts count timeline data
  // Full URL: https://app.metricool.com/api/v2/analytics/timelines?metric=postsCount&network=facebook&subject=account
  posts: '/v2/analytics/timelines',
}

/**
 * You can also define endpoints for specific metrics/graphs
 * Add more endpoints as needed for different metric types
 * 
 * Example:
 * export const METRICOOL_METRIC_ENDPOINTS = {
 *   followers: '/facebook/followers',
 *   engagement: '/instagram/engagement',
 *   sessions: '/web/sessions',
 *   // Add your specific metric endpoints here
 * }
 */

