'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { User } from '@/types'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { UserRole } from '@/types'
import { useOnlineStatus } from '@/hooks/use-online-status.hook'
import { TourProvider } from '@/contexts/tour-context'
import { tourSteps } from '@/tour/steps'
import { TourOverlay } from '@/components/tour/tour-overlay'
import { TourHelpButton } from '@/components/tour/tour-help-button'

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
      <aside className="hidden lg:block fixed left-0 top-[68px] z-40 h-[calc(100vh-68px)] w-[72px] bg-[#F5F4F0]" />
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
  // Automatically track online status globally
  useOnlineStatus(user)

  // Prevent body scroll when dashboard is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <TourProvider steps={tourSteps}>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Navbar - Full width at top */}
        <Navbar user={user} profile={profile} role={userRole} />
        
        {/* Sidebar - Fixed on left, hidden on mobile and tablet, shown on desktop (lg) */}
        <div className="hidden lg:block">
          <Sidebar role={userRole} user={user} profile={profile} />
        </div>
        
        {/* Content - Below navbar, offset by collapsed sidebar width (72px) on desktop (lg) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-[52px] md:pt-[68px] lg:pl-[72px] bg-[#F5F4F0]">
          <div className="w-full max-w-[1920px] mx-auto px-4 pb-4 md:px-6 md:pb-6">
            {children}
          </div>
        </main>
        
        {/* Tour Overlay - Renders when tour is active */}
        <TourOverlay />
        
        {/* Tour Help Button - Always visible in bottom right */}
        <TourHelpButton />
      </div>
    </TourProvider>
  )
}
