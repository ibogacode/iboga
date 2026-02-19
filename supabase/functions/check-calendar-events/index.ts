import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SignJWT } from 'npm:jose@5.9.6'
import { importPKCS8 } from 'npm:jose@5.9.6'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CALENDAR_READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

interface CheckBookingRequest {
  email?: string
  startDate?: string // Optional: check from this date forward
  getAllEvents?: boolean // If true, return all events regardless of email
  /** If true, fetch events from consult calendar, match attendee emails to patient_onboarding, and set consult_scheduled_at. */
  syncOnboardingConsults?: boolean
}

function isServiceAccountConfigured(): boolean {
  return !!(Deno.env.get('GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL') && Deno.env.get('GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY'))
}

/** Get access token for a user's calendar via domain-wide delegation (Calendar scope). */
async function getAccessTokenForCalendarUser(userEmail: string): Promise<string> {
  const clientEmail = Deno.env.get('GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL')
  const privateKeyPem = Deno.env.get('GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY')
  if (!clientEmail || !privateKeyPem) {
    throw new Error('GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL and GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY must be set for calendar impersonation')
  }
  const pem = privateKeyPem.replace(/\\n/g, '\n')
  const privateKey = await importPKCS8(pem, 'RS256')
  const jwt = await new SignJWT({ scope: CALENDAR_READ_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(userEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Calendar service account token failed: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

// Get access token (refresh token; no Calendar impersonation)
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

function calendarEventsUrl(calendarId: string, timeMin: string, timeMax: string, maxResults: number) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', String(maxResults))
  return url.toString()
}

// Check if email has any upcoming events
async function checkCalendarEvents(accessToken: string, email: string, startDate?: string, calendarId = 'primary') {
  const timeMin = startDate || new Date().toISOString()
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ahead

  const url = calendarEventsUrl(calendarId, timeMin, timeMax, 250)

  const response = await fetch(url, {
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

// Get all calendar events (for scheduled patients count and consult scheduling)
async function getAllCalendarEvents(
  accessToken: string,
  startDate?: string,
  endDate?: string,
  calendarId = 'primary'
) {
  const timeMin = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
  const timeMax = endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ahead

  const url = calendarEventsUrl(calendarId, timeMin, timeMax, 2500)

  const response = await fetch(url, {
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

/** Collect all attendee emails from events (excluding the calendar owner/organizer). */
function getAttendeeEmailsFromEvents(events: any[], organizerEmail?: string): string[] {
  const set = new Set<string>()
  const organizer = organizerEmail?.toLowerCase()
  for (const event of events) {
    const attendees = event.attendees || []
    for (const a of attendees) {
      const email = a.email?.trim()?.toLowerCase()
      if (email && email !== organizer) set.add(email)
    }
  }
  return Array.from(set)
}

/** Get event start as ISO string (dateTime or date). */
function getEventStartIso(event: any): string | null {
  const start = event?.start
  if (!start) return null
  const dt = start.dateTime || start.date
  if (typeof dt === 'string') return dt
  return null
}

/** Filter to future, non-cancelled events (for consult sync: only "scheduled" consults). */
function filterFutureNonCancelledEvents(events: any[]): any[] {
  const nowIso = new Date().toISOString()
  return events.filter((event: any) => {
    if (event.status === 'cancelled') return false
    const startIso = getEventStartIso(event)
    return startIso != null && startIso >= nowIso
  })
}

/** Collect attendee emails and map each (normalized) to earliest event start time. */
function getAttendeeEmailsWithEventStarts(
  events: any[],
  organizerEmail?: string
): { emails: string[]; emailToStartIso: Map<string, string> } {
  const set = new Set<string>()
  const emailToStartIso = new Map<string, string>()
  const organizer = organizerEmail?.toLowerCase()
  for (const event of events) {
    const startIso = getEventStartIso(event)
    const attendees = event.attendees || []
    for (const a of attendees) {
      const email = a.email?.trim()?.toLowerCase()
      if (email && email !== organizer) {
        set.add(email)
        if (startIso) {
          const existing = emailToStartIso.get(email)
          if (!existing || startIso < existing) emailToStartIso.set(email, startIso)
        }
      }
    }
  }
  return { emails: Array.from(set), emailToStartIso }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json() as CheckBookingRequest
    const { email, startDate, getAllEvents, syncOnboardingConsults } = requestBody

    console.log('[check-calendar-events] Request:', { getAllEvents, syncOnboardingConsults, email: email ? '***' : undefined })

    // ----- syncOnboardingConsults: match calendar attendees to patient_onboarding and set consult_scheduled_at -----
    // Check 2 calendars: contactus and Clinical Director (both can have booked consults)
    if (syncOnboardingConsults === true || String(syncOnboardingConsults) === 'true') {
      const contactusEmail = Deno.env.get('CONTACTUS_CALENDAR_EMAIL') || 'contactus@theibogainstitute.org'
      const daisyEmail = Deno.env.get('CONSULT_CALENDAR_EMAIL') || 'daisy@theibogainstitute.org'
      const calendarEmailsToCheck = [contactusEmail, daisyEmail]

      const allAttendeeEmails = new Set<string>()
      const emailToEventStartIso = new Map<string, string>()
      let totalEvents = 0

      function mergeAttendeesWithStarts(emails: string[], emailToStart: Map<string, string>) {
        emails.forEach((e) => allAttendeeEmails.add(e))
        emailToStart.forEach((startIso, email) => {
          const existing = emailToEventStartIso.get(email)
          if (!existing || startIso < existing) emailToEventStartIso.set(email, startIso)
        })
      }

      const nowIso = new Date().toISOString()
      if (isServiceAccountConfigured()) {
        for (const calendarOwnerEmail of calendarEmailsToCheck) {
          try {
            const accessToken = await getAccessTokenForCalendarUser(calendarOwnerEmail)
            const events = await getAllCalendarEvents(accessToken, nowIso, undefined, 'primary')
            const futureEvents = filterFutureNonCancelledEvents(events)
            totalEvents += futureEvents.length
            const { emails, emailToStartIso } = getAttendeeEmailsWithEventStarts(futureEvents, calendarOwnerEmail)
            mergeAttendeesWithStarts(emails, emailToStartIso)
            console.log('[check-calendar-events] Calendar', calendarOwnerEmail, 'futureEvents=', futureEvents.length, 'attendees=', emails.length)
          } catch (err) {
            console.error('[check-calendar-events] Failed to fetch calendar for', calendarOwnerEmail, err)
          }
        }
      } else {
        const accessToken = await getAccessToken()
        const events = await getAllCalendarEvents(accessToken, nowIso, undefined, 'primary')
        const futureEvents = filterFutureNonCancelledEvents(events)
        totalEvents = futureEvents.length
        const { emails, emailToStartIso } = getAttendeeEmailsWithEventStarts(futureEvents, contactusEmail)
        mergeAttendeesWithStarts(emails, emailToStartIso)
        console.log('[check-calendar-events] Single calendar (refresh token) futureEvents=', futureEvents.length)
      }

      const attendeeEmails = Array.from(allAttendeeEmails)
      const attendeeNormalizedSet = new Set(attendeeEmails.map((e) => e.trim().toLowerCase()).filter(Boolean))
      const maskedEmails = attendeeEmails.map((e) => {
        const [local, domain] = e.split('@')
        const mask = local.length <= 2 ? '**' : local.slice(0, 2) + '***'
        return `${mask}@${domain || ''}`
      })
      console.log('[check-calendar-events] Sync consults: totalEvents=', totalEvents, 'attendeeEmails=', attendeeEmails.length, 'masked=', maskedEmails.join(', '))

      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for sync' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const fallbackNow = new Date().toISOString()
      let updatedCount = 0
      let clearedCount = 0
      const matchReasons: string[] = []

      // Fetch all onboarding rows that are eligible for consult_scheduled_at (null and in_progress/completed)
      const { data: eligibleRows, error: fetchError } = await supabase
        .from('patient_onboarding')
        .select('id, email, status, consult_scheduled_at')
        .is('consult_scheduled_at', null)
        .in('status', ['in_progress', 'completed'])

      if (fetchError) {
        console.error('[check-calendar-events] Failed to fetch eligible onboarding rows:', fetchError)
        return new Response(
          JSON.stringify({ success: false, error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updates: { id: string; consult_scheduled_at: string }[] = []
      for (const row of eligibleRows || []) {
        const normalized = (row.email ?? '').trim().toLowerCase()
        if (normalized && attendeeNormalizedSet.has(normalized)) {
          const eventStartIso = emailToEventStartIso.get(normalized) ?? fallbackNow
          updates.push({ id: row.id, consult_scheduled_at: eventStartIso })
        }
      }

      for (const { id, consult_scheduled_at } of updates) {
        const { error: updateError } = await supabase
          .from('patient_onboarding')
          .update({ consult_scheduled_at })
          .eq('id', id)

        if (updateError) {
          console.error('[check-calendar-events] Update error for id', id, updateError)
          matchReasons.push(`update failed for id ${id}: ${updateError.message}`)
        } else {
          updatedCount += 1
        }
      }
      if (updatedCount > 0) {
        console.log('[check-calendar-events] Marked consult_scheduled_at for', updatedCount, 'rows (using event start times)')
      }

      // Clear consult_scheduled_at for rows that have it set but no longer have a future consult (cancelled/removed)
      const { data: rowsWithScheduled, error: fetchScheduledError } = await supabase
        .from('patient_onboarding')
        .select('id, email')
        .not('consult_scheduled_at', 'is', null)
        .in('status', ['in_progress', 'completed'])

      if (!fetchScheduledError && rowsWithScheduled?.length) {
        for (const row of rowsWithScheduled) {
          const normalized = (row.email ?? '').trim().toLowerCase()
          if (normalized && !attendeeNormalizedSet.has(normalized)) {
            const { error: clearError } = await supabase
              .from('patient_onboarding')
              .update({ consult_scheduled_at: null })
              .eq('id', row.id)
            if (clearError) {
              console.error('[check-calendar-events] Clear consult_scheduled_at error for id', row.id, clearError)
            } else {
              clearedCount += 1
            }
          }
        }
        if (clearedCount > 0) {
          console.log('[check-calendar-events] Cleared consult_scheduled_at for', clearedCount, 'rows (no future consult)')
        }
      }

      if (attendeeEmails.length > 0 && updatedCount === 0 && updates.length === 0) {
        matchReasons.push(
          `No onboarding row matched any of ${attendeeEmails.length} calendar attendee(s). Check that patient_onboarding.email matches the email used to book (trim/lower).`
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            syncOnboardingConsults: true,
            calendarsChecked: calendarEmailsToCheck.length,
            eventsCount: totalEvents,
            attendeeEmailsCount: attendeeEmails.length,
            updatedOnboardingCount: updatedCount,
            clearedOnboardingCount: clearedCount,
            matchReasons: matchReasons.length ? matchReasons : undefined,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ----- getAllEvents: optionally use contactus or Clinical Director calendar (for consult-scheduling page dropdown) -----
    const useConsultCalendar = (requestBody as { useConsultCalendar?: boolean }).useConsultCalendar === true
    const calendarUser = (requestBody as { calendarUser?: string }).calendarUser as 'contactus' | 'daisy' | undefined
    if (getAllEvents === true || String(getAllEvents) === 'true') {
      let accessToken: string
      if (useConsultCalendar && isServiceAccountConfigured()) {
        const which = calendarUser === 'contactus' ? 'contactus' : 'daisy'
        const contactusEmail = Deno.env.get('CONTACTUS_CALENDAR_EMAIL') || 'contactus@theibogainstitute.org'
        const daisyEmail = Deno.env.get('CONSULT_CALENDAR_EMAIL') || 'daisy@theibogainstitute.org'
        const calendarOwnerEmail = which === 'contactus' ? contactusEmail : daisyEmail
        accessToken = await getAccessTokenForCalendarUser(calendarOwnerEmail)
        console.log('[check-calendar-events] Getting all events from calendar:', which, calendarOwnerEmail)
      } else {
        accessToken = await getAccessToken()
        console.log('[check-calendar-events] Getting all calendar events (primary)')
      }
      const allEvents = await getAllCalendarEvents(accessToken, startDate, undefined, 'primary')
      console.log('[check-calendar-events] Found', allEvents.length, 'events')
      return new Response(
        JSON.stringify({ success: true, data: { events: allEvents } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ----- single-email check -----
    const accessToken = await getAccessToken()

    if (!email) {
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

