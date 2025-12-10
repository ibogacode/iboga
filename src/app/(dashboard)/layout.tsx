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
  // In production, you'd fetch this from the profiles table
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}


