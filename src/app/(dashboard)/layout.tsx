import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Navbar - Full width at top, pass user data to avoid duplicate fetching */}
      <Navbar user={user} profile={profile} />
      
      {/* Sidebar and Content - Below navbar */}
      <div className="flex flex-1 overflow-hidden pt-[52px] md:pt-[68px] min-h-0">
        <Sidebar role={userRole} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F5F4F0] pt-2 pl-2 pr-4 pb-4 md:pt-3 md:pl-3 md:pr-6 md:pb-6 min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
