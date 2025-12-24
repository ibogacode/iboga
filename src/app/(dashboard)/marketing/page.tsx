'use client'

import { useState, useMemo } from 'react'
import { MarketingStatCard } from '@/components/marketing/marketing-stat-card'
import { SocialPlatformsCard } from '@/components/marketing/social-platforms-card'
import { FollowersGrowthChart } from '@/components/marketing/followers-growth-chart'
import { LeadSourcesCard } from '@/components/marketing/lead-sources-card'
import { SEOKeywordTable } from '@/components/marketing/seo-keyword-table'
import { ContentLibraryTable } from '@/components/marketing/content-library-table'
import { MetricoolDataProvider } from '@/components/marketing/metricool-data-provider'
import { MarketingMetricsRow } from '@/components/marketing/marketing-metrics-row'
import { DateRangePicker } from '@/components/marketing/date-range-picker'

export default function MarketingPage() {
  // Calculate default date range (last 30 days) in ISO datetime format
  const getDefaultDateRange = () => {
    const now = new Date()
    const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const fromDate = new Date(toDate)
    fromDate.setDate(fromDate.getDate() - 30)
    fromDate.setHours(0, 0, 0, 0)
    
    return {
      from: fromDate.toISOString().split('.')[0],
      to: toDate.toISOString().split('.')[0],
    }
  }

  const defaultRange = useMemo(() => getDefaultDateRange(), [])
  const [dateRange, setDateRange] = useState(defaultRange)

  const handleDateRangeChange = (from: string, to: string) => {
    setDateRange({ from, to })
  }

  return (
    <MetricoolDataProvider from={dateRange.from} to={dateRange.to}>
      <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
            Marketing Performance
          </h1>
          <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-black">
            Stay on top of your tasks, monitor progress, and track status.
          </p>
        </div>
        <div className="flex-shrink-0">
          <DateRangePicker
            from={dateRange.from}
            to={dateRange.to}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

        {/* Metrics Row */}
        <MarketingMetricsRow />

          {/* Programs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <SocialPlatformsCard />
          <FollowersGrowthChart />
        </div>

        {/* Lead Sources Section */}
        <div>
          <LeadSourcesCard />
        </div>

        {/* Bottom Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <SEOKeywordTable />
          <ContentLibraryTable />
        </div>
      </div>
    </MetricoolDataProvider>
  )
}
