import { DashboardShell } from '@/components/layout/dashboard-shell'
import { getCachedUserWithProfile } from '@/lib/supabase/cached'
import { UserRole } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get user and profile using cached function (deduplicates within request)
  const { user, profile } = await getCachedUserWithProfile()
  
  // Get role from profile or default to patient
  const userRole: UserRole = (profile?.role as UserRole) || 'patient'

  return (
    <DashboardShell user={user} profile={profile} userRole={userRole}>
      {children}
    </DashboardShell>
  )
}
