'use client'

import dynamic from 'next/dynamic'
import { User } from '@/types'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { UserRole } from '@/types'

// Dynamic imports to prevent hydration mismatch with Radix UI components
const Navbar = dynamic(
  () => import('@/components/layout/navbar').then(mod => ({ default: mod.Navbar })),
  { 
    ssr: false,
    loading: () => (
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#F5F4F0] h-[52px] md:h-[68px]" />
    )
  }
)

const Sidebar = dynamic(
  () => import('@/components/layout/sidebar').then(mod => ({ default: mod.Sidebar })),
  { 
    ssr: false,
    loading: () => (
      <div className="hidden md:block w-16 shrink-0" />
    )
  }
)

interface DashboardShellProps {
  children: React.ReactNode
  user: SupabaseUser | null
  profile: User | null
  userRole: UserRole
}

export function DashboardShell({ children, user, profile, userRole }: DashboardShellProps) {
  // All roles use the same layout: navbar + sidebar + content
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Navbar - Full width at top */}
      <Navbar user={user} profile={profile} role={userRole} />
      
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
