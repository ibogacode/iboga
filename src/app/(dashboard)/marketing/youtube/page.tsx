'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchMetricoolMetrics } from '@/actions/metricool.action'
import { YOUTUBE_METRICOOL_ENDPOINTS } from '@/config/metricool-urls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface YouTubeVideo {
  videoId: string
  thumbnailUrl?: string
  watchUrl: string
  title: string
  publishedAt: {
    dateTime: string
    timezone: string
  }
  views: number
  watchMinutes: number
  averageViewDuration: number
  likes: number
  dislikes: number
  comments: number
  shares: number
  durationSeconds: number
  hasRevenueData: boolean
}

interface SubscribersDataPoint {
  dateTime: string
  value: number
}

export default function YouTubePage() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [subscribersData, setSubscribersData] = useState<number[][]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorSubscribers, setErrorSubscribers] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showCustomRange, setShowCustomRange] = useState(false)

  // Get today's date and yesterday (max selectable date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const maxDate = yesterday.toISOString().split('T')[0]

  // Initialize with last 30 days
  useEffect(() => {
    const toDateObj = new Date(yesterday)
    const fromDateObj = new Date(yesterday)
    fromDateObj.setDate(fromDateObj.getDate() - 29) // 30 days: yesterday + 29 previous days = 30 days total
    
    setFromDate(fromDateObj.toISOString().split('T')[0])
    setToDate(toDateObj.toISOString().split('T')[0])
  }, [])

  const fetchVideos = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Format dates for API (start of day to end of day)
      const fromDateTime = `${fromDate}T00:00:00`
      const toDateTime = `${toDate}T23:59:59`

      const result = await fetchMetricoolMetrics({
        endpoint: YOUTUBE_METRICOOL_ENDPOINTS.videos,
        from: fromDateTime,
        to: toDateTime,
        params: {
          postsType: 'all',
        },
      })

      if (result?.data?.success && result.data.data?.data) {
        setVideos(result.data.data.data)
      } else {
        setError(result?.data?.error || 'Failed to fetch videos')
        setVideos([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setVideos([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSubscribers = async () => {
    setIsLoadingSubscribers(true)
    setErrorSubscribers(null)

    try {
      // Format dates for YouTube subscribers API (YYYYMMDD format)
      const fromDateFormatted = fromDate.replace(/-/g, '')
      const toDateFormatted = toDate.replace(/-/g, '')

      const result = await fetchMetricoolMetrics({
        endpoint: YOUTUBE_METRICOOL_ENDPOINTS.subscribersTimeline,
        params: {
          start: fromDateFormatted,
          end: toDateFormatted,
        },
      })

      // YouTube subscribers API returns data directly as array, not wrapped in success/data structure
      if (Array.isArray(result?.data)) {
        setSubscribersData(result.data)
      } else if (result?.data?.success && Array.isArray(result.data.data)) {
        setSubscribersData(result.data.data)
      } else if (Array.isArray(result?.data?.data)) {
        setSubscribersData(result.data.data)
      } else {
        setErrorSubscribers(result?.data?.error || 'Failed to fetch subscribers data')
        setSubscribersData([])
      }
    } catch (err) {
      setErrorSubscribers(err instanceof Error ? err.message : 'An error occurred')
      setSubscribersData([])
    } finally {
      setIsLoadingSubscribers(false)
    }
  }

  // Fetch videos and subscribers when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchVideos()
      fetchSubscribers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate])

  const handleQuickSelect = (days: number) => {
    const toDateObj = new Date(yesterday)
    const fromDateObj = new Date(yesterday)
    toDateObj.setDate(toDateObj.getDate() + 1)
    fromDateObj.setDate(fromDateObj.getDate() - (days - 2))
    
    setFromDate(fromDateObj.toISOString().split('T')[0])
    setToDate(toDateObj.toISOString().split('T')[0])
    setShowCustomRange(false)
  }

  const handleCustomRange = () => {
    setShowCustomRange(true)
  }

  const handleApplyCustomRange = () => {
    if (fromDate && toDate && fromDate <= toDate && toDate <= maxDate) {
      setShowCustomRange(false)
    }
  }

  // Filter videos by selected date range
  const filteredVideos = useMemo(() => {
    if (!fromDate || !toDate) return videos

    const parseDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const from = parseDate(fromDate)
    const to = parseDate(toDate)

    return videos.filter(video => {
      const videoDateStr = video.publishedAt.dateTime.split('T')[0]
      const videoDate = parseDate(videoDateStr)
      return videoDate >= from && videoDate <= to
    })
  }, [videos, fromDate, toDate])

  // Calculate total metrics from filtered videos
  const totalMetrics = useMemo(() => {
    let totalLikes = 0
    let totalShares = 0
    let totalViews = 0

    filteredVideos.forEach((video) => {
      totalLikes += video.likes || 0
      totalShares += video.shares || 0
      totalViews += video.views || 0
    })

    return {
      likes: totalLikes,
      shares: totalShares,
      views: totalViews,
    }
  }, [filteredVideos])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Format subscribers data for chart and filter by date range
  const chartData = useMemo(() => {
    if (!subscribersData || subscribersData.length === 0 || !fromDate || !toDate) return []

    const parseDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const from = parseDate(fromDate)
    const to = parseDate(toDate)

    // Convert array of [timestamp, value] to chart data format
    const dataPoints = subscribersData
      .map((item) => {
        const timestamp = typeof item[0] === 'string' ? parseInt(item[0]) : item[0]
        const value = typeof item[1] === 'string' ? parseFloat(item[1]) : item[1]
        const date = new Date(timestamp)
        const dateStr = date.toISOString().split('T')[0]
        return {
          date,
          dateStr,
          value: typeof value === 'number' ? value : 0,
          timestamp,
        }
      })
      .filter((point) => {
        const pointDate = parseDate(point.dateStr)
        return pointDate >= from && pointDate <= to
      })
      .map((point) => ({
        date: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateLabel: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateFull: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        subscribers: point.value,
        fullDate: point.date.toISOString(),
        sortDate: point.timestamp,
      }))
      .sort((a, b) => a.sortDate - b.sortDate) // Sort by timestamp in ascending order
      .map(({ sortDate, ...rest }) => rest) // Remove sortDate after sorting

    return dataPoints
  }, [subscribersData, fromDate, toDate])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">YouTube Content</h1>
        <p className="text-gray-600 mt-2">View and analyze your YouTube videos performance</p>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button
          variant="outline"
          onClick={() => handleQuickSelect(30)}
          className={!showCustomRange && fromDate && toDate && Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)) === 29 ? 'bg-gray-100' : ''}
        >
          Last 30 Days
        </Button>
        <Button
          variant="outline"
          onClick={() => handleQuickSelect(60)}
          className={!showCustomRange && fromDate && toDate && Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)) === 59 ? 'bg-gray-100' : ''}
        >
          Last 60 Days
        </Button>
        <Button
          variant="outline"
          onClick={() => handleQuickSelect(90)}
          className={!showCustomRange && fromDate && toDate && Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)) === 89 ? 'bg-gray-100' : ''}
        >
          Last 90 Days
        </Button>
        <Button
          variant="outline"
          onClick={handleCustomRange}
          className={showCustomRange ? 'bg-gray-100' : ''}
        >
          Custom Date Range
        </Button>

        {/* Custom Date Range Inputs */}
        {showCustomRange && (
          <div className="flex gap-3 items-end">
            <div>
              <Label htmlFor="from-date">From</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={toDate || maxDate}
                className="w-40"
              />
            </div>
            <div>
              <Label htmlFor="to-date">To</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                max={maxDate}
                className="w-40"
              />
            </div>
            <Button onClick={handleApplyCustomRange}>Apply</Button>
          </div>
        )}

        {/* Display current date range */}
        {!showCustomRange && fromDate && toDate && (
          <div className="ml-auto text-sm text-gray-600">
            {new Date(fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Likes</div>
          <div className="text-2xl font-semibold text-gray-900">{formatNumber(totalMetrics.likes)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Shares</div>
          <div className="text-2xl font-semibold text-gray-900">{formatNumber(totalMetrics.shares)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Views</div>
          <div className="text-2xl font-semibold text-gray-900">{formatNumber(totalMetrics.views)}</div>
        </div>
      </div>

      {/* Subscribers Graph Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscribers</h2>
        {errorSubscribers && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {errorSubscribers}
          </div>
        )}
        {isLoadingSubscribers ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading subscribers data...</p>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis 
                stroke="#9ca3af"
                style={{ fontSize: '12px', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  padding: '10px 14px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                labelStyle={{ 
                  color: '#374151',
                  fontWeight: 600,
                  marginBottom: '4px'
                }}
                labelFormatter={(label) => {
                  const dataPoint = chartData.find(d => d.date === label)
                  return dataPoint ? new Date(dataPoint.fullDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : label
                }}
                formatter={(value: number | undefined) => [value?.toLocaleString() || '0', 'Subscribers']}
              />
              <Area 
                type="monotone" 
                dataKey="subscribers" 
                stroke="#FF0000" 
                strokeWidth={2.5}
                fill="url(#colorSubscribers)"
                dot={false}
                activeDot={{ r: 5, fill: '#FF0000', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No subscribers data available for the selected date range.
          </div>
        )}
      </div>

      {/* Videos List */}
      <div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading videos...</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-4">
              Showing {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
            </div>

            <div className="space-y-4">
              {filteredVideos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No videos found for the selected date range.
                </div>
              ) : (
                filteredVideos.map((video) => (
                  <div
                    key={video.videoId}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      {/* Video Thumbnail */}
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      )}

                      {/* Video Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{video.title}</h3>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-500">
                                {formatDate(video.publishedAt.dateTime)}
                              </span>
                              {video.durationSeconds > 0 && (
                                <span className="text-xs text-gray-500">
                                  {formatDuration(video.durationSeconds)}
                                </span>
                              )}
                            </div>
                            {video.watchUrl && (
                              <a
                                href={video.watchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                Watch on YouTube →
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Views</div>
                            <div className="text-lg font-semibold">{formatNumber(video.views)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Likes</div>
                            <div className="text-lg font-semibold">{formatNumber(video.likes)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Comments</div>
                            <div className="text-lg font-semibold">{formatNumber(video.comments)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Shares</div>
                            <div className="text-lg font-semibold">{formatNumber(video.shares)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Watch Time</div>
                            <div className="text-lg font-semibold">{formatNumber(Math.round(video.watchMinutes))}m</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Avg Duration</div>
                            <div className="text-lg font-semibold">{formatDuration(video.averageViewDuration)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

