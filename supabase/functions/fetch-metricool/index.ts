import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetricoolRequest {
  endpoint: string
  userId?: string
  blogId?: string
  params?: Record<string, string>
  from?: string
  to?: string
}

serve(async (req) => {
  // Log function invocation
  console.log('=== fetch-metricool Edge Function Invoked ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request - returning ok')
    return new Response('ok', { headers: corsHeaders })
  }

  // Allow anonymous access for this function
  try {
    console.log('Parsing request body...')
    const requestBody = await req.json()
    console.log('Request body received:', JSON.stringify(requestBody, null, 2))
    
    const { endpoint, userId, blogId, params = {}, from, to } = requestBody as MetricoolRequest

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'endpoint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get API token from environment
    const apiToken = Deno.env.get('METRICOOL_API_TOKEN')
    if (!apiToken) {
      throw new Error('METRICOOL_API_TOKEN not configured')
    }

    const defaultUserId = Deno.env.get('METRICOOL_USER_ID') || '3950725'
    const defaultBlogId = Deno.env.get('METRICOOL_BLOG_ID') || '5231058'

    const finalUserId = userId || defaultUserId
    const finalBlogId = blogId || defaultBlogId

    console.log('Calling Metricool API:', {
      endpoint,
      userId: finalUserId,
      blogId: finalBlogId,
      from,
      to,
      hasToken: !!apiToken
    })

    // Build URL with params
    let url = `https://app.metricool.com/api${endpoint}`
    
    // Build query parameters
    const queryParams = new URLSearchParams()
    
    // Always add userId and blogId
    queryParams.append('userId', finalUserId)
    queryParams.append('blogId', finalBlogId)
    
    // Add timezone (default to America/Indianapolis)
    queryParams.append('timezone', 'America/Indianapolis')
    
    // Add date range if provided
    if (from) queryParams.append('from', from)
    if (to) queryParams.append('to', to)
    
    // Add any additional params
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, value)
    })
    
    if (queryParams.toString()) {
      url = `${url}?${queryParams.toString()}`
    }

    console.log('Final URL:', url)

    // Make request to Metricool API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Mc-Auth': apiToken,
        'Content-Type': 'application/json',
      },
    })

    console.log('Metricool API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Metricool API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      
      return new Response(
        JSON.stringify({
          error: `Metricool API error: ${response.status} ${response.statusText}`,
          details: errorText,
          endpoint,
          status: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await response.json()
    console.log('Metricool API response data received')

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
