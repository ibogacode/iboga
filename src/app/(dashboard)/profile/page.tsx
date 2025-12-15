import { getCachedUserWithProfile } from '@/lib/supabase/cached'
import { ProfileForm } from './profile-form'

export default async function ProfileSettingsPage() {
  // Fetch user and profile data server-side
  const { user, profile } = await getCachedUserWithProfile()

  return <ProfileForm user={user} profile={profile} />
}
