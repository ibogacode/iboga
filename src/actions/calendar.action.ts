'use server'

import { authActionClient } from '@/lib/safe-action'
import { actionClient } from '@/lib/safe-action'
import { z } from 'zod'

function isAdminRole(role: string): boolean {
  return ['owner', 'admin', 'manager'].includes(role)
}

const checkCalendarBookingSchema = z.object({
  email: z.string().email(),
})

export const checkCalendarBooking = actionClient
  .schema(checkCalendarBookingSchema)
  .action(async ({ parsedInput }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    try {
      const url = `${supabaseUrl}/functions/v1/check-calendar-events`
      console.log('Calling calendar edge function:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: parsedInput.email,
        }),
      })

      const responseText = await response.text()
      console.log('Calendar edge function response:', response.status, responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        return { success: false, error: `Invalid response: ${responseText}` }
      }

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to check calendar' }
      }

      return { success: true, data: result.data }
    } catch (error) {
      console.error('Calendar check error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to check calendar' }
    }
  })

// Get all calendar events for consult scheduling (optionally by calendar: contactus or clinical director)
export const getAllCalendarEvents = actionClient
  .schema(z.object({
    calendarUser: z.enum(['contactus', 'daisy']).optional(),
  }))
  .action(async ({ parsedInput }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const calendarUser = parsedInput.calendarUser ?? 'daisy'

    try {
      const url = `${supabaseUrl}/functions/v1/check-calendar-events`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          getAllEvents: true,
          useConsultCalendar: true,
          calendarUser,
        }),
      })

      const responseText = await response.text()

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        return { success: false, error: `Invalid response: ${responseText}` }
      }

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to get calendar events' }
      }

      return { success: true, data: result.data?.events || [] }
    } catch (error) {
      console.error('Get all calendar events error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get calendar events' }
    }
  })

/** Admin only: sync Google Calendar (Clinical Director consult) attendees to patient_onboarding.consult_scheduled_at. */
export const syncOnboardingConsultsFromCalendar = authActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    if (!ctx.user?.role || !isAdminRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin access required' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    try {
      const url = `${supabaseUrl}/functions/v1/check-calendar-events`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ syncOnboardingConsults: true }),
      })

      const responseText = await response.text()
      let result: { success?: boolean; error?: string; data?: Record<string, unknown> }
      try {
        result = JSON.parse(responseText)
      } catch {
        return { success: false, error: `Invalid response: ${responseText}` }
      }

      if (!result.success) {
        return { success: false, error: result.error || 'Sync failed' }
      }

      return {
        success: true,
        data: result.data as {
          eventsCount: number
          attendeeEmailsCount: number
          updatedOnboardingCount: number
        },
      }
    } catch (error) {
      console.error('Sync onboarding consults error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Sync failed' }
    }
  })

