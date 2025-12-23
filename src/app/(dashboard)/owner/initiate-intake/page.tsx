import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRoleRoute } from '@/lib/utils/role-routes'
import { UserRole } from '@/types'
import InitiateIntakeForm from './initiate-intake-form'

export const metadata = {
  title: 'Initiate Intake Form | Iboga Wellness Institute',
}

export default async function InitiateIntakePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only admin and owner can access
  if (profile?.role !== 'admin' && profile?.role !== 'owner') {
    const role = (profile?.role as UserRole) || 'patient'
    redirect(getRoleRoute(role))
  }

  return <InitiateIntakeForm />
}
