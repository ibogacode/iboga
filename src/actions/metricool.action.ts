'use server'

import { actionClient } from '@/lib/safe-action'
import { z } from 'zod'

const fetchMetricoolSchema = z.object({
  endpoint: z.string().min(1, 'endpoint is required'), // Metricool API endpoint path (e.g., '/facebook/metrics')
  userId: z.string().optional(),
  blogId: z.string().optional(),
  params: z.record(z.string(), z.string()).optional(), // Additional query parameters - both key and value are strings
  from: z.string().optional(), // Date from (YYYY-MM-DD or ISO datetime)
  to: z.string().optional(), // Date to (YYYY-MM-DD or ISO datetime)
})

export const fetchMetricoolMetrics = actionClient
  .schema(fetchMetricoolSchema)
  .action(async ({ parsedInput }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    try {
      const url = `${supabaseUrl}/functions/v1/fetch-metricool`
      const requestBody = {
        endpoint: parsedInput.endpoint,
        userId: parsedInput.userId,
        blogId: parsedInput.blogId,
        params: parsedInput.params,
        from: parsedInput.from,
        to: parsedInput.to,
      }
      
      console.log('[fetchMetricoolMetrics] Calling edge function:', url)
      console.log('[fetchMetricoolMetrics] Request body:', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      console.log('[fetchMetricoolMetrics] Edge function response:', response.status)

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        console.error('[fetchMetricoolMetrics] Invalid response:', responseText)
        return { success: false, error: `Invalid response: ${responseText}` }
      }

      // Check if response has an error
      if (result.error) {
        console.error('[fetchMetricoolMetrics] Metricool API error:', result.error)
        return { success: false, error: result.error || 'Failed to fetch Metricool metrics' }
      }

      console.log('[fetchMetricoolMetrics] Successfully fetched metrics for endpoint:', parsedInput.endpoint)
      console.log('[fetchMetricoolMetrics] Result data:', JSON.stringify(result, null, 2).substring(0, 500))
      return { success: true, data: result }
    } catch (error) {
      console.error('[fetchMetricoolMetrics] Error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch Metricool metrics' 
      }
    }
  })

// Helper function to fetch all platform metrics at once
// Requires endpoints object with platform-specific endpoint paths
export async function fetchAllMetricoolMetrics(endpoints: {
  facebook: string
  instagram: string
  youtube: string
  web: string
}, options?: {
  userId?: string
  blogId?: string
  from?: string
  to?: string
  params?: Record<string, string>
}) {
  const platforms = ['facebook', 'instagram', 'youtube', 'web'] as const
  
  const results = await Promise.allSettled(
    platforms.map(platform => 
      fetchMetricoolMetrics({ 
        parsedInput: { 
          endpoint: endpoints[platform],
          userId: options?.userId,
          blogId: options?.blogId,
          from: options?.from,
          to: options?.to,
          params: options?.params,
        } 
      })
    )
  )

  const metrics: Record<string, any> = {}
  
  results.forEach((result, index) => {
    const platform = platforms[index]
    if (result.status === 'fulfilled' && result.value?.data?.success) {
      metrics[platform] = result.value.data.data
    } else {
      console.error(`[fetchAllMetricoolMetrics] Failed to fetch ${platform}:`, result)
      metrics[platform] = null
    }
  })

  return metrics
}

