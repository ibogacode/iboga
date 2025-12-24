'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { fetchMetricoolMetrics } from '@/actions/metricool.action'
import { METRICOOL_ENDPOINTS } from '@/config/metricool-urls'

interface MetricoolData {
  facebook: any | null
  instagram: any | null
  youtube: any | null
  web: any | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const MetricoolContext = createContext<MetricoolData | undefined>(undefined)

export function useMetricoolData() {
  const context = useContext(MetricoolContext)
  if (!context) {
    throw new Error('useMetricoolData must be used within MetricoolDataProvider')
  }
  return context
}

interface MetricoolDataProviderProps {
  children: ReactNode
  endpoints?: {
    facebook?: string
    instagram?: string
    youtube?: string
    web?: string
  }
  userId?: string
  blogId?: string
  from?: string
  to?: string
  params?: Record<string, string>
}

export function MetricoolDataProvider({ 
  children, 
  endpoints,
  userId,
  blogId,
  from,
  to,
  params,
}: MetricoolDataProviderProps) {
  const [data, setData] = useState<MetricoolData>({
    facebook: null,
    instagram: null,
    youtube: null,
    web: null,
    isLoading: true,
    error: null,
    refetch: async () => {},
  })

  // Use provided endpoints or fall back to config
  const apiEndpoints = {
    facebook: endpoints?.facebook || METRICOOL_ENDPOINTS.facebook,
    instagram: endpoints?.instagram || METRICOOL_ENDPOINTS.instagram,
    youtube: endpoints?.youtube || METRICOOL_ENDPOINTS.youtube,
    web: endpoints?.web || METRICOOL_ENDPOINTS.web,
  }

  // Calculate default date range (last 30 days) in ISO datetime format with timezone
  const getDefaultDateRange = () => {
    const now = new Date()
    const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const fromDate = new Date(toDate)
    fromDate.setDate(fromDate.getDate() - 30)
    fromDate.setHours(0, 0, 0, 0)
    
    // Format with timezone offset
    const formatWithTimezone = (date: Date) => {
      const offset = -date.getTimezoneOffset()
      const sign = offset >= 0 ? '+' : '-'
      const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0')
      const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0')
      return `${date.toISOString().split('.')[0]}${sign}${hours}:${minutes}`
    }
    
    return {
      from: from || formatWithTimezone(fromDate),
      to: to || formatWithTimezone(toDate),
    }
  }

  const fetchData = async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }))

    // Check if endpoints are configured
    if (!apiEndpoints.facebook && !apiEndpoints.instagram && !apiEndpoints.youtube && !apiEndpoints.web) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Metricool API endpoints not configured. Please add endpoints in src/config/metricool-urls.ts',
      }))
      return
    }

    const dateRange = getDefaultDateRange()

    console.log('[MetricoolDataProvider] Fetching data with:', {
      endpoints: apiEndpoints,
      dateRange,
      userId,
      blogId,
    })

    try {
      const requests = []
      
      if (apiEndpoints.facebook) {
        requests.push(
          fetchMetricoolMetrics({ 
            endpoint: apiEndpoints.facebook,
            userId,
            blogId,
            from: dateRange.from,
            to: dateRange.to,
            params,
          })
        )
      }
      
      if (apiEndpoints.instagram) {
        requests.push(
          fetchMetricoolMetrics({ 
            endpoint: apiEndpoints.instagram,
            userId,
            blogId,
            from: dateRange.from,
            to: dateRange.to,
            params,
          })
        )
      }
      
      if (apiEndpoints.youtube) {
        requests.push(
          fetchMetricoolMetrics({ 
            endpoint: apiEndpoints.youtube,
            userId,
            blogId,
            from: dateRange.from,
            to: dateRange.to,
            params,
          })
        )
      }
      
      if (apiEndpoints.web) {
        requests.push(
          fetchMetricoolMetrics({ 
            endpoint: apiEndpoints.web,
            userId,
            blogId,
            from: dateRange.from,
            to: dateRange.to,
            params,
          })
        )
      }

      const results = await Promise.allSettled(requests)
      
      const newData: Partial<MetricoolData> = {
        isLoading: false,
        error: null,
      }

      // Map results back to platforms based on which endpoints were provided
      let resultIndex = 0
      
      const extractData = (result: PromiseSettledResult<any>, platform: string) => {
        if (result.status === 'rejected') {
          console.error(`[MetricoolDataProvider] ${platform} request rejected:`, result.reason)
          return null
        }

        const value = result.value
        console.log(`[MetricoolDataProvider] ${platform} result structure:`, {
          hasValue: !!value,
          valueType: typeof value,
          valueIsObject: value && typeof value === 'object',
          hasData: !!value?.data,
          hasServerError: !!value?.serverError,
          hasValidationErrors: !!value?.validationErrors,
          hasSuccess: value?.data?.success !== undefined,
          valueKeys: value && typeof value === 'object' ? Object.keys(value) : [],
          dataKeys: value?.data && typeof value.data === 'object' ? Object.keys(value.data) : [],
          fullValue: JSON.stringify(value, null, 2).substring(0, 500), // First 500 chars for debugging
        })

        // next-safe-action returns { data: { success: true, data: ... }, serverError: null, validationErrors: null }
        // Check for server error first
        if (value?.serverError) {
          console.error(`[MetricoolDataProvider] ${platform} server error:`, value.serverError)
          return null
        }

        // Check for validation errors
        if (value?.validationErrors) {
          console.error(`[MetricoolDataProvider] ${platform} validation errors:`, value.validationErrors)
          return null
        }

        // Check for success response
        if (value?.data?.success === true) {
          return value.data.data
        }

        // Check for error in data
        if (value?.data?.error) {
          const errorMessage = typeof value.data.error === 'string' 
            ? value.data.error 
            : JSON.stringify(value.data.error)
          
          console.error(`[MetricoolDataProvider] ${platform} error:`, errorMessage)
          
          // If it's a configuration error, set a helpful error message
          if (typeof errorMessage === 'string' && errorMessage.includes('METRICOOL_API_TOKEN not configured')) {
            setData(prev => ({
              ...prev,
              error: 'Metricool API token not configured. Please set METRICOOL_API_TOKEN in Supabase Edge Functions secrets.',
            }))
          }
          
          return null
        }

        // If data structure is different, try to return the data directly
        if (value?.data) {
          console.warn(`[MetricoolDataProvider] ${platform} unexpected data structure, returning data directly`)
          return value.data
        }

        // If value itself is the data (edge case)
        if (value && typeof value === 'object' && 'data' in value === false && 'success' in value) {
          if (value.success === true && value.data) {
            return value.data
          }
        }

        console.error(`[MetricoolDataProvider] ${platform} unknown result structure:`, value)
        return null
      }
      
      if (apiEndpoints.facebook) {
        const result = results[resultIndex++]
        newData.facebook = extractData(result, 'Facebook')
      } else {
        newData.facebook = null
      }

      if (apiEndpoints.instagram) {
        const result = results[resultIndex++]
        newData.instagram = extractData(result, 'Instagram')
      } else {
        newData.instagram = null
      }

      if (apiEndpoints.youtube) {
        const result = results[resultIndex++]
        newData.youtube = extractData(result, 'YouTube')
      } else {
        newData.youtube = null
      }

      if (apiEndpoints.web) {
        const result = results[resultIndex++]
        newData.web = extractData(result, 'Web')
      } else {
        newData.web = null
      }

      setData(prev => ({
        ...prev,
        ...newData,
        refetch: fetchData,
      }))
    } catch (error) {
      console.error('Error fetching Metricool data:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
      }))
    }
  }

  useEffect(() => {
    fetchData()
    // Refetch every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoints?.facebook, endpoints?.instagram, endpoints?.youtube, endpoints?.web, userId, blogId, from, to])

  return (
    <MetricoolContext.Provider value={{ ...data, refetch: fetchData }}>
      {children}
    </MetricoolContext.Provider>
  )
}

