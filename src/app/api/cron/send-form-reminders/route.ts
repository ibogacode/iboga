import { NextRequest, NextResponse } from 'next/server'
import { sendFormReminders } from '@/actions/form-reminder.action'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  console.log('[Cron] Starting form reminder job (48-hour check)...')
  const startTime = Date.now()
  
  try {
    const result = await sendFormReminders()
    const duration = Date.now() - startTime
    
    if (result.success) {
      console.log(`[Cron] ✅ Form reminder job completed in ${duration}ms:`, result.data)
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        duration: `${duration}ms`
      })
    } else {
      console.error(`[Cron] ❌ Form reminder job failed after ${duration}ms:`, result.error)
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        duration: `${duration}ms`
      }, { status: 500 })
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Cron] ❌ Form reminder job error after ${duration}ms:`, error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    }, { status: 500 })
  }
}

