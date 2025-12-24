'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { fetchMetricoolMetrics } from '@/actions/metricool.action'
import { FACEBOOK_METRICOOL_ENDPOINTS } from '@/config/metricool-urls'

interface FacebookData {
  followers: any | null
  views: any | null
  likes: any | null
  posts: any | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const FacebookContext = createContext<FacebookData | undefined>(undefined)

export function useFacebookData() {
  const context = useContext(FacebookContext)
  if (!context) {
    throw new Error('useFacebookData must be used within FacebookDataProvider')
  }
  return context
}

interface FacebookDataProviderProps {
  children: ReactNode
  userId?: string
  blogId?: string
  from?: string
  to?: string
}

export function FacebookDataProvider({ 
  children, 
  userId,
  blogId,
  from,
  to,
}: FacebookDataProviderProps) {
  const [data, setData] = useState<FacebookData>({
    followers: null,
    views: null,
    likes: null,
    posts: null,
    isLoading: true,
    error: null,
    refetch: async () => {},
  })

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
    
    const defaultFrom = formatWithTimezone(fromDate)
    const defaultTo = formatWithTimezone(toDate)
    
    return {
      from: from || defaultFrom,
      to: to || defaultTo,
    }
  }

  const fetchData = async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }))

    const dateRange = getDefaultDateRange()

    console.log('[FacebookDataProvider] Fetching data with:', {
      dateRange,
      userId,
      blogId,
    })

    try {
      // Log the input to help debug validation issues
      console.log('[FacebookDataProvider] Calling fetchMetricoolMetrics with input:', {
        endpoint: FACEBOOK_METRICOOL_ENDPOINTS.followers,
        userId: userId || 'undefined',
        blogId: blogId || 'undefined',
        from: dateRange.from,
        to: dateRange.to,
        paramsType: typeof { metric: 'pageFollows', network: 'facebook', subject: 'account' },
      })

      // Fetch all Facebook metrics in parallel
      const requests = [
        // Followers
        fetchMetricoolMetrics({ 
          endpoint: FACEBOOK_METRICOOL_ENDPOINTS.followers,
          userId: userId || undefined,
          blogId: blogId || undefined,
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
          params: {
            metric: 'pageFollows',
            network: 'facebook',
            subject: 'account',
          },
        }),
        // Views
        fetchMetricoolMetrics({ 
          endpoint: FACEBOOK_METRICOOL_ENDPOINTS.views,
          userId: userId || undefined,
          blogId: blogId || undefined,
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
          params: {
            metric: 'page_media_view',
            network: 'facebook',
            subject: 'account',
          },
        }),
        // Likes
        fetchMetricoolMetrics({ 
          endpoint: FACEBOOK_METRICOOL_ENDPOINTS.likes,
          userId: userId || undefined,
          blogId: blogId || undefined,
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
          params: {
            metric: 'likes',
            network: 'facebook',
            subject: 'account',
          },
        }),
        // Posts
        fetchMetricoolMetrics({ 
          endpoint: FACEBOOK_METRICOOL_ENDPOINTS.posts,
          userId: userId || undefined,
          blogId: blogId || undefined,
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
          params: {
            metric: 'postsCount',
            network: 'facebook',
            subject: 'account',
          },
        }),
      ]

      const results = await Promise.allSettled(requests)
      
      const extractData = (result: PromiseSettledResult<any>, metricName: string) => {
        if (result.status === 'rejected') {
          console.error(`[FacebookDataProvider] ${metricName} request rejected:`, result.reason)
          return null
        }

        const value = result.value
        
        // Safely log structure for debugging (wrap in try-catch to prevent crashes)
        try {
          const safeValueKeys = value && typeof value === 'object' && value !== null
            ? Object.keys(value).filter(key => {
                try {
                  return value[key] !== undefined
                } catch {
                  return false
                }
              })
            : []
          
          const safeDataKeys = value?.data && typeof value.data === 'object' && value.data !== null
            ? Object.keys(value.data).filter(key => {
                try {
                  return value.data[key] !== undefined
                } catch {
                  return false
                }
              })
            : []
          
          console.log(`[FacebookDataProvider] ${metricName} result structure:`, {
            hasValue: !!value,
            valueType: typeof value,
            valueIsObject: value && typeof value === 'object' && value !== null,
            hasData: !!value?.data,
            hasSuccess: value?.data?.success !== undefined,
            valueKeys: safeValueKeys,
            dataKeys: safeDataKeys,
          })
        } catch (logError) {
          console.warn(`[FacebookDataProvider] ${metricName} error logging structure:`, logError)
        }

        // next-safe-action returns { data: { success: true, data: ... }, serverError: null, validationErrors: null }
        // Don't try to access serverError or validationErrors directly as they may be getters that throw errors
        // Instead, check if we have valid data structure

        // Check for success response - next-safe-action wraps the response
        try {
          // Structure: { data: { success: true, data: <actual data> } }
          if (value?.data?.success === true && value.data.data !== undefined) {
            const extractedData = value.data.data
            console.log(`[FacebookDataProvider] ${metricName} extracted data:`, {
              hasData: !!extractedData,
              dataType: typeof extractedData,
              isArray: Array.isArray(extractedData),
              dataKeys: extractedData && typeof extractedData === 'object' && !Array.isArray(extractedData) ? Object.keys(extractedData) : [],
              firstItem: Array.isArray(extractedData) && extractedData.length > 0 ? extractedData[0] : null,
              fullData: JSON.stringify(extractedData, null, 2).substring(0, 500),
            })
            return extractedData
          }
          
          // If success is false or error exists, log and return null
          if (value?.data?.success === false || value?.data?.error) {
            const errorMsg = value?.data?.error || 'Unknown error'
            console.error(`[FacebookDataProvider] ${metricName} error in response:`, errorMsg)
            return null
          }
        } catch (error) {
          console.warn(`[FacebookDataProvider] ${metricName} error checking success:`, error)
        }

        // Check for error in data
        try {
          if (value?.data?.error) {
            let errorMessage = 'Failed to fetch Facebook metrics'
            if (typeof value.data.error === 'string') {
              errorMessage = value.data.error
            } else if (typeof value.data.error === 'object' && value.data.error !== null) {
              errorMessage = JSON.stringify(value.data.error)
            }
            
            console.error(`[FacebookDataProvider] ${metricName} error:`, errorMessage)
            
            // If it's a configuration error, set a helpful error message
            if (typeof errorMessage === 'string' && errorMessage.includes('METRICOOL_API_TOKEN not configured')) {
              setData(prev => ({
                ...prev,
                error: 'Metricool API token not configured. Please set METRICOOL_API_TOKEN in Supabase Edge Functions secrets.',
              }))
            }
            
            return null
          }
        } catch (error) {
          console.warn(`[FacebookDataProvider] ${metricName} error checking data.error:`, error)
        }

        // If data structure is different, try to return the data directly
        try {
          if (value?.data) {
            console.warn(`[FacebookDataProvider] ${metricName} unexpected data structure, returning data directly`)
            return value.data
          }
        } catch (error) {
          console.warn(`[FacebookDataProvider] ${metricName} error accessing data:`, error)
        }

        // If value itself is the data (edge case)
        try {
          if (value && typeof value === 'object' && value !== null && !('data' in value) && 'success' in value) {
            if (value.success === true && value.data) {
              return value.data
            }
          }
        } catch (error) {
          console.warn(`[FacebookDataProvider] ${metricName} error checking alternative structure:`, error)
        }

        // If we get here, it means the response structure is unexpected
        // Check if it's a validation error by checking if 'serverError' key exists (but don't access it)
        const hasServerError = value && typeof value === 'object' && value !== null && 'serverError' in value
        if (hasServerError) {
          console.error(`[FacebookDataProvider] ${metricName} validation/server error detected`)
          console.error(`[FacebookDataProvider] ${metricName} This usually means the action input doesn't match the schema. Check the action call.`)
          return null
        }
        
        // Log what we can safely access
        try {
          const safeKeys = value && typeof value === 'object' && value !== null 
            ? Object.keys(value).filter(key => {
                try {
                  // Try to access the key to see if it throws
                  const test = value[key]
                  return test !== undefined
                } catch {
                  return false
                }
              })
            : []
          
          console.error(`[FacebookDataProvider] ${metricName} unknown result structure:`, {
            hasValue: !!value,
            valueType: typeof value,
            safeKeys,
          })
        } catch {
          console.error(`[FacebookDataProvider] ${metricName} unknown result structure (could not log value)`)
        }
        return null
      }

      const newData: Partial<FacebookData> = {
        isLoading: false,
        error: null,
        followers: extractData(results[0], 'Followers'),
        views: extractData(results[1], 'Views'),
        likes: extractData(results[2], 'Likes'),
        posts: extractData(results[3], 'Posts'),
      }

      setData(prev => ({
        ...prev,
        ...newData,
        refetch: fetchData,
      }))
    } catch (error) {
      console.error('Error fetching Facebook data:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Facebook metrics',
      }))
    }
  }

  useEffect(() => {
    fetchData()
    // Refetch every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, blogId, from, to])

  return (
    <FacebookContext.Provider value={{ ...data, refetch: fetchData }}>
      {children}
    </FacebookContext.Provider>
  )
}

