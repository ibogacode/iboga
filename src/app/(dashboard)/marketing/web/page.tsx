'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchMetricoolMetrics } from '@/actions/metricool.action'
import { WEB_METRICOOL_ENDPOINTS } from '@/config/metricool-urls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface WebPost {
  postUrl: string
  title: string
  excerpt: string
  date: number
  commentsCount: number
  picture?: string
  twShares: number
  fbShares: number
  inShares: number
  plusShares: number
  pinShares: number
  totalShares: number | null
  pageViews: number
  totalPageViews: number
}

export default function WebPage() {
  const [posts, setPosts] = useState<WebPost[]>([])
  const [visitorsData, setVisitorsData] = useState<number[][]>([])
  const [pageViewsData, setPageViewsData] = useState<number[][]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingVisitors, setIsLoadingVisitors] = useState(true)
  const [isLoadingPageViews, setIsLoadingPageViews] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorVisitors, setErrorVisitors] = useState<string | null>(null)
  const [errorPageViews, setErrorPageViews] = useState<string | null>(null)
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

  const fetchPosts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Format dates for Web posts API (YYYYMMDD format)
      const fromDateFormatted = fromDate.replace(/-/g, '')
      const toDateFormatted = toDate.replace(/-/g, '')

      const result = await fetchMetricoolMetrics({
        endpoint: WEB_METRICOOL_ENDPOINTS.posts,
        params: {
          start: fromDateFormatted,
          end: toDateFormatted,
        },
      })

      // Web posts API returns data directly as array
      if (Array.isArray(result?.data)) {
        setPosts(result.data)
      } else if (result?.data?.success && Array.isArray(result.data.data)) {
        setPosts(result.data.data)
      } else if (Array.isArray(result?.data?.data)) {
        setPosts(result.data.data)
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

  const fetchVisitors = async () => {
    setIsLoadingVisitors(true)
    setErrorVisitors(null)

    try {
      // Format dates for Web visitors API (YYYYMMDD format)
      const fromDateFormatted = fromDate.replace(/-/g, '')
      const toDateFormatted = toDate.replace(/-/g, '')

      const result = await fetchMetricoolMetrics({
        endpoint: WEB_METRICOOL_ENDPOINTS.visitorsTimeline,
        params: {
          start: fromDateFormatted,
          end: toDateFormatted,
        },
      })

      if (Array.isArray(result?.data)) {
        setVisitorsData(result.data)
      } else if (result?.data?.success && Array.isArray(result.data.data)) {
        setVisitorsData(result.data.data)
      } else if (Array.isArray(result?.data?.data)) {
        setVisitorsData(result.data.data)
      } else {
        setErrorVisitors(result?.data?.error || 'Failed to fetch visitors data')
        setVisitorsData([])
      }
    } catch (err) {
      setErrorVisitors(err instanceof Error ? err.message : 'An error occurred')
      setVisitorsData([])
    } finally {
      setIsLoadingVisitors(false)
    }
  }

  const fetchPageViews = async () => {
    setIsLoadingPageViews(true)
    setErrorPageViews(null)

    try {
      // Format dates for Web page views API (YYYYMMDD format)
      const fromDateFormatted = fromDate.replace(/-/g, '')
      const toDateFormatted = toDate.replace(/-/g, '')

      const result = await fetchMetricoolMetrics({
        endpoint: WEB_METRICOOL_ENDPOINTS.pageViewsTimeline,
        params: {
          start: fromDateFormatted,
          end: toDateFormatted,
        },
      })

      if (Array.isArray(result?.data)) {
        setPageViewsData(result.data)
      } else if (result?.data?.success && Array.isArray(result.data.data)) {
        setPageViewsData(result.data.data)
      } else if (Array.isArray(result?.data?.data)) {
        setPageViewsData(result.data.data)
      } else {
        setErrorPageViews(result?.data?.error || 'Failed to fetch page views data')
        setPageViewsData([])
      }
    } catch (err) {
      setErrorPageViews(err instanceof Error ? err.message : 'An error occurred')
      setPageViewsData([])
    } finally {
      setIsLoadingPageViews(false)
    }
  }

  // Fetch posts, visitors, and page views when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchPosts()
      fetchVisitors()
      fetchPageViews()
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
      const postDate = new Date(post.date)
      const postDateOnly = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate())
      return postDateOnly >= from && postDateOnly <= to
    })
  }, [posts, fromDate, toDate])

  // Calculate total metrics from filtered posts
  const totalMetrics = useMemo(() => {
    let totalPageViews = 0
    let totalVisitors = 0

    filteredPosts.forEach((post) => {
      totalPageViews += post.pageViews || 0
    })

    // Calculate total visitors from visitors data
    if (visitorsData.length > 0) {
      visitorsData.forEach(([, value]) => {
        totalVisitors += typeof value === 'number' ? value : parseFloat(String(value)) || 0
      })
    }

    return {
      pageViews: totalPageViews,
      visitors: totalVisitors,
    }
  }, [filteredPosts, visitorsData])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Merge Visitors and PageViews data for combined chart
  const chartData = useMemo(() => {
    if ((!visitorsData || visitorsData.length === 0) && (!pageViewsData || pageViewsData.length === 0)) return []
    if (!fromDate || !toDate) return []

    const parseDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const from = parseDate(fromDate)
    const to = parseDate(toDate)
    
    // Set time to start and end of day for proper comparison
    from.setHours(0, 0, 0, 0)
    to.setHours(23, 59, 59, 999)

    // Create a map to merge data by date (not timestamp, to handle same day with different times)
    const dataMap = new Map<string, { visitors: number; pageViews: number; date: Date; timestamp: number }>()

    // Process visitors data
    visitorsData.forEach((item) => {
      const timestamp = typeof item[0] === 'string' ? parseInt(item[0]) : item[0]
      const value = typeof item[1] === 'string' ? parseFloat(item[1]) : item[1]
      const date = new Date(timestamp)
      // Get date string in local timezone (YYYY-MM-DD)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      const pointDate = parseDate(dateStr)
      pointDate.setHours(0, 0, 0, 0)

      if (pointDate >= from && pointDate <= to) {
        dataMap.set(dateStr, {
          visitors: (dataMap.get(dateStr)?.visitors || 0) + (typeof value === 'number' ? value : 0),
          pageViews: dataMap.get(dateStr)?.pageViews || 0,
          date: pointDate,
          timestamp,
        })
      }
    })

    // Process page views data and merge
    pageViewsData.forEach((item) => {
      const timestamp = typeof item[0] === 'string' ? parseInt(item[0]) : item[0]
      const value = typeof item[1] === 'string' ? parseFloat(item[1]) : item[1]
      const date = new Date(timestamp)
      // Get date string in local timezone (YYYY-MM-DD)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      const pointDate = parseDate(dateStr)
      pointDate.setHours(0, 0, 0, 0)

      if (pointDate >= from && pointDate <= to) {
        const existing = dataMap.get(dateStr)
        if (existing) {
          existing.pageViews = (existing.pageViews || 0) + (typeof value === 'number' ? value : 0)
        } else {
          dataMap.set(dateStr, {
            visitors: 0,
            pageViews: typeof value === 'number' ? value : 0,
            date: pointDate,
            timestamp,
          })
        }
      }
    })

    // Convert map to array, sort, and format
    return Array.from(dataMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((point) => ({
        date: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateLabel: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateFull: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        visitors: point.visitors,
        pageViews: point.pageViews,
        fullDate: point.date.toISOString(),
      }))
  }, [visitorsData, pageViewsData, fromDate, toDate])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Web Analytics</h1>
        <p className="text-gray-600 mt-2">View and analyze your website performance</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Visitors</div>
          <div className="text-2xl font-semibold text-gray-900">{formatNumber(totalMetrics.visitors)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Page Views</div>
          <div className="text-2xl font-semibold text-gray-900">{formatNumber(totalMetrics.pageViews)}</div>
        </div>
      </div>

      {/* Combined Visitors & Page Views Graph Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Visitors & Page Views</h2>
        {(errorVisitors || errorPageViews) && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {errorVisitors || errorPageViews}
          </div>
        )}
        {(isLoadingVisitors || isLoadingPageViews) ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading analytics data...</p>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                formatter={(value: number | undefined, name: string) => {
                  if (name === 'visitors') {
                    return [value?.toLocaleString() || '0', 'Visitors']
                  } else if (name === 'pageViews') {
                    return [value?.toLocaleString() || '0', 'Page Views']
                  }
                  return [value?.toLocaleString() || '0', name]
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="visitors" 
                stroke="#3b82f6" 
                strokeWidth={2.5}
                fill="url(#colorVisitors)"
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                name="Visitors"
              />
              <Area 
                type="monotone" 
                dataKey="pageViews" 
                stroke="#10b981" 
                strokeWidth={2.5}
                fill="url(#colorPageViews)"
                dot={false}
                activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                name="Page Views"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No analytics data available for the selected date range.
          </div>
        )}
      </div>

      {/* Posts List */}
      <div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-4">
              Showing {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
            </div>

            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No posts found for the selected date range.
                </div>
              ) : (
                filteredPosts.map((post, index) => (
                  <div
                    key={post.postUrl || index}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      {/* Post Image */}
                      {post.picture && (
                        <img
                          src={post.picture}
                          alt={post.title}
                          className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      )}

                      {/* Post Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-500">
                                {formatDate(post.date)}
                              </span>
                            </div>
                            {post.postUrl && (
                              <a
                                href={post.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View Article →
                              </a>
                            )}
                            {post.excerpt && (
                              <p className="text-sm text-gray-700 mt-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: post.excerpt }} />
                            )}
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Page Views</div>
                            <div className="text-lg font-semibold">{formatNumber(post.pageViews)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Total Views</div>
                            <div className="text-lg font-semibold">{formatNumber(post.totalPageViews)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Comments</div>
                            <div className="text-lg font-semibold">{formatNumber(post.commentsCount)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Total Shares</div>
                            <div className="text-lg font-semibold">{formatNumber(post.totalShares || (post.twShares + post.fbShares + post.inShares + post.plusShares + post.pinShares))}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Facebook</div>
                            <div className="text-lg font-semibold">{formatNumber(post.fbShares)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Twitter</div>
                            <div className="text-lg font-semibold">{formatNumber(post.twShares)}</div>
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

