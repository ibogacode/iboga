import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types'

export const metadata = {
  title: 'Dashboard',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with name
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, first_name, last_name')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as UserRole) || 'patient'
  const userName = profile?.name || profile?.first_name || 'User'
  const greeting = getGreeting()
  
  return (
    <div>
      <h1 
        style={{ 
          fontFamily: 'var(--font-instrument-serif), serif',
          fontSize: '44px',
          fontWeight: 400,
          color: 'black',
          wordWrap: 'break-word'
        }}
      >
        {greeting}, {userName}
      </h1>
    </div>
  )
}


