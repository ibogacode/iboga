/**
 * Metricool API Endpoints Configuration
 * 
 * Replace these endpoint paths with your actual Metricool API endpoints
 * These are the paths that come after https://app.metricool.com/api
 */

export const METRICOOL_ENDPOINTS = {
  // YouTube metrics endpoint path
  youtube: process.env.NEXT_PUBLIC_METRICOOL_YT_ENDPOINT || '',
  
  // Web analytics endpoint path
  web: process.env.NEXT_PUBLIC_METRICOOL_WEB_ENDPOINT || '',
}

/**
 * Facebook-specific Metricool API endpoints
 */
export const FACEBOOK_METRICOOL_ENDPOINTS = {
  // Facebook posts endpoint
  posts: '/v2/analytics/posts/facebook',
  // Facebook reels endpoint
  reels: '/v2/analytics/reels/facebook',
  // Facebook followers timeline endpoint
  followersTimeline: '/v2/analytics/timelines',
}

/**
 * Instagram-specific Metricool API endpoints
 */
export const INSTAGRAM_METRICOOL_ENDPOINTS = {
  // Instagram posts endpoint
  posts: '/v2/analytics/posts/instagram',
  // Instagram reels endpoint
  reels: '/v2/analytics/reels/instagram',
  // Instagram followers timeline endpoint
  followersTimeline: '/v2/analytics/timelines',
}

/**
 * YouTube-specific Metricool API endpoints
 */
export const YOUTUBE_METRICOOL_ENDPOINTS = {
  // YouTube videos endpoint
  videos: '/v2/analytics/posts/youtube',
  // YouTube subscribers timeline endpoint
  subscribersTimeline: '/stats/timeline/yttotalSubscribers',
}

/**
 * Web-specific Metricool API endpoints
 */
export const WEB_METRICOOL_ENDPOINTS = {
  // Web posts/articles endpoint
  posts: '/stats/posts',
  // Web visitors timeline endpoint
  visitorsTimeline: '/stats/timeline/Visitors',
  // Web page views timeline endpoint
  pageViewsTimeline: '/stats/timeline/PageViews',
}

/**
 * You can also define endpoints for specific metrics/graphs
 * Add more endpoints as needed for different metric types
 */

