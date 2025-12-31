'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchMetricoolMetrics } from '@/actions/metricool.action'
import { INSTAGRAM_METRICOOL_ENDPOINTS } from '@/config/metricool-urls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface InstagramPost {
  postId: string
  userId: string
  type: string
  publishedAt: {
    dateTime: string
    timezone: string
  }
  url: string
  content?: string
  imageUrl?: string
  likes: number
  comments: number
  shares: number
  interactions: number
  engagement: number
  reach: number
  saved: number
  impressionsTotal: number
  views: number
}

interface InstagramReel {
  reelId: string
  userId: string
  type: string
  publishedAt: {
    dateTime: string
    timezone: string
  }
  url: string
  content?: string
  imageUrl?: string
  likes: number
  comments: number
  interactions: number
  engagement: number
  views: number
  reach: number
  saved: number
  shares: number
  impressionsTotal: number
  averageWatchTime: number
  videoViewTotalTime: number
}

interface FollowersDataPoint {
  dateTime: string
  value: number
}

interface FollowersTimelineResponse {
  metric: string
  values: FollowersDataPoint[]
}

export default function InstagramPage() {
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [reels, setReels] = useState<InstagramReel[]>([])
  const [followersData, setFollowersData] = useState<FollowersTimelineResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReels, setIsLoadingReels] = useState(true)
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorReels, setErrorReels] = useState<string | null>(null)
  const [errorFollowers, setErrorFollowers] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts')

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

  const fetchPosts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Format dates for API (start of day to end of day)
      const fromDateTime = `${fromDate}T00:00:00`
      const toDateTime = `${toDate}T23:59:59`

      const result = await fetchMetricoolMetrics({
        endpoint: INSTAGRAM_METRICOOL_ENDPOINTS.posts,
        from: fromDateTime,
        to: toDateTime,
      })

      if (result?.data?.success && result.data.data?.data) {
        setPosts(result.data.data.data)
      } else {
        setError(result?.data?.error || 'Failed to fetch posts')
        setPosts([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchReels = async () => {
    setIsLoadingReels(true)
    setErrorReels(null)

    try {
      // Format dates for API (start of day to end of day)
      const fromDateTime = `${fromDate}T00:00:00`
      const toDateTime = `${toDate}T23:59:59`

      const result = await fetchMetricoolMetrics({
        endpoint: INSTAGRAM_METRICOOL_ENDPOINTS.reels,
        from: fromDateTime,
        to: toDateTime,
      })

      if (result?.data?.success && result.data.data?.data) {
        setReels(result.data.data.data)
      } else {
        setErrorReels(result?.data?.error || 'Failed to fetch reels')
        setReels([])
      }
    } catch (err) {
      setErrorReels(err instanceof Error ? err.message : 'An error occurred')
      setReels([])
    } finally {
      setIsLoadingReels(false)
    }
  }

  const fetchFollowers = async () => {
    setIsLoadingFollowers(true)
    setErrorFollowers(null)

    try {
      // Format dates for API - timelines endpoint needs timezone offset
      const fromDateTime = `${fromDate}T00:00:00`
      const toDateTime = `${toDate}T23:59:59`

      const result = await fetchMetricoolMetrics({
        endpoint: INSTAGRAM_METRICOOL_ENDPOINTS.followersTimeline,
        from: fromDateTime,
        to: toDateTime,
        params: {
          metric: 'followers',
          network: 'instagram',
          subject: 'account',
        },
      })

      if (result?.data?.success && result.data.data?.data && result.data.data.data.length > 0) {
        setFollowersData(result.data.data.data[0])
      } else {
        setErrorFollowers(result?.data?.error || 'Failed to fetch followers data')
        setFollowersData(null)
      }
    } catch (err) {
      setErrorFollowers(err instanceof Error ? err.message : 'An error occurred')
      setFollowersData(null)
    } finally {
      setIsLoadingFollowers(false)
    }
  }

  // Fetch posts, reels, and followers when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchPosts()
      fetchReels()
      fetchFollowers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate])

  const handleQuickSelect = (days: number) => {
    const toDateObj = new Date(yesterday)
    const fromDateObj = new Date(yesterday)
    toDateObj.setDate(toDateObj.getDate() +1)
    fromDateObj.setDate(fromDateObj.getDate() - (days -1))
    
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

  // Filter posts by selected date range
  const filteredPosts = useMemo(() => {
    if (!fromDate || !toDate) return posts

    const parseDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const from = parseDate(fromDate)
    const to = parseDate(toDate)

    return posts.filter(post => {
      const postDateStr = post.publishedAt.dateTime.split('T')[0]
      const postDate = parseDate(postDateStr)
      return postDate >= from && postDate <= to
    })
  }, [posts, fromDate, toDate])

  // Filter reels by selected date range
  const filteredReels = useMemo(() => {
    if (!fromDate || !toDate) return reels

    const parseDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const from = parseDate(fromDate)
    const to = parseDate(toDate)

    return reels.filter(reel => {
      const reelDateStr = reel.publishedAt.dateTime.split('T')[0]
      const reelDate = parseDate(reelDateStr)
      return reelDate >= from && reelDate <= to
    })
  }, [reels, fromDate, toDate])

  // Calculate total metrics from filtered posts and reels
  const totalMetrics = useMemo(() => {
    let totalReactions = 0
    let totalShares = 0
    let totalImpressions = 0
    let totalEngagement = 0
    let engagementCount = 0

    // Sum from posts (likes = reactions for Instagram)
    filteredPosts.forEach((post) => {
      totalReactions += post.likes || 0
      totalShares += post.shares || 0
      totalImpressions += post.impressionsTotal || 0
      // Average engagement: sum all engagement percentages
      if (post.engagement !== undefined && post.engagement !== null) {
        totalEngagement += post.engagement
        engagementCount++
      }
    })

    // Sum from reels
    filteredReels.forEach((reel) => {
      totalReactions += reel.likes || 0
      totalShares += reel.shares || 0
      totalImpressions += reel.impressionsTotal || 0
      // Average engagement: sum all engagement percentages
      if (reel.engagement !== undefined && reel.engagement !== null) {
        totalEngagement += reel.engagement
        engagementCount++
      }
    })

    // Calculate average engagement
    const averageEngagement = engagementCount > 0 ? totalEngagement / engagementCount : 0

    return {
      reactions: totalReactions,
      shares: totalShares,
      impressions: totalImpressions,
      engagement: averageEngagement,
    }
  }, [filteredPosts, filteredReels])

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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Format followers data for chart and filter by date range
  const chartData = useMemo(() => {
    if (!followersData?.values || !fromDate || !toDate) return []

    const parseDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const from = parseDate(fromDate)
    const to = parseDate(toDate)

    // Filter, map, and sort by date in ascending order (earliest to latest)
    return followersData.values
      .filter((point) => {
        const pointDateStr = point.dateTime.split('T')[0]
        const pointDate = parseDate(pointDateStr)
        return pointDate >= from && pointDate <= to
      })
      .map((point) => {
        const date = new Date(point.dateTime)
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dateFull: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          followers: point.value,
          fullDate: point.dateTime,
          sortDate: date.getTime(), // Add timestamp for sorting
        }
      })
      .sort((a, b) => a.sortDate - b.sortDate) // Sort by date in ascending order
      .map(({ sortDate, ...rest }) => rest) // Remove sortDate after sorting
  }, [followersData, fromDate, toDate])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Instagram Content</h1>
        <p className="text-gray-600 mt-2">View and analyze your Instagram posts and reels performance</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Reactions</div>
          <div className="text-2xl font-semibold text-gray-900">{formatNumber(totalMetrics.reactions)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Shares</div>
          <div className="text-2xl font-semibold text-gray-900">{formatNumber(totalMetrics.shares)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Impressions</div>
          <div className="text-2xl font-semibold text-gray-900">{formatNumber(totalMetrics.impressions)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Average Engagement</div>
          <div className="text-2xl font-semibold text-gray-900">{totalMetrics.engagement.toFixed(1)}%</div>
        </div>
      </div>

      {/* Followers Graph Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Page Followers</h2>
        {errorFollowers && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {errorFollowers}
          </div>
        )}
        {isLoadingFollowers ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading followers data...</p>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E4405F" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#E4405F" stopOpacity={0}/>
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
                formatter={(value: number | undefined) => [value?.toLocaleString() || '0', 'Followers']}
              />
              <Area 
                type="monotone" 
                dataKey="followers" 
                stroke="#E4405F" 
                strokeWidth={2.5}
                fill="url(#colorFollowers)"
                dot={false}
                activeDot={{ r: 5, fill: '#E4405F', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No followers data available for the selected date range.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'posts'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'reels'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Reels
        </button>
      </div>

      {/* Error State */}
      {(error || errorReels) && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {activeTab === 'posts' ? error : errorReels}
        </div>
      )}

      {/* Loading State */}
      {(isLoading && activeTab === 'posts') || (isLoadingReels && activeTab === 'reels') ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading {activeTab}...</p>
        </div>
      ) : (
        <>
          {/* Posts Section */}
          {activeTab === 'posts' && !isLoading && !error && (
            <>
              <div className="text-sm text-gray-600">
                Showing {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
              </div>

              <div className="space-y-4">
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No posts found for the selected date range.
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <div
                      key={post.postId}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        {/* Post Image */}
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt="Post"
                            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                          />
                        )}

                        {/* Post Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded capitalize">
                                  {post.type.replace('_', ' ').toLowerCase()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(post.publishedAt.dateTime)}
                                </span>
                              </div>
                              {post.url && (
                                <a
                                  href={post.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  View on Instagram →
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Likes</div>
                              <div className="text-lg font-semibold">{formatNumber(post.likes)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Comments</div>
                              <div className="text-lg font-semibold">{formatNumber(post.comments)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Shares</div>
                              <div className="text-lg font-semibold">{formatNumber(post.shares)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Impressions</div>
                              <div className="text-lg font-semibold">{formatNumber(post.impressionsTotal)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Reach</div>
                              <div className="text-lg font-semibold">{formatNumber(post.reach)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Engagement</div>
                              <div className="text-lg font-semibold">{post.engagement.toFixed(1)}%</div>
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

          {/* Reels Section */}
          {activeTab === 'reels' && !isLoadingReels && !errorReels && (
            <>
              <div className="text-sm text-gray-600">
                Showing {filteredReels.length} reel{filteredReels.length !== 1 ? 's' : ''}
              </div>

              <div className="space-y-4">
                {filteredReels.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No reels found for the selected date range.
                  </div>
                ) : (
                  filteredReels.map((reel) => (
                    <div
                      key={reel.reelId}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        {/* Reel Thumbnail */}
                        {reel.imageUrl && (
                          <img
                            src={reel.imageUrl}
                            alt="Reel"
                            className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                          />
                        )}

                        {/* Reel Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                  Reel
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(reel.publishedAt.dateTime)}
                                </span>
                                {reel.averageWatchTime && (
                                  <span className="text-xs text-gray-500">
                                    {formatDuration(reel.averageWatchTime)} avg watch
                                  </span>
                                )}
                              </div>
                              {reel.url && (
                                <a
                                  href={reel.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  View on Instagram →
                                </a>
                              )}
                              {reel.content && (
                                <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                                  {reel.content}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Likes</div>
                              <div className="text-lg font-semibold">{formatNumber(reel.likes)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Views</div>
                              <div className="text-lg font-semibold">{formatNumber(reel.views)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Comments</div>
                              <div className="text-lg font-semibold">{formatNumber(reel.comments)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Shares</div>
                              <div className="text-lg font-semibold">{formatNumber(reel.shares)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Impressions</div>
                              <div className="text-lg font-semibold">{formatNumber(reel.impressionsTotal)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Engagement</div>
                              <div className="text-lg font-semibold">{reel.engagement.toFixed(1)}%</div>
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
        </>
      )}
    </div>
  )
}

