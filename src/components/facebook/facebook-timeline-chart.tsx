'use client'

import { useFacebookData } from './facebook-data-provider'
import { extractTimelineData } from '@/lib/utils/facebook-metrics'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function FacebookTimelineChart() {
  const { followers, views, likes, posts, isLoading } = useFacebookData()

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-white animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="h-[300px] bg-gray-200 rounded" />
      </div>
    )
  }

  // Extract and sort all timeline data by date
  const followersData = [...extractTimelineData(followers)].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateA - dateB
  })
  
  const viewsData = [...extractTimelineData(views)].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateA - dateB
  })
  
  const likesData = [...extractTimelineData(likes)].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateA - dateB
  })
  
  const postsData = [...extractTimelineData(posts)].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateA - dateB
  })

  // Get all unique dates from all datasets
  const allDates = new Set<string>()
  followersData.forEach(d => allDates.add(d.date.split('T')[0] || d.date))
  viewsData.forEach(d => allDates.add(d.date.split('T')[0] || d.date))
  likesData.forEach(d => allDates.add(d.date.split('T')[0] || d.date))
  postsData.forEach(d => allDates.add(d.date.split('T')[0] || d.date))
  
  // Sort dates
  const sortedDates = Array.from(allDates).sort((a, b) => {
    const dateA = new Date(a).getTime()
    const dateB = new Date(b).getTime()
    return dateA - dateB
  })

  // Merge all data into a single array for the chart, sorted by date
  const chartData = sortedDates.map((date) => {
    // Find values for this date in each dataset
    const followersPoint = followersData.find(d => (d.date.split('T')[0] || d.date) === date)
    const viewsPoint = viewsData.find(d => (d.date.split('T')[0] || d.date) === date)
    const likesPoint = likesData.find(d => (d.date.split('T')[0] || d.date) === date)
    const postsPoint = postsData.find(d => (d.date.split('T')[0] || d.date) === date)

    // Format date label
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
      followers: followersPoint?.value ?? 0,
      views: viewsPoint?.value ?? 0,
      likes: likesPoint?.value ?? 0,
      posts: postsPoint?.value ?? 0,
    }
  })

  // Show last 30 data points (or all if less than 30)
  const displayData = chartData.slice(-30)

  // Check if we have any data
  const hasData = displayData.length > 0 && displayData.some(d => 
    d.followers > 0 || d.views > 0 || d.likes > 0 || d.posts > 0
  )

  return (
    <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-gray-200">
      <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-4 sm:mb-6">
        Timeline Overview
      </h3>
      
      {!hasData ? (
        <div className="h-[250px] sm:h-[300px] md:h-[400px] flex items-center justify-center">
          <p className="text-sm text-gray-500">No data available for the selected period</p>
        </div>
      ) : (
        <div className="h-[250px] sm:h-[300px] md:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayData}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
                formatter={(value: number | undefined, name: string | undefined) => {
                  const formattedValue = typeof value === 'number' ? value.toLocaleString() : (value ?? '0')
                  // Capitalize the first letter of the metric name
                  const formattedName = name ? name.charAt(0).toUpperCase() + name.slice(1) : ''
                  return [formattedValue, formattedName]
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="followers" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Followers"
              />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Views"
              />
              <Line 
                type="monotone" 
                dataKey="likes" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Likes"
              />
              <Line 
                type="monotone" 
                dataKey="posts" 
                stroke="#a855f7" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Posts"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

