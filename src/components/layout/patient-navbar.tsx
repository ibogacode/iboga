'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { cn } from '@/lib/utils'
import { navigationByRole } from '@/config/navigation'
import { User } from '@/types'
import { User as SupabaseUser } from '@supabase/supabase-js'

function getInitials(name?: string | null, firstName?: string | null, lastName?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name[0]?.toUpperCase() || 'U'
  }
  
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase()
  }
  
  if (firstName) {
    return firstName[0]?.toUpperCase() || 'U'
  }
  
  if (lastName) {
    return lastName[0]?.toUpperCase() || 'U'
  }
  
  return 'U'
}

interface PatientNavbarProps {
  user?: SupabaseUser | null
  profile?: User | null
}

export function PatientNavbar({ user, profile }: PatientNavbarProps) {
  const pathname = usePathname()
  const navItems = navigationByRole.patient.mainNav

  // Get user name
  const userName = profile?.name || 
    (profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile?.first_name || profile?.last_name || user?.email?.split('@')[0] || 'User')
  
  // Get user email
  const userEmail = user?.email || profile?.email || ''
  
  // Get avatar URL
  const userAvatar = profile?.avatar_url || ''
  
  // Get initials for fallback
  const userInitials = getInitials(profile?.name, profile?.first_name, profile?.last_name) || 
    (userEmail ? userEmail[0]?.toUpperCase() : 'U')

  return (
    <div className="w-full bg-[#F5F4F0]">
      {/* Top bar with avatar */}
      <div className="flex items-center justify-end px-4 md:px-6 lg:px-8 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-[44px] w-[44px] md:h-[51px] md:w-[51px] rounded-full bg-[#2D3A1F] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-0 hover:bg-[#2D3A1F]/90 overflow-hidden"
            >
              <Avatar className="h-full w-full">
                <AvatarImage src={userAvatar || undefined} alt={userName} className="object-cover" />
                <AvatarFallback className="bg-transparent text-white text-sm md:text-base font-normal">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {userName || 'User'}
                </p>
                {userEmail && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <SignOutButton className="w-full text-left text-destructive cursor-pointer">
                Sign out
              </SignOutButton>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation bar */}
      <nav className="w-full flex justify-center pb-4">
        <div 
          className="flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-sm"
          style={{
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/patient' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-6 py-2 text-base font-medium transition-colors rounded-full',
                  isActive
                    ? 'bg-[#5D7A5F] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                style={{
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                }}
              >
                {item.title}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
