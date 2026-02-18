/**
 * Filler confirmation email HTML (sent to the person who submitted the application on behalf of the patient).
 * Same design as application confirmation; copy is tailored for the filler.
 *
 * Placeholders (replaced at send time):
 *   __FILLER_FIRST_NAME__   - Filler's first name
 *   __PATIENT_FULL_NAME__   - Patient full name (e.g. "Jane Smith")
 *   __PATIENT_FIRST_NAME__  - Patient first name (for sign-off)
 *   __SCHEDULING_LINK__     - Link to schedule a call
 *   __PROGRAM_BROCHURE_URL__ - Link for "Download Program Brochure"
 *   __CONTACT_EMAIL__       - Contact email (e.g. contactus@theibogainstitute.org)
 */

export interface FillerConfirmationParams {
  fillerFirstName: string
  patientFullName: string
  patientFirstName: string
  schedulingLink: string
  programBrochureUrl: string
  contactEmail: string
}

/** Build HTML for the filler confirmation email. */
export function getFillerConfirmationHtml(params: FillerConfirmationParams): string {
  return FILLER_CONFIRMATION_TEMPLATE.replace(/__FILLER_FIRST_NAME__/g, params.fillerFirstName)
    .replace(/__PATIENT_FULL_NAME__/g, params.patientFullName)
    .replace(/__PATIENT_FIRST_NAME__/g, params.patientFirstName)
    .replace(/__SCHEDULING_LINK__/g, params.schedulingLink)
    .replace(/__PROGRAM_BROCHURE_URL__/g, params.programBrochureUrl)
    .replace(/__CONTACT_EMAIL__/g, params.contactEmail)
}

