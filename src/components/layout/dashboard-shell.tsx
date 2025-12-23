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
      <aside className="hidden md:block fixed left-0 top-[68px] z-40 h-[calc(100vh-68px)] w-[72px] bg-[#F5F4F0]" />
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
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Navbar - Full width at top */}
      <Navbar user={user} profile={profile} role={userRole} />
      
      {/* Sidebar - Fixed on left, hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar role={userRole} user={user} profile={profile} />
      </div>
      
      {/* Content - Below navbar, offset by collapsed sidebar width (72px) on desktop */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F5F4F0] pt-[52px] md:pt-[68px] md:pl-[72px] px-4 pb-4 md:px-6 md:pb-6">
        {children}
      </main>
    </div>
  )
}
