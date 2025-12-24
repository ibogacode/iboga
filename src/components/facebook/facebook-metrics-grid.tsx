'use client'

import { useFacebookData } from './facebook-data-provider'
import { extractTimelineData, formatNumber, getLatestValue, getPreviousValue, calculateChange } from '@/lib/utils/facebook-metrics'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export function FacebookMetricsGrid() {
  const { followers, views, likes, posts, isLoading } = useFacebookData()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-white animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const metrics = [
    {
      title: 'Followers Growth',
      data: followers,
      colorClass: 'bg-blue-500',
      color: '#3b82f6',
      icon: '👥',
      yAxisLabel: 'Followers',
    },
    {
      title: 'Views Performance',
      data: views,
      colorClass: 'bg-green-500',
      color: '#10b981',
      icon: '👁️',
      yAxisLabel: 'Views',
    },
    {
      title: 'Likes Engagement',
      data: likes,
      colorClass: 'bg-red-500',
      color: '#ef4444',
      icon: '👍',
      yAxisLabel: 'Likes',
    },
    {
      title: 'Posts Activity',
      data: posts,
      colorClass: 'bg-purple-500',
      color: '#a855f7',
      icon: '📝',
      yAxisLabel: 'Posts',
    },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {metrics.map((metric, index) => {
        const timelineData = extractTimelineData(metric.data)
        
        // Sort timeline data by date
        const sortedTimelineData = [...timelineData].sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateA - dateB
        })
        
        const currentValue = getLatestValue(metric.data)
        const previousValue = getPreviousValue(metric.data, 30)
        const change = calculateChange(currentValue, previousValue)
        
        // Prepare chart data with formatted dates
        const chartData = sortedTimelineData.slice(-10).map((point) => {
          const date = point.date.split('T')[0] || point.date
          let dateLabel = ''
          try {
            const dateObj = new Date(date)
            if (!isNaN(dateObj.getTime())) {
              dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            } else {
              dateLabel = date
            }
          } catch {
            dateLabel = date
          }
          
          return {
            date,
            dateLabel,
            value: point.value,
          }
        })

        return (
          <div
            key={index}
            className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xl sm:text-2xl">{metric.icon}</span>
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  {metric.title}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              {/* Current value */}
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {formatNumber(currentValue)}
                  </span>
                  <span className={`text-sm sm:text-base font-medium ${
                    change.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.value}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">vs last 30 days</p>
              </div>

              {/* Mini chart */}
              <div className="h-[120px] sm:h-[140px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 5, right: 5, left: 0, bottom: 25 }}
                    >
                      <defs>
                        <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={metric.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={metric.color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="dateLabel" 
                        stroke="#6b7280"
                        fontSize={10}
                        tick={{ fill: '#6b7280' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={10}
                        tick={{ fill: '#6b7280' }}
                        width={50}
                        label={{ value: metric.yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '10px' } }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={metric.color}
                        strokeWidth={2}
                        fill={`url(#gradient-${index})`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: '#374151', fontWeight: 600 }}
                        formatter={(value: number | undefined) => [formatNumber(value), metric.yAxisLabel]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    No data available
                  </div>
                )}
              </div>

              {/* Data points summary */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Data Points</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {sortedTimelineData.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Average</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {formatNumber(
                      sortedTimelineData.length > 0
                        ? sortedTimelineData.reduce((sum, d) => sum + d.value, 0) / sortedTimelineData.length
                        : 0
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

