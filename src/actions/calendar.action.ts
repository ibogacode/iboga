'use server'

import { actionClient } from '@/lib/safe-action'
import { z } from 'zod'

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

