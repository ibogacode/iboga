import { NextRequest, NextResponse } from 'next/server'
import { sendPatientLoginReminders } from '@/actions/patient-reminder.action'

/**
 * API route for cron job to send patient login reminders
 * 
 * This endpoint should be called daily by a scheduled job (cron, Vercel Cron, etc.)
 * 
 * Security: Optionally protect with CRON_SECRET environment variable
 * 
 * Usage:
 * - Vercel Cron: Configure in vercel.json
 * - External Cron: Call this endpoint with GET request
 * - Manual: Call this endpoint directly for testing
 */
export async function GET(request: NextRequest) {
  // Optional: Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  console.log('[Cron] Starting patient login reminder job...')
  const startTime = Date.now()
  
  try {
    const result = await sendPatientLoginReminders()
    const duration = Date.now() - startTime
    
    if (result.success) {
      console.log(`[Cron] ✅ Reminder job completed in ${duration}ms:`, result.data)
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        duration: `${duration}ms`
      })
    } else {
      console.error(`[Cron] ❌ Reminder job failed after ${duration}ms:`, result.error)
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        duration: `${duration}ms`
      }, { status: 500 })
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Cron] ❌ Reminder job error after ${duration}ms:`, error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    }, { status: 500 })
  }
}

