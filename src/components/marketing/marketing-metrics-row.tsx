'use client'

import { MarketingStatCard } from './marketing-stat-card'
import { useMetricoolData } from './metricool-data-provider'
import { formatMetricoolData } from '@/lib/utils/metricool'

export function MarketingMetricsRow() {
  const { facebook, instagram, youtube, web, isLoading, error } = useMetricoolData()
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Error loading metrics</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <p className="text-red-500 text-xs mt-2">Check browser console and Supabase Edge Function logs for details.</p>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 md:gap-[25px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-white animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    )
  }

  const formatted = formatMetricoolData(facebook, instagram, youtube, web)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 md:gap-[25px]">
      <MarketingStatCard
        title="Total Followers"
        value={formatted.totalFollowers}
        change={formatted.followersChange}
        changeLabel="than last month"
      />
      <MarketingStatCard
        title="Engagement Rate"
        value={formatted.engagementRate}
        change={formatted.engagementChange}
        changeLabel="than last month"
      />
      <MarketingStatCard
        title="Website Sessions (30d)"
        value={formatted.websiteSessions}
        change={formatted.sessionsChange}
        changeLabel="than last month"
      />
      <MarketingStatCard
        title="Articles Published"
        value={formatted.articlesPublished}
        change="+0"
        changeLabel="than last month"
      />
      <MarketingStatCard
        title="SEO Authority"
        value={formatted.seoAuthority}
        change="0%"
        changeLabel="than last month"
      />
    </div>
  )
}

