# Testing Calendar Link Tracking Locally

## Prerequisites

1. **Run the database migration**:
   ```bash
   # Option 1: Using Supabase CLI
   supabase db push
   
   # Option 2: Manual SQL in Supabase Dashboard
   # Go to Supabase Dashboard > SQL Editor
   # Run the migration file: supabase/migrations/20241210000007_add_email_tracking_fields.sql
   ```

2. **Set environment variable** (optional, defaults to localhost:3000 in development):
   ```bash
   # In your .env.local file
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Testing Steps

### Step 1: Start your development server
```bash
npm run dev
# or
yarn dev
```

### Step 2: Submit a test form
1. Navigate to `http://localhost:3000/intake`
2. Fill out the patient intake form with test data
3. Submit the form

### Step 3: Check the console/logs
After form submission, check your terminal/console for:
- `📧 Email tracking link generated:` - Shows the tracking link
- `🔗 Prepopulated calendar link:` - Shows the Google Calendar link with prepopulated data

### Step 4: Test the tracking link
You have two options:

#### Option A: Check the email (if email sending is enabled)
- Check your email inbox for the confirmation email
- Click the "Schedule Your Call" button
- You should be redirected to Google Calendar with name/email prefilled

#### Option B: Get the tracking link from database
1. Go to Supabase Dashboard > Table Editor > `patient_intake_forms`
2. Find your test submission
3. Copy the `tracking_token` value
4. Visit: `http://localhost:3000/api/track-calendar-click/YOUR_TOKEN_HERE?redirect=YOUR_CALENDAR_LINK`
   - Replace `YOUR_TOKEN_HERE` with the actual token
   - Replace `YOUR_CALENDAR_LINK` with the prepopulated calendar link (URL encoded)

#### Option C: Check the database directly
1. After clicking the link, check the `calendar_link_clicked_at` field in the database
2. It should have a timestamp if the click was recorded

### Step 5: Verify in Patient Pipeline
1. Navigate to `http://localhost:3000/patient-pipeline` (as owner/admin)
2. Check the "Calendar Link" column
3. Should show "Clicked" with a green checkmark if the link was clicked

## Debugging

### Check if tracking token was generated
```sql
SELECT id, email, tracking_token, email_sent_at 
FROM patient_intake_forms 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check if click was recorded
```sql
SELECT id, email, calendar_link_clicked_at 
FROM patient_intake_forms 
WHERE calendar_link_clicked_at IS NOT NULL;
```

### Manual test URL format
```
http://localhost:3000/api/track-calendar-click/[TOKEN]?redirect=[ENCODED_CALENDAR_LINK]
```

Example:
```
http://localhost:3000/api/track-calendar-click/abc123?redirect=https%3A%2F%2Fcalendar.app.google%2FjkPEGqcQcf82W6aMA%3Fname%3DJohn%2520Doe%26email%3Djohn%40example.com
```

## Common Issues

1. **Migration not run**: Make sure you've applied the migration to add the tracking fields
2. **Token not found**: Check that `tracking_token` was saved when the email was sent
3. **Click not recorded**: Check browser console and server logs for errors
4. **Redirect not working**: Verify the `redirect` parameter is properly URL encoded

## Quick Test Script

You can also test the API route directly:

```bash
# Replace TOKEN with an actual tracking token from your database
curl -I "http://localhost:3000/api/track-calendar-click/TOKEN?redirect=https%3A%2F%2Fcalendar.app.google%2FjkPEGqcQcf82W6aMA"
```

The response should be a 307 redirect to the calendar link.

