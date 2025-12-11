import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get user and their role from Supabase
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Default to patient role if not found
  let userRole: UserRole = 'patient'
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role) {
      userRole = profile.role as UserRole
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Navbar - Full width at top */}
      <Navbar />
      
      {/* Sidebar and Content - Below navbar */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={userRole} />
        <main className="flex-1 overflow-y-auto bg-[#F5F4F0] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
