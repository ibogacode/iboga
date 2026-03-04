import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SignJWT } from 'npm:jose@5.9.6'
import { importPKCS8 } from 'npm:jose@5.9.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailTemplateRequest {
  type: string
  // Common fields
  to: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  role?: string
  formLink?: string
  formName?: string
  patientFirstName?: string
  patientLastName?: string
  patientEmail?: string
  fillerEmail?: string
  fillerFirstName?: string
  fillerLastName?: string
  filledBy?: 'self' | 'someone_else'
  formType?: 'service_agreement' | 'ibogaine_consent' | 'medical_history' | 'intake'
  intakeFormId?: string
  partialFormId?: string
  mode?: 'minimal' | 'partial'
  recipientEmail?: string
  recipientName?: string
  schedulingLink?: string
  onboardingId?: string
  ibogaineFormLink?: string
  // Add other fields as needed
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

// Check if service account auth is configured (then we impersonate users; no refresh token needed)
function isServiceAccountConfigured(): boolean {
  return !!(Deno.env.get('GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL') && Deno.env.get('GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY'))
}

// Get access token via service account JWT (domain-wide delegation: impersonate a user in the domain)
async function getAccessTokenForUser(impersonateUserEmail: string): Promise<string> {
  const clientEmail = Deno.env.get('GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL')
  const privateKeyPem = Deno.env.get('GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY')
  if (!clientEmail || !privateKeyPem) {
    throw new Error('GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL and GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY must be set')
  }
  // Env may store newlines as literal \n
  const pem = privateKeyPem.replace(/\\n/g, '\n')
  const privateKey = await importPKCS8(pem, 'RS256')
  const gmailSendScope = 'https://www.googleapis.com/auth/gmail.send'
  const jwt = await new SignJWT({ scope: gmailSendScope })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(impersonateUserEmail)
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
    throw new Error(`Service account token exchange failed: ${JSON.stringify(data)}`)
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

// Default "from" for all emails. Override per type in FROM_EMAIL_BY_TYPE when needed.
const DEFAULT_FROM_EMAIL = 'contactus@theibogainstitute.org'

// Only these types use a different from address; all others use DEFAULT_FROM_EMAIL (contactus).
// onboarding_forms = "Complete your 3 forms" email is sent from Clinical Director (Daisy).
// pre_integration_scheduling = "Schedule pre-integration with Ray" email is sent from Ray (psychotherapist).
const FROM_EMAIL_BY_TYPE: Partial<Record<string, string>> = {
  service_agreement_confirmation: 'guy@theibogainstitute.org',
  onboarding_forms: 'daisy@theibogainstitute.org',
  pre_integration_scheduling: 'ray@theibogainstitute.org',
}

// Send email via Gmail API (fromEmailOverride: which address to send from)
async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  fromEmailOverride?: string
) {
  const fromEmail = fromEmailOverride ?? Deno.env.get('GMAIL_FROM_EMAIL')

  const emailContent = [
    `From: The Iboga Wellness Institute <${fromEmail}>`,
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

// Get base URL
function getBaseUrl(): string {
  return Deno.env.get('PORTAL_URL') || 'https://portal.theibogainstitute.org'
}

// Common email styles
const commonStyles = `
  body { 
    font-family: 'Helvetica Neue', Arial, sans-serif; 
    line-height: 1.8; 
    color: #333; 
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
  }
  .container { 
    max-width: 600px; 
    margin: 0 auto; 
    background: white;
  }
  .header { 
    background: #5D7A5F; 
    color: white; 
    padding: 40px 30px; 
    text-align: center; 
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 400;
  }
  .content { 
    padding: 40px 30px; 
    background: white; 
  }
  .content h2 {
    color: #5D7A5F;
    font-size: 24px;
    margin-top: 0;
  }
  .content p {
    font-size: 16px;
    color: #555;
    margin-bottom: 20px;
  }
  .footer { 
    padding: 30px; 
    text-align: center; 
    font-size: 14px; 
    color: #888;
    background: #f9f9f9;
    border-top: 1px solid #eee;
  }
  .footer a {
    color: #5D7A5F;
    text-decoration: none;
  }
`

// Email template generators
function generateInquiryConfirmationEmail(firstName: string): { subject: string; body: string } {
  return {
    subject: 'Thank you for your inquiry | The Iboga Wellness Institute',
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .content { padding: 20px; background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>The Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Thank you, ${firstName}!</h2>
            <p>We have received your inquiry and are excited to connect with you.</p>
            <p>Our team will review your information and reach out within 24-48 hours to discuss the next steps in your wellness journey.</p>
            <p>In the meantime, if you have any questions, feel free to reply to this email or call us at <strong>+1 (800) 604-7294</strong>.</p>
            <p>Warm regards,<br>The Iboga Wellness Institute</p>
          </div>
          <div class="footer">
            <p>The Iboga Wellness Institute | Cozumel, Mexico</p>
            <p>https://theibogainstitute.org</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

function generateEmployeeWelcomeEmail(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
  role: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const loginUrl = `${baseUrl}/login`
  const roleDisplayName = role.charAt(0).toUpperCase() + role.slice(1)
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'there'

  // Same design as confirmation, Daisy and Ray emails: Instrument Serif, Inter, banner, CTA box, footer
  const body = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome to the Portal | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Welcome to the Portal</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#141414;font-weight:500">Your account has been created for The Iboga Wellness Institute portal. You can now access the system with your role as <strong>${roleDisplayName}</strong>.</p>
<table role="presentation" width="100%"><tr><td style="padding:24px 0"><table role="presentation" width="100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #eeedff">&nbsp;</td></tr></table></td></tr></table>
<p style="margin:0 0 10px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Your login details</p>
<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top" style="padding:0 0 12px"><p style="margin:0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif"><strong>Email:</strong> ${email}</p><p style="margin:8px 0 0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif"><strong>Password:</strong> ${password}</p></td></tr>
<tr><td align="center" valign="top" style="padding:12px 0 0;text-align:center"><a href="${loginUrl}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Login to Portal</a></td></tr>
<tr><td align="left" valign="top" style="padding:12px 0 0"><p style="margin:0;font-size:14px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">For your security, please change your password after your first login.</p></td></tr>
</table></td></tr></table>
</td></tr></table>
<p style="margin:0 0 20px;font-size:16px;line-height:150%;color:#535065">If you have any questions or need assistance, please contact your administrator.</p>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">Reach out to your administrator or the team for support.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:contactus@theibogainstitute.org" style="color:inherit;text-decoration:none">contactus@theibogainstitute.org</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">We're glad to have you on the team.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Welcome aboard,<br><strong>The Iboga Wellness Institute Team</strong></p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`

  return {
    subject: 'Welcome to The Iboga Wellness Institute - Your Portal Access',
    body,
  }
}

function generatePatientLoginReminderEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  password: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const loginUrl = `${baseUrl}/login`
  const forgotPasswordUrl = `${baseUrl}/forgot-password`
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'there'

  const body = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reminder: Login to Your Portal | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Reminder: Login to Your Portal</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#141414;font-weight:500">We noticed you haven't logged into your Client portal yet or haven't changed your temporary password. Please complete this important step to access your account and complete your tasks.</p>
<table role="presentation" width="100%"><tr><td style="padding:24px 0"><table role="presentation" width="100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #eeedff">&nbsp;</td></tr></table></td></tr></table>
<p style="margin:0 0 10px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">What to do now</p>
<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top" style="padding:0 0 12px"><p style="margin:0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif"><strong>Email:</strong> ${patientEmail}</p><p style="margin:8px 0 0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif"><strong>Temporary Password:</strong> ${password}</p></td></tr>
<tr><td align="center" valign="top" style="padding:12px 0;text-align:center"><a href="${loginUrl}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Login to Portal</a></td></tr>
<tr><td align="left" valign="top" style="padding:12px 0 0"><p style="margin:0;font-size:14px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">For your security, change your password after first login (Profile → Security or you'll be prompted).</p></td></tr>
<tr><td align="center" valign="top" style="padding:8px 0 0"><p style="margin:0;font-size:14px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif"><a href="${forgotPasswordUrl}" style="color:#6e7a46;text-decoration:underline">Forgot your password? Reset it here</a></p></td></tr>
</table></td></tr></table>
</td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">Questions? Reply to this email or reach us directly.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:contactus@theibogainstitute.org" style="color:inherit;text-decoration:none">contactus@theibogainstitute.org</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">We look forward to helping you on your wellness journey.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`

  return {
    subject: 'Reminder: Please Login and Change Your Password | The Iboga Wellness Institute',
    body,
  }
}

function generateFillerLoginReminderEmail(
  fillerEmail: string,
  fillerFirstName: string,
  fillerLastName: string,
  patientFirstName: string,
  patientLastName: string,
  patientEmail: string,
  patientPassword: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const loginUrl = `${baseUrl}/login`

  return {
    subject: `Reminder: Help ${patientFirstName} ${patientLastName} Complete Portal Setup | The Iboga Wellness Institute`,
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .reminder-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
          }
          .credentials-box {
            background: #f9f9f9;
            border: 2px solid #5D7A5F;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
          }
          .cta-button {
            display: inline-block;
            background: #5D7A5F;
            color: white !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            margin: 20px 0;
          }
          .cta-container {
            text-align: center;
            margin: 30px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>The Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Reminder: Help ${patientFirstName} Complete Portal Setup, ${fillerFirstName}!</h2>
            
            <div class="reminder-box">
              <p><strong>⏰ Action Required</strong></p>
              <p>You previously filled out the application form for <strong>${patientFirstName} ${patientLastName}</strong>. They haven't logged into their Client portal yet. Please help them complete this important step.</p>
            </div>
            
            <div class="credentials-box">
              <p><strong>Client Email:</strong> ${patientEmail}</p>
              <p><strong>Temporary Password:</strong> ${patientPassword}</p>
            </div>
            
            <p>Please share these login credentials with ${patientFirstName} so they can:</p>
            <ol style="color: #555; line-height: 2;">
              <li>Login to their Client portal</li>
              <li>Change their password</li>
              <li>Complete their required tasks</li>
            </ol>
            
            <div class="cta-container">
              <a href="${loginUrl}" class="cta-button">Go to Login Page</a>
            </div>
            
            <p>If you have any questions, please contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            
            <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
          </div>
          <div class="footer">
            <p>The Iboga Wellness Institute | Cozumel, Mexico</p>
            <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

function generateFormActivationEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  formType: string,
  formName: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const formLink = `${baseUrl}/patient/tasks`
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'there'

  const body = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your ${formName} Form is Now Available | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Your ${formName} Form is Ready</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#141414;font-weight:500">Your ${formName} form has been activated and is now available for you to complete in your patient portal.</p>
<p style="margin:0 0 20px;font-size:16px;line-height:150%;color:#535065">Please log in and complete the ${formName} form as soon as possible. This is an important step in your treatment preparation.</p>
<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center" valign="top" style="padding:12px 0;text-align:center"><a href="${formLink}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Go to Patient Portal</a></td></tr>
</table></td></tr></table>
</td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">Questions? Reply to this email or reach us directly.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:contactus@theibogainstitute.org" style="color:inherit;text-decoration:none">contactus@theibogainstitute.org</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">We look forward to continuing your wellness journey.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`

  return {
    subject: `Your ${formName} Form is Now Available | The Iboga Wellness Institute`,
    body,
  }
}

function generateFormActivationReminderEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  formType: string,
  formName: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const formLink = `${baseUrl}/patient/tasks`
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'there'

  const body = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reminder: Complete Your ${formName} Form | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Reminder: Complete Your ${formName} Form</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#141414;font-weight:500">Your ${formName} form has been activated for 48 hours, but we haven't received your submission yet. Please complete it as soon as possible.</p>
<p style="margin:0 0 20px;font-size:16px;line-height:150%;color:#535065">To complete: go to your Tasks page, click "Start" on the ${formName} task, then complete and submit the form.</p>
<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center" valign="top" style="padding:12px 0;text-align:center"><a href="${formLink}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Go to Patient Portal</a></td></tr>
</table></td></tr></table>
</td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">Questions? Reply to this email or reach us directly.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:contactus@theibogainstitute.org" style="color:inherit;text-decoration:none">contactus@theibogainstitute.org</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">We look forward to continuing your wellness journey.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`

  return {
    subject: `Reminder: Complete Your ${formName} Form | The Iboga Wellness Institute`,
    body,
  }
}

function generateMedicalHistoryConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  patientFirstName?: string,
  patientLastName?: string
): { subject: string; body: string } {
  const isFiller = !!(patientFirstName && patientLastName)
  const displayName = `${firstName} ${lastName}`.trim()
  const patientName = isFiller ? `${patientFirstName} ${patientLastName}`.trim() : displayName

  const introBlock = isFiller
    ? `<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#535065">You have successfully completed the medical history form for <strong>${patientName}</strong>.</p>`
    : `<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#535065">Thank you for taking the time to complete your medical history form.</p>`

  const body = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Thank You for Completing Your Medical History Form | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Thank You for Completing Your Medical History Form</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
${introBlock}
<p style="margin:0 0 20px;font-size:16px;line-height:150%;color:#535065">Our medical team will review your health history information and will let you know if we need any further health-related details.</p>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">Questions or need to update your medical information? Reach us directly.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:contactus@theibogainstitute.org" style="color:inherit;text-decoration:none">contactus@theibogainstitute.org</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">We appreciate your cooperation in helping us provide you with the best possible care.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`

  return {
    subject: isFiller
      ? `Medical History Form Completed for ${patientName} | The Iboga Wellness Institute`
      : `Thank You for Completing Your Medical History Form | The Iboga Wellness Institute`,
    body,
  }
}

function generateServiceAgreementConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  patientFirstName?: string,
  patientLastName?: string,
  ibogaineFormLink?: string
): { subject: string; body: string } {
  const isFiller = !!(patientFirstName && patientLastName)
  const displayName = `${firstName} ${lastName}`.trim()
  const patientName = isFiller ? `${patientFirstName} ${patientLastName}`.trim() : displayName

  const introBlock = isFiller
    ? `<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#535065">You have successfully completed the service agreement form for <strong>${patientName}</strong>.</p>`
    : `<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#535065">Thank you for taking the time to complete your service agreement form.</p>`

  const nextStepBlock = ibogaineFormLink
    ? `<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top" style="padding:0 0 5px"><p style="margin:0;font-size:19px;line-height:150%;color:#28243d;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif">Next step</p></td></tr>
<tr><td align="left" valign="top" style="padding:5px 0 12px"><p style="margin:0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Please complete your Ibogaine Therapy Consent Form. This is required before we can move you to onboarding.</p></td></tr>
<tr><td align="center" valign="top" style="padding:12px 0 0;text-align:center"><a href="${ibogaineFormLink}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Complete Ibogaine Consent Form</a></td></tr>
</table></td></tr></table>
</td></tr></table>`
    : ''

  const body = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Thank You for Completing Your Service Agreement | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Thank You for Completing Your Service Agreement</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
${introBlock}
<p style="margin:0 0 20px;font-size:16px;line-height:150%;color:#535065">Our team will review your service agreement and will let you know if we need any further details.</p>
${nextStepBlock}
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">Questions or need to update your service agreement? Reach us directly.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:contactus@theibogainstitute.org" style="color:inherit;text-decoration:none">contactus@theibogainstitute.org</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">We appreciate your cooperation and look forward to providing you with exceptional care.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`

  return {
    subject: isFiller
      ? `Service Agreement Completed for ${patientName} | The Iboga Wellness Institute`
      : `Thank You for Completing Your Service Agreement | The Iboga Wellness Institute`,
    body,
  }
}

function generateIbogaineConsentConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  patientFirstName?: string,
  patientLastName?: string
): { subject: string; body: string } {
  const isFiller = !!(patientFirstName && patientLastName)
  const displayName = `${firstName} ${lastName}`.trim()
  const patientName = isFiller ? `${patientFirstName} ${patientLastName}`.trim() : displayName

  const fillerBlock = isFiller
    ? `<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top" style="padding:0 0 5px"><p style="margin:0;font-size:19px;line-height:150%;color:#28243d;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif">Form Completed on Behalf of Patient</p></td></tr>
<tr><td align="left" valign="top" style="padding:5px 0 0"><p style="margin:0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">You have successfully completed the Ibogaine Therapy Consent Form for <strong>${patientName}</strong>.</p></td></tr></table></td></tr></table>
</td></tr></table>`
    : ''

  const body = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Thank You for Completing Your Ibogaine Consent Form | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Ibogaine Consent Received</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
${isFiller ? '' : '<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#141414;font-weight:500">Thank you for taking the time to complete your Ibogaine Therapy Consent Form.</p>'}
${fillerBlock}
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#535065">Our team will review your consent form and will let you know if we need any further details.</p>
<p style="margin:0 0 20px;font-size:16px;line-height:150%;color:#535065">If you have any questions, please don't hesitate to contact us.</p>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact Us</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">If you need assistance, our team is here to support you.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:contactus@theibogainstitute.org" style="color:inherit;text-decoration:none">contactus@theibogainstitute.org</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">Thank you for your time and trust. We look forward to supporting you on your wellness journey.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Warm regards,<br>The Iboga Wellness Institute Team</p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`

  return {
    subject: isFiller
      ? `Ibogaine Consent Form Completed for ${patientName} | The Iboga Wellness Institute`
      : `Thank You for Completing Your Ibogaine Consent Form | The Iboga Wellness Institute`,
    body,
  }
}

function generateOnboardingFormsEmail(
  firstName: string,
  lastName: string,
  onboardingId: string,
  schedulingLink?: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const formLink = `${baseUrl}/onboarding-forms/${onboardingId}`
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'there'
  const daisyEmail = 'daisy@theibogainstitute.org'
  const calendarLink = schedulingLink ?? 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0cMnBbm_aBy3dpuD0i5OCegv_FYMNskCyHkVgD8qHc4Enl99atTmXmyrpHcqVTML19PzmgEAl-?gv=true'

  // Application confirmation design: Instrument Serif, Inter, banner, CTA box, contact, footer
  const body = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Preparatory Instructions for Treatment | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Preparatory Instructions for Treatment</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#141414;font-weight:500">Thank you for completing your intake and medical forms. We are honored to welcome you to The Iboga Wellness Institute — Cozumel, Mexico. Proper preparation ensures a safe and effective experience.</p>
<table role="presentation" width="100%"><tr><td style="padding:24px 0"><table role="presentation" width="100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #eeedff">&nbsp;</td></tr></table></td></tr></table>
<p style="margin:0 0 10px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Thank You & Next Steps</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#535065">I'm Daisy, the Iboga Wellness Institute Clinical Director, and I'm reaching out to review your preparation.</p>
<p style="margin:0 0 8px;font-size:16px;line-height:150%;color:#535065">We'll cover:</p>
<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:150%;color:#535065">
<li style="margin-bottom:4px">Personalized nutrition</li>
<li style="margin-bottom:4px">Travel and logistics</li>
<li style="margin-bottom:4px">Allergies, sensitivities, and medical considerations</li>
<li style="margin-bottom:4px">Final preparation before arrival</li>
</ul>
<p style="margin:0 0 20px;font-size:16px;line-height:150%;color:#535065">Please be available for the call and feel free to ask any questions.</p>
<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top" style="padding:0 0 5px"><p style="margin:0;font-size:19px;line-height:150%;color:#28243d;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif">What to do now</p></td></tr>
<tr><td align="left" valign="top" style="padding:5px 0 12px"><p style="margin:0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">1. Complete your 3 onboarding forms (Release, Outing Consent, Internal Regulations). In Tasks you can also upload EKG and bloodwork. These must be done before we can assign your treatment date.</p></td></tr>
<tr><td align="center" valign="top" style="padding:12px 0;text-align:center"><a href="${formLink}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Complete Your 3 Forms</a></td></tr>
<tr><td align="left" valign="top" style="padding:8px 0 0"><p style="margin:0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">2. Schedule your call with Daisy using the calendar link below.</p></td></tr>
<tr><td align="center" valign="top" style="padding:12px 0 0;text-align:center"><a href="${calendarLink}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Schedule Call with Daisy</a></td></tr>
</table></td></tr></table>
</td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">Questions? Reply to this email or reach Daisy directly.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:${daisyEmail}" style="color:inherit;text-decoration:none">${daisyEmail}</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">We look forward to supporting you on your wellness journey.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Warm regards,<br><strong>Daisy</strong><br>Iboga Wellness Institute Clinical Director<br>Cozumel, Mexico</p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`

  return {
    subject: 'Preparatory Instructions for Treatment: Next Steps with Clinical Director | The Iboga Wellness Institute',
    body,
  }
}

const PRE_INTEGRATION_CALENDAR_LINK = 'https://calendar.app.google/26uS2irqfbwxd49Q9'
const RAY_EMAIL = 'ray@theibogainstitute.org'

function generatePreIntegrationSchedulingEmail(
  firstName: string,
  lastName: string,
  schedulingLink?: string
): { subject: string; body: string } {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'there'
  const calendarLink = schedulingLink ?? PRE_INTEGRATION_CALENDAR_LINK

  // Same design as Daisy's onboarding_forms email (Instrument Serif, Inter, banner, CTA, footer)
  const body = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Next Step: Pre-Integration Session | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Next Step: Pre-Integration Session</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#141414;font-weight:500">Thank you for completing your consultation with Daisy and for moving forward in your preparation process with Iboga Wellness Institute.</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#535065">The next step in your journey is to schedule a pre-integration session with me. My name is Ray, and I am the psychotherapist here at Iboga Wellness Institute. This session is an important part of preparing you mentally and emotionally for your upcoming experience.</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#535065">During this call, we will discuss your intentions for treatment, review your personal history and goals, and begin laying the foundation for a successful and meaningful experience. This session is designed to help you feel grounded, prepared, and supported as you move toward your stay with us.</p>
<p style="margin:0 0 20px;font-size:16px;line-height:150%;color:#535065">Please use the calendar link below to select a date and time that works best for you:</p>
<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center" valign="top" style="padding:12px 0;text-align:center"><a href="${calendarLink}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Click here to schedule your pre-integration session</a></td></tr>
<tr><td align="left" valign="top" style="padding:12px 0 0"><p style="margin:0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Once your session is scheduled, you will receive a confirmation email with the meeting details.</p></td></tr>
</table></td></tr></table>
</td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">Questions? Reply to this email or reach me directly.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:${RAY_EMAIL}" style="color:inherit;text-decoration:none">${RAY_EMAIL}</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">I look forward to speaking with you soon and supporting you as you prepare for this next step in your healing process.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Warm regards,<br><strong>Ray</strong><br>Psychotherapist<br>Iboga Wellness Institute<br>Cozumel, Mexico</p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`

  return {
    subject: 'Next Step: Schedule Your Pre-Integration Session | The Iboga Wellness Institute',
    body,
  }
}

// Main serve function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request = await req.json() as EmailTemplateRequest

    if (!request.type || !request.to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: type, to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let emailContent: { subject: string; body: string }

    // Route to appropriate template based on type
    switch (request.type) {
      case 'inquiry_confirmation':
        emailContent = generateInquiryConfirmationEmail(request.firstName || 'there')
        break

      case 'employee_welcome':
        if (!request.password || !request.role) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required fields for employee_welcome: password, role' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generateEmployeeWelcomeEmail(
          request.to,
          request.firstName || '',
          request.lastName || '',
          request.password,
          request.role
        )
        break

      case 'patient_login_reminder':
        if (!request.password) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required field: password' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generatePatientLoginReminderEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.password
        )
        break

      case 'filler_login_reminder':
        if (!request.patientEmail || !request.patientFirstName || !request.password) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required fields for filler_login_reminder' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generateFillerLoginReminderEmail(
          request.to,
          request.firstName || 'there',
          request.lastName || '',
          request.patientFirstName,
          request.patientLastName || '',
          request.patientEmail,
          request.password
        )
        break

      case 'form_activation':
        if (!request.formName || !request.formType) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required fields: formName, formType' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generateFormActivationEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.formType,
          request.formName
        )
        break

      case 'form_activation_reminder':
        if (!request.formName || !request.formType) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required fields: formName, formType' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generateFormActivationReminderEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.formType,
          request.formName
        )
        break

      case 'medical_history_confirmation':
        emailContent = generateMedicalHistoryConfirmationEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.patientFirstName,
          request.patientLastName
        )
        break

      case 'service_agreement_confirmation':
        emailContent = generateServiceAgreementConfirmationEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.patientFirstName,
          request.patientLastName,
          request.ibogaineFormLink
        )
        break

      case 'ibogaine_consent_confirmation':
        emailContent = generateIbogaineConsentConfirmationEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.patientFirstName,
          request.patientLastName
        )
        break

      case 'onboarding_forms':
        if (!request.onboardingId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required field for onboarding_forms: onboardingId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const clinicalDirectorCalendarLink = 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0cMnBbm_aBy3dpuD0i5OCegv_FYMNskCyHkVgD8qHc4Enl99atTmXmyrpHcqVTML19PzmgEAl-?gv=true'
        emailContent = generateOnboardingFormsEmail(
          request.firstName || 'there',
          request.lastName || '',
          request.onboardingId,
          request.schedulingLink ?? clinicalDirectorCalendarLink
        )
        break

      case 'pre_integration_scheduling':
        emailContent = generatePreIntegrationSchedulingEmail(
          request.firstName || 'there',
          request.lastName || '',
          request.schedulingLink
        )
        break

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Invalid email type: ${request.type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Resolve "from" address: contactus default; service_agreement → guy; onboarding_forms → daisy; pre_integration_scheduling → ray
    const fromEmail = FROM_EMAIL_BY_TYPE[request.type] ?? DEFAULT_FROM_EMAIL

    // Get access token: service account (impersonate fromEmail) or refresh token. For onboarding_forms to send from Daisy, use service account with domain-wide delegation.
    const accessToken = isServiceAccountConfigured()
      ? await getAccessTokenForUser(fromEmail)
      : await getAccessToken()

    const result = await sendGmailEmail(
      accessToken,
      request.to,
      emailContent.subject,
      emailContent.body,
      fromEmail
    )

    console.log('[send-email-template] Email sent successfully:', result.id)

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-email-template] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

