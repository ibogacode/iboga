import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckBookingRequest {
  email?: string
  startDate?: string // Optional: check from this date forward
  getAllEvents?: boolean // If true, return all events regardless of email
}

// Get access token (same as email function, but needs Calendar scope)
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GMAIL_CLIENT_ID')
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET')
  const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken!,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

// Check if email has any upcoming events
async function checkCalendarEvents(accessToken: string, email: string, startDate?: string) {
  const timeMin = startDate || new Date().toISOString()
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ahead

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Calendar API error: ${error}`)
  }

  const data = await response.json()
  const events = data.items || []

  // Find events where the email is an attendee
  const matchingEvents = events.filter((event: any) => {
    const attendees = event.attendees || []
    return attendees.some((attendee: any) => 
      attendee.email?.toLowerCase() === email.toLowerCase()
    )
  })

  return {
    hasBooking: matchingEvents.length > 0,
    events: matchingEvents.map((event: any) => ({
      id: event.id,
      summary: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      status: event.status,
      attendeeStatus: event.attendees?.find((a: any) => 
        a.email?.toLowerCase() === email.toLowerCase()
      )?.responseStatus,
    })),
  }
}

// Get all calendar events (for scheduled patients count)
async function getAllCalendarEvents(accessToken: string, startDate?: string) {
  const timeMin = startDate || new Date().toISOString()
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ahead

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Calendar API error: ${error}`)
  }

  const data = await response.json()
  return data.items || []
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json() as CheckBookingRequest
    const { email, startDate, getAllEvents } = requestBody
    
    console.log('[check-calendar-events] Request body:', JSON.stringify(requestBody))
    console.log('[check-calendar-events] getAllEvents:', getAllEvents, 'type:', typeof getAllEvents)
    console.log('[check-calendar-events] email:', email)

    const accessToken = await getAccessToken()

    // If getAllEvents is true, return all events
    if (getAllEvents === true || getAllEvents === 'true') {
      console.log('[check-calendar-events] Getting all calendar events')
      const allEvents = await getAllCalendarEvents(accessToken, startDate)
      console.log('[check-calendar-events] Found', allEvents.length, 'events')
      return new Response(
        JSON.stringify({ success: true, data: { events: allEvents } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Otherwise, check for specific email
    if (!email) {
      console.log('[check-calendar-events] Email is required but not provided')
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required when getAllEvents is false' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await checkCalendarEvents(accessToken, email, startDate)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Calendar check error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

