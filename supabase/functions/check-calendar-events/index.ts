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

    // ----- syncOnboardingConsults: match calendar attendees to patient_onboarding (consult_scheduled_at from Daisy/Contactus, pre_integration_scheduled_at from Ray) -----
    if (syncOnboardingConsults === true || String(syncOnboardingConsults) === 'true') {
      const contactusEmail = Deno.env.get('CONTACTUS_CALENDAR_EMAIL') || 'contactus@theibogainstitute.org'
      const daisyEmail = Deno.env.get('CONSULT_CALENDAR_EMAIL') || 'daisy@theibogainstitute.org'
      const rayEmail = Deno.env.get('PRE_INTEGRATION_CALENDAR_EMAIL') || 'ray@theibogainstitute.org'
      const consultCalendarEmails = [contactusEmail, daisyEmail]
      const rayCalendarEmail = rayEmail

      const consultAttendeeEmails = new Set<string>()
      const consultEmailToEventStartIso = new Map<string, string>()
      const rayAttendeeEmails = new Set<string>()
      const rayEmailToEventStartIso = new Map<string, string>()
      let totalEvents = 0

      function mergeConsultAttendees(emails: string[], emailToStart: Map<string, string>) {
        emails.forEach((e) => consultAttendeeEmails.add(e))
        emailToStart.forEach((startIso, email) => {
          const existing = consultEmailToEventStartIso.get(email)
          if (!existing || startIso < existing) consultEmailToEventStartIso.set(email, startIso)
        })
      }
      function mergeRayAttendees(emails: string[], emailToStart: Map<string, string>) {
        emails.forEach((e) => rayAttendeeEmails.add(e))
        emailToStart.forEach((startIso, email) => {
          const existing = rayEmailToEventStartIso.get(email)
          if (!existing || startIso < existing) rayEmailToEventStartIso.set(email, startIso)
        })
      }

      const nowIso = new Date().toISOString()
      if (isServiceAccountConfigured()) {
        for (const calendarOwnerEmail of consultCalendarEmails) {
          try {
            const accessToken = await getAccessTokenForCalendarUser(calendarOwnerEmail)
            const events = await getAllCalendarEvents(accessToken, nowIso, undefined, 'primary')
            const futureEvents = filterFutureNonCancelledEvents(events)
            totalEvents += futureEvents.length
            const { emails, emailToStartIso } = getAttendeeEmailsWithEventStarts(futureEvents, calendarOwnerEmail)
            mergeConsultAttendees(emails, emailToStartIso)
            console.log('[check-calendar-events] Consult calendar', calendarOwnerEmail, 'futureEvents=', futureEvents.length, 'attendees=', emails.length)
          } catch (err) {
            console.error('[check-calendar-events] Failed to fetch calendar for', calendarOwnerEmail, err)
          }
        }
        try {
          const accessToken = await getAccessTokenForCalendarUser(rayCalendarEmail)
          const events = await getAllCalendarEvents(accessToken, nowIso, undefined, 'primary')
          const futureEvents = filterFutureNonCancelledEvents(events)
          totalEvents += futureEvents.length
          const { emails, emailToStartIso } = getAttendeeEmailsWithEventStarts(futureEvents, rayCalendarEmail)
          mergeRayAttendees(emails, emailToStartIso)
          console.log('[check-calendar-events] Ray calendar', rayCalendarEmail, 'futureEvents=', futureEvents.length, 'attendees=', emails.length)
        } catch (err) {
          console.error('[check-calendar-events] Failed to fetch Ray calendar for', rayCalendarEmail, err)
        }
      } else {
        const accessToken = await getAccessToken()
        const events = await getAllCalendarEvents(accessToken, nowIso, undefined, 'primary')
        const futureEvents = filterFutureNonCancelledEvents(events)
        totalEvents = futureEvents.length
        const { emails, emailToStartIso } = getAttendeeEmailsWithEventStarts(futureEvents, contactusEmail)
        mergeConsultAttendees(emails, emailToStartIso)
        console.log('[check-calendar-events] Single calendar (refresh token) futureEvents=', futureEvents.length)
      }

      const consultAttendeeNormalizedSet = new Set(Array.from(consultAttendeeEmails).map((e) => e.trim().toLowerCase()).filter(Boolean))
      const rayAttendeeNormalizedSet = new Set(Array.from(rayAttendeeEmails).map((e) => e.trim().toLowerCase()).filter(Boolean))
      console.log('[check-calendar-events] Sync: totalEvents=', totalEvents, 'consultAttendees=', consultAttendeeEmails.size, 'rayAttendees=', rayAttendeeEmails.size)

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
      let updatedConsultCount = 0
      let clearedConsultCount = 0
      let updatedRayCount = 0
      let clearedRayCount = 0
      const matchReasons: string[] = []

      // --- Consult (Daisy/Contactus) -> consult_scheduled_at ---
      const { data: eligibleConsultRows, error: fetchConsultError } = await supabase
        .from('patient_onboarding')
        .select('id, email, consult_scheduled_at')
        .is('consult_scheduled_at', null)
        .in('status', ['in_progress', 'completed'])

      if (!fetchConsultError && eligibleConsultRows?.length) {
        for (const row of eligibleConsultRows) {
          const normalized = (row.email ?? '').trim().toLowerCase()
          if (normalized && consultAttendeeNormalizedSet.has(normalized)) {
            const eventStartIso = consultEmailToEventStartIso.get(normalized) ?? fallbackNow
            const { error: updateError } = await supabase
              .from('patient_onboarding')
              .update({ consult_scheduled_at: eventStartIso })
              .eq('id', row.id)
            if (!updateError) updatedConsultCount += 1
          }
        }
      }
      const { data: rowsWithConsultScheduled } = await supabase
        .from('patient_onboarding')
        .select('id, email')
        .not('consult_scheduled_at', 'is', null)
        .in('status', ['in_progress', 'completed'])
      if (rowsWithConsultScheduled?.length) {
        for (const row of rowsWithConsultScheduled) {
          const normalized = (row.email ?? '').trim().toLowerCase()
          if (normalized && !consultAttendeeNormalizedSet.has(normalized)) {
            const { error: clearError } = await supabase
              .from('patient_onboarding')
              .update({ consult_scheduled_at: null })
              .eq('id', row.id)
            if (!clearError) clearedConsultCount += 1
          }
        }
      }

      // --- Ray (pre-integration) -> pre_integration_scheduled_at ---
      // Include moved_to_management so clients who booked Ray after moving still get the date set
      const { data: eligibleRayRows, error: fetchRayError } = await supabase
        .from('patient_onboarding')
        .select('id, email, pre_integration_scheduled_at')
        .is('pre_integration_scheduled_at', null)
        .in('status', ['in_progress', 'completed', 'moved_to_management'])

      if (!fetchRayError && eligibleRayRows?.length) {
        for (const row of eligibleRayRows) {
          const normalized = (row.email ?? '').trim().toLowerCase()
          if (normalized && rayAttendeeNormalizedSet.has(normalized)) {
            const eventStartIso = rayEmailToEventStartIso.get(normalized) ?? fallbackNow
            const { error: updateError } = await supabase
              .from('patient_onboarding')
              .update({ pre_integration_scheduled_at: eventStartIso })
              .eq('id', row.id)
            if (!updateError) updatedRayCount += 1
          }
        }
      }
      const { data: rowsWithRayScheduled } = await supabase
        .from('patient_onboarding')
        .select('id, email')
        .not('pre_integration_scheduled_at', 'is', null)
        .in('status', ['in_progress', 'completed', 'moved_to_management'])
      if (rowsWithRayScheduled?.length) {
        for (const row of rowsWithRayScheduled) {
          const normalized = (row.email ?? '').trim().toLowerCase()
          if (normalized && !rayAttendeeNormalizedSet.has(normalized)) {
            const { error: clearError } = await supabase
              .from('patient_onboarding')
              .update({ pre_integration_scheduled_at: null })
              .eq('id', row.id)
            if (!clearError) clearedRayCount += 1
          }
        }
      }

      if (updatedConsultCount > 0 || updatedRayCount > 0) {
        console.log('[check-calendar-events] consult_scheduled_at:', updatedConsultCount, 'updated,', clearedConsultCount, 'cleared; pre_integration_scheduled_at:', updatedRayCount, 'updated,', clearedRayCount, 'cleared')
      }

      const rayAttendeesCount = rayAttendeeEmails.size
      const eligibleRayRowCount = eligibleRayRows?.length ?? 0
      if (rayAttendeesCount > 0 && updatedRayCount === 0 && eligibleRayRowCount > 0) {
        matchReasons.push(
          'Ray calendar had ' + rayAttendeesCount + ' attendee(s) but no onboarding row matched. Ensure patient_onboarding.email (for status in_progress/completed) exactly matches the email used to book the pre-integration session with Ray (case and spaces do not matter).'
        )
      }
      if (rayAttendeesCount > 0 && updatedRayCount === 0 && eligibleRayRowCount === 0) {
        matchReasons.push(
          'Ray calendar had ' + rayAttendeesCount + ' attendee(s) but no onboarding row (in_progress, completed, or moved_to_management) with pre_integration_scheduled_at empty. Add the client to onboarding or check status.'
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            syncOnboardingConsults: true,
            calendarsChecked: consultCalendarEmails.length + 1,
            eventsCount: totalEvents,
            consultUpdatedCount: updatedConsultCount,
            consultClearedCount: clearedConsultCount,
            rayAttendeesCount,
            rayUpdatedCount: updatedRayCount,
            rayClearedCount: clearedRayCount,
            eligibleRayRowCount,
            updatedOnboardingCount: updatedConsultCount + updatedRayCount,
            clearedOnboardingCount: clearedConsultCount + clearedRayCount,
            matchReasons: matchReasons.length ? matchReasons : undefined,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ----- getAllEvents: optionally use contactus, Clinical Director (Daisy), or Ray calendar (for consult-scheduling page dropdown) -----
    const useConsultCalendar = (requestBody as { useConsultCalendar?: boolean }).useConsultCalendar === true
    const calendarUser = (requestBody as { calendarUser?: string }).calendarUser as 'contactus' | 'daisy' | 'ray' | undefined
    if (getAllEvents === true || String(getAllEvents) === 'true') {
      let accessToken: string
      if (useConsultCalendar && isServiceAccountConfigured()) {
        const contactusEmail = Deno.env.get('CONTACTUS_CALENDAR_EMAIL') || 'contactus@theibogainstitute.org'
        const daisyEmail = Deno.env.get('CONSULT_CALENDAR_EMAIL') || 'daisy@theibogainstitute.org'
        const rayEmail = Deno.env.get('PRE_INTEGRATION_CALENDAR_EMAIL') || 'ray@theibogainstitute.org'
        const calendarOwnerEmail = calendarUser === 'contactus' ? contactusEmail : calendarUser === 'ray' ? rayEmail : daisyEmail
        accessToken = await getAccessTokenForCalendarUser(calendarOwnerEmail)
        console.log('[check-calendar-events] Getting all events from calendar:', calendarUser ?? 'daisy', calendarOwnerEmail)
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

