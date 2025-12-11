# Database Setup Guide

## Profiles Table

The `profiles` table is linked to `auth.users` and contains user profile information.

### Schema

```sql
profiles (
  id UUID PRIMARY KEY (references auth.users),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  name TEXT (generated: first_name + last_name),
  role TEXT (owner|manager|doctor|psych|nurse|driver|patient),
  designation TEXT,
  avatar_url TEXT,
  organization_id UUID,
  location_id UUID,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Features

1. **Auto-creation**: Profile is automatically created when a user signs up via trigger
2. **Generated name**: `name` column is automatically generated from `first_name` + `last_name`
3. **RLS Policies**: 
   - Users can view/update their own profile
   - Staff can view profiles in their organization
   - Only owners/managers can create profiles
   - Only owners can delete profiles

## Storage Bucket: Avatars

### Configuration

- **Bucket ID**: `avatars`
- **Public**: Yes (avatars are publicly accessible)
- **File Size Limit**: 5MB
- **Allowed Types**: JPEG, PNG, GIF, WebP, SVG

### File Structure

```
avatars/
  └── {user_id}/
      └── {timestamp}.{ext}
```

### RLS Policies

- Anyone can view avatars (public bucket)
- Users can upload/update/delete their own avatar
- Staff can upload avatars for organization members

## Running Migrations

### Option 1: Using Supabase CLI (Local)

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db reset
```

### Option 2: Using Supabase CLI (Remote)

```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Option 3: Using Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste the migration files
4. Run them in order:
   - `20241210000001_create_profiles_table.sql`
   - `20241210000002_create_avatars_storage.sql`

## Usage Examples

### Upload Avatar (Client-side)

```typescript
import { uploadAvatar } from '@/lib/supabase/storage'

const file = event.target.files[0]
const avatarUrl = await uploadAvatar(file, userId)
```

### Get User Profile

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

### Update Profile

```typescript
import { updateProfileAction } from '@/actions/profile.action'

const result = await updateProfileAction({
  first_name: 'John',
  last_name: 'Doe',
  designation: 'Senior Doctor',
  phone: '+1234567890'
})
```

## Testing

After running migrations, test the setup:

```sql
-- Check if profiles table exists
SELECT * FROM profiles LIMIT 1;

-- Check if avatars bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Test RLS policies
SET ROLE authenticated;
SELECT * FROM profiles;
```

## Troubleshooting

### Profile not created on signup

Check if the trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Avatar upload fails

1. Check bucket exists: `SELECT * FROM storage.buckets WHERE id = 'avatars';`
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%avatar%';`
3. Verify file size and type are within limits

### RLS blocking access

Check your user's role and organization:
```sql
SELECT id, email, role, organization_id FROM profiles WHERE id = auth.uid();
```

