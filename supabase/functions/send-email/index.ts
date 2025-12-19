import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  body: string
}

// Get new access token using refresh token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GMAIL_CLIENT_ID')
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET')
  const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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

// Base64 URL encode for Gmail API
function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const base64 = btoa(String.fromCharCode(...data))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Send email via Gmail API
async function sendGmailEmail(accessToken: string, to: string, subject: string, body: string) {
  const fromEmail = Deno.env.get('GMAIL_FROM_EMAIL')

  const emailContent = [
    `From: Iboga Wellness Institute <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ].join('\r\n')

  const encodedEmail = base64UrlEncode(emailContent)

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gmail API error: ${error}`)
  }

  return await response.json()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, body } = await req.json() as EmailRequest

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get access token
    const accessToken = await getAccessToken()

    // Send email
    const result = await sendGmailEmail(accessToken, to, subject, body)

    console.log('Email sent successfully:', result.id)

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Email error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