// Same layout as application confirmation; copy tailored for filler (person who submitted on behalf).
const FILLER_CONFIRMATION_TEMPLATE = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Application Form Submitted - Confirmation</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;} .pc-font-alt{font-family:Arial,Helvetica,sans-serif;}</style>
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
<div class="pc-font-alt" style="font-family:'Instrument Serif',Arial,sans-serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Your Wellness Journey Begins</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello __FILLER_FIRST_NAME__</p>
<p style="margin:0 0 8px;font-size:16px;line-height:150%;color:#141414;font-weight:500">Thank you for submitting the application on behalf of __PATIENT_FULL_NAME__. We have received the form and will contact the patient directly regarding their eligibility and next steps.</p>
<table role="presentation" width="100%"><tr><td style="padding:24px 0"><table role="presentation" width="100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #eeedff">&nbsp;</td></tr></table></td></tr></table>
<p style="margin:0 0 10px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Form Submitted on Behalf</p>
<p style="margin:0 0 20px;font-size:16px;line-height:150%;color:#535065">Our team has successfully received the application you submitted for __PATIENT_FULL_NAME__. We will carefully review the information and contact the patient directly regarding their eligibility and next steps. We appreciate you helping them take this important step in their wellness journey.</p>
<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px 11px 11px 11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top" style="padding:0 0 5px"><p style="margin:0;font-size:19px;line-height:150%;color:#28243d;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif">Schedule a Call</p></td></tr>
<tr><td align="left" valign="top" style="padding:5px 0 0"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top"><p style="margin:0 0 0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif;letter-spacing:-0.2px">If you have any questions about the application or the process, we invite you to schedule a call with our team.</p></td></tr>
<tr><td align="center" valign="top" style="padding:20px 0;text-align:center;font-weight:normal"><a href="__SCHEDULING_LINK__" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Schedule a Call</a></td></tr>
<tr><td align="left" valign="top"><p style="margin:0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif;letter-spacing:-0.2px">During this call, we can discuss:</p><div><br /></div><ul style="margin:0;padding:0 0 0 20px;font-family:'Inter',Arial,Helvetica,sans-serif;color:#28243d"><li style="margin-bottom:0;font-weight:400;font-size:16px;line-height:182%;text-transform:none;color:#28243d"><span style="font-weight:400;font-size:16px;line-height:182%;color:#28243d">Any questions about the application you submitted</span></li><li style="margin-bottom:0;font-weight:400;font-size:16px;line-height:182%;text-transform:none;color:#28243d"><span style="font-weight:400;font-size:16px;line-height:182%;color:#28243d">The treatment process and what to expect</span></li><li style="margin-bottom:0;font-weight:400;font-size:16px;line-height:182%;text-transform:none;color:#28243d"><span style="font-weight:400;font-size:16px;line-height:182%;color:#28243d">How we can support __PATIENT_FIRST_NAME__ on their wellness journey</span></li><li style="margin-bottom:0;font-weight:400;font-size:16px;line-height:182%;text-transform:none;color:#28243d"><span style="font-weight:400;font-size:16px;line-height:182%;color:#28243d">Next steps in the process</span></li></ul></td></tr></table></td></tr></table>
</td></tr></table>
</td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:20px;background-color:#ece9df;border-radius:12px 12px 12px 12px" bgcolor="#ece9df">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top" style="padding:0 0 10px"><p style="margin:0;font-size:19px;line-height:150%;color:#28243d;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif">Program Overview</p></td></tr>
<tr><td align="left" valign="top" style="padding:0 0 20px"><p style="margin:0;font-size:16px;line-height:150%;color:#333;font-family:'Inter',Arial,Helvetica,sans-serif;letter-spacing:-0.2px">You may download the program brochure for your reference or to share with the patient.</p></td></tr>
<tr><td align="center" valign="top" style="padding:20px 0 0;text-align:center;font-weight:normal"><a href="__PROGRAM_BROCHURE_URL__" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Download Program Brochure</a></td></tr>
</table>
</td></tr></table>
</td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact Us</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">If you have any questions or need assistance, our team is here to support you.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:__CONTACT_EMAIL__" style="color:inherit;text-decoration:none">__CONTACT_EMAIL__</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">Thank you for helping __PATIENT_FIRST_NAME__ take this important step in their wellness journey.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Warm regards,<br>The Iboga Wellness Institute Team</p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 20px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:16px 0 17px"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/about/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif;letter-spacing:0">About Us</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff;letter-spacing:0">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/our-programs/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif;letter-spacing:0">Programs</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff;letter-spacing:0">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/insights/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif;letter-spacing:0">Insights</a></td><td align="center" valign="middle" style="padding-left:1.5px;padding-right:1.5px;font-size:16px;line-height:150%;color:#fff;letter-spacing:0">|</td><td align="center" valign="middle" style="width:25%;padding-top:0;padding-bottom:0"><a href="https://theibogainstitute.org/podcast/" target="_blank" style="color:#fff;text-decoration:none;font-size:16px;line-height:150%;font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif;letter-spacing:0">Podcast</a></td></tr></table></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 24px" align="center"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto"><tr><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.facebook.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/49d3df40d21a60424c3bf0f27d4ce8f9.png" width="24" height="24" alt="Facebook" style="display:block;border:0;line-height:100%;-ms-interpolation-mode:bicubic" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.linkedin.com/company/iboga-wellness-institute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/f180a29d5510c0f44c08bdde9bc397f5.png" width="24" height="24" alt="LinkedIn" style="display:block;border:0;line-height:100%;-ms-interpolation-mode:bicubic" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.instagram.com/ibogawellnessinstitute/" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/97d1e3e2fd722d0140b51806fa857340.png" width="24" height="24" alt="Instagram" style="display:block;border:0;line-height:100%;-ms-interpolation-mode:bicubic" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.youtube.com/@IbogaWellnessCenters" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/9807838a6a4c0dd0d700aff6f20f6d98.png" width="24" height="24" alt="YouTube" style="display:block;border:0;line-height:100%;-ms-interpolation-mode:bicubic" /></a></td><td align="center" valign="middle" style="padding:0 17.5px"><a href="https://www.tiktok.com/@ibogawellnessinstitute" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:top"><img src="https://postcards-cdn.designmodo.com/images-cdn/045f5352f42e1f3aad7a52d07f950976.png" width="24" height="24" alt="TikTok" style="display:block;border:0;line-height:100%;-ms-interpolation-mode:bicubic" /></a></td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`
