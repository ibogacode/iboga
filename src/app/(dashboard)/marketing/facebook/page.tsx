'use client'

import { useState, useMemo } from 'react'
import { DateRangePicker } from '@/components/marketing/date-range-picker'
import { FacebookDataProvider } from '@/components/facebook/facebook-data-provider'
import { FacebookOverviewCards } from '@/components/facebook/facebook-overview-cards'
import { FacebookTimelineChart } from '@/components/facebook/facebook-timeline-chart'
import { FacebookMetricsGrid } from '@/components/facebook/facebook-metrics-grid'

export default function FacebookPage() {
  // Calculate default date range (last 6 months) in ISO datetime format with timezone
  const getDefaultDateRange = () => {
    const now = new Date()
    const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const fromDate = new Date(toDate)
    fromDate.setMonth(fromDate.getMonth() - 6)
    fromDate.setHours(0, 0, 0, 0)
    
    // Format with timezone offset (America/Indianapolis is UTC-5 or UTC-4 depending on DST)
    // For simplicity, we'll use the current timezone offset
    const formatWithTimezone = (date: Date) => {
      const offset = -date.getTimezoneOffset()
      const sign = offset >= 0 ? '+' : '-'
      const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0')
      const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0')
      return `${date.toISOString().split('.')[0]}${sign}${hours}:${minutes}`
    }
    
    return {
      from: formatWithTimezone(fromDate),
      to: formatWithTimezone(toDate),
    }
  }

  const defaultRange = useMemo(() => getDefaultDateRange(), [])
  const [dateRange, setDateRange] = useState(defaultRange)

  const handleDateRangeChange = (from: string, to: string) => {
    setDateRange({ from, to })
  }

  return (
    <FacebookDataProvider from={dateRange.from} to={dateRange.to}>
      <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
              Facebook Analytics
            </h1>
            <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-black">
              Complete Facebook performance metrics and insights.
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

        {/* Overview Cards */}
        <FacebookOverviewCards />

        {/* Timeline Chart */}
        <FacebookTimelineChart />

        {/* Metrics Grid */}
        <FacebookMetricsGrid />
      </div>
    </FacebookDataProvider>
  )
}

