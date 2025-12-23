import { redirect } from 'next/navigation'
import { getCachedUserWithProfile } from '@/lib/supabase/cached'
import { getRoleRoute } from '@/lib/utils/role-routes'

export default async function HomePage() {
  const { user, profile } = await getCachedUserWithProfile()

  if (user) {
    const role = (profile?.role as 'admin' | 'owner' | 'manager' | 'doctor' | 'psych' | 'nurse' | 'driver' | 'patient') || 'patient'
    redirect(getRoleRoute(role))
  } else {
    redirect('/login')
  }
}
