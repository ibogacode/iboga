import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const DEFAULT_CALENDAR_LINK = 'https://calendar.app.google/jkPEGqcQcf82W6aMA'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  const { searchParams } = new URL(request.url)
  const redirectUrl = searchParams.get('redirect')
  
  if (!token) {
    // Fallback to default calendar link if no redirect URL
    return NextResponse.redirect(redirectUrl || DEFAULT_CALENDAR_LINK)
  }

  const supabase = createAdminClient()
  
  try {
    // Find the form submission by tracking token
    const { data, error } = await supabase
      .from('patient_intake_forms')
      .select('id, calendar_link_clicked_at')
      .eq('tracking_token', token)
      .single()

    if (error || !data) {
      // Token not found, but still redirect to calendar (with prepopulated data if available)
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Tracking token not found:', token)
      }
      return NextResponse.redirect(redirectUrl || DEFAULT_CALENDAR_LINK)
    }

    // If not already clicked, record the click
    if (!data.calendar_link_clicked_at) {
      const { error: updateError } = await supabase
        .from('patient_intake_forms')
        .update({ calendar_link_clicked_at: new Date().toISOString() })
        .eq('id', data.id)
      
      if (updateError) {
        console.error('Error updating click timestamp:', updateError)
      } else if (process.env.NODE_ENV === 'development') {
        console.log('✅ Calendar link click recorded for form:', data.id)
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ Link already clicked previously for form:', data.id)
    }

    // Redirect to prepopulated calendar link (or default if not provided)
    return NextResponse.redirect(redirectUrl || DEFAULT_CALENDAR_LINK)
  } catch (error) {
    console.error('Error tracking calendar click:', error)
    // On error, still redirect to calendar
    return NextResponse.redirect(redirectUrl || DEFAULT_CALENDAR_LINK)
  }
}

