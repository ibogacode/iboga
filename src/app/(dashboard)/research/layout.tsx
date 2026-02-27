import { getCachedUserWithProfile } from '@/lib/supabase/cached'
import { RESEARCH_ALLOWED_ROLES } from '@/lib/research/constants'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types'

export const metadata = {
  title: 'Research',
  description: 'Clinical research and analytics',
}

export default async function ResearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await getCachedUserWithProfile()
  const role = (profile?.role ?? 'patient') as UserRole
  if (!(RESEARCH_ALLOWED_ROLES as readonly string[]).includes(role)) {
    redirect('/owner')
  }
  return <>{children}</>
}
