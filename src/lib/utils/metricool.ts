/**
 * Utility functions to format and extract data from Metricool API responses
 * Based on actual Metricool API response structure
 */

export interface FormattedMetrics {
  totalFollowers: string
  engagementRate: string
  websiteSessions: string
  articlesPublished: string
  seoAuthority: string
  followersChange: string
  engagementChange: string
  sessionsChange: string
  platforms: Array<{
    name: string
    followers: string
    change: string
    posts: string
  }>
}

/**
 * Extract metrics from Facebook posts array
 */
function extractFacebookMetrics(facebookData: any) {
  if (!facebookData?.data || !Array.isArray(facebookData.data)) {
    return {
      totalReactions: 0,
      totalComments: 0,
      totalShares: 0,
      totalImpressions: 0,
      totalUniqueImpressions: 0,
      totalClicks: 0,
      avgEngagement: 0,
      postsCount: 0,
      postsThisWeek: 0,
    }
  }

  const posts = facebookData.data
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  let totalReactions = 0
  let totalComments = 0
  let totalShares = 0
  let totalImpressions = 0
  let totalUniqueImpressions = 0
  let totalClicks = 0
  let totalEngagement = 0
  let postsThisWeek = 0

  posts.forEach((post: any) => {
    totalReactions += post.reactions || 0
    totalComments += post.comments || 0
    totalShares += post.shares || 0
    totalImpressions += post.impressions || 0
    totalUniqueImpressions += post.impressionsUnique || 0
    totalClicks += (post.clicks || 0) + (post.linkclicks || 0)
    totalEngagement += post.engagement || 0

    // Count posts from last 7 days
    if (post.created?.dateTime) {
      const postDate = new Date(post.created.dateTime)
      if (postDate >= weekAgo) {
        postsThisWeek++
      }
    }
  })

  const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : 0

  return {
    totalReactions,
    totalComments,
    totalShares,
    totalImpressions,
    totalUniqueImpressions,
    totalClicks,
    avgEngagement,
    postsCount: posts.length,
    postsThisWeek,
  }
}

/**
 * Format Metricool data for display in marketing dashboard
 */
export function formatMetricoolData(
  facebook: any,
  instagram: any,
  youtube: any,
  web: any
): FormattedMetrics {
  // Extract Facebook metrics from posts array
  const fbMetrics = extractFacebookMetrics(facebook)
  
  // For now, we'll use impressions as a proxy for reach/followers
  // You may need to call a different endpoint for actual follower count
  const fbReach = fbMetrics.totalUniqueImpressions
  const igReach = instagram?.data ? extractFacebookMetrics(instagram).totalUniqueImpressions : 0
  const ytReach = youtube?.data ? extractFacebookMetrics(youtube).totalUniqueImpressions : 0
  
  // Total "reach" across platforms (using unique impressions as proxy)
  const totalReach = fbReach + igReach + ytReach

  // Calculate average engagement rate from posts
  const fbEngagement = fbMetrics.avgEngagement
  const igEngagement = instagram?.data ? extractFacebookMetrics(instagram).avgEngagement : 0
  const ytEngagement = youtube?.data ? extractFacebookMetrics(youtube).avgEngagement : 0
  
  // Weighted average engagement (by number of posts)
  const fbPosts = fbMetrics.postsCount
  const igPosts = instagram?.data ? extractFacebookMetrics(instagram).postsCount : 0
  const ytPosts = youtube?.data ? extractFacebookMetrics(youtube).postsCount : 0
  const totalPosts = fbPosts + igPosts + ytPosts
  
  const engagementRate = totalPosts > 0
    ? (fbEngagement * fbPosts + igEngagement * igPosts + ytEngagement * ytPosts) / totalPosts
    : 0

  // Website metrics (adjust based on actual web API response structure)
  const sessions = web?.sessions || web?.visits || web?.total_sessions || 0
  const articles = web?.articles || web?.posts || web?.total_posts || 0
  const seoScore = web?.seo_score || web?.authority || web?.domain_authority || 0

  // Calculate changes (placeholder - you'll need historical data for real changes)
  const followersChange = '0%' // TODO: Compare with previous period
  const engagementChange = '0%' // TODO: Compare with previous period
  const sessionsChange = web?.sessions_change || '0%'

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`
  }

  return {
    totalFollowers: formatNumber(totalReach), // Using reach as proxy for now
    engagementRate: formatPercentage(engagementRate),
    websiteSessions: formatNumber(sessions),
    articlesPublished: articles.toString(),
    seoAuthority: seoScore.toString(),
    followersChange,
    engagementChange,
    sessionsChange,
    platforms: [
      {
        name: 'Instagram',
        followers: formatNumber(igReach),
        change: '↑ 0%', // TODO: Calculate from historical data
        posts: `${igPosts} posts`,
      },
      {
        name: 'Facebook',
        followers: formatNumber(fbReach),
        change: '↑ 0%', // TODO: Calculate from historical data
        posts: `${fbMetrics.postsThisWeek} posts this week`,
      },
      {
        name: 'Youtube',
        followers: formatNumber(ytReach),
        change: '↑ 0%', // TODO: Calculate from historical data
        posts: `${ytPosts} videos`,
      },
    ],
  }
}

function calculateChange(current: number | undefined, previous: number | undefined): string {
  if (!current || !previous) return '0%'
  const change = ((current - previous) / previous) * 100
  const sign = change >= 0 ? '↑' : '↓'
  return `${sign} ${Math.abs(change).toFixed(0)}%`
}

/**
 * Extract follower growth data for chart
 */
export function extractFollowerGrowth(data: any[]): { months: string[]; values: number[] } {
  // Adjust based on your Metricool API response structure
  // This is a placeholder - you'll need to map your actual data structure
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const values = data?.map((item: any) => item.followers || 0) || [0, 0, 0, 0, 0, 0]
  
  return { months, values }
}

