'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search, Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { cn } from '@/lib/utils'
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

// Navigation items - these will be role-based later
const navItems = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Forms', href: '/forms' },
  { label: 'Patient Pipeline', href: '/patient-pipeline' },
  { label: 'Facility Management', href: '/facility-management' },
  { label: 'Onboarding', href: '/onboarding' },
  { label: 'Patient Management', href: '/patient-management' },
  { label: 'Research', href: '/research' },
  { label: 'Marketing', href: '/marketing' },
]

interface NavbarProps {
  user?: SupabaseUser | null
  profile?: User | null
}

export function Navbar({ user, profile }: NavbarProps) {
  const pathname = usePathname()
  
  // Get user name - prioritize generated name column, then construct from first/last, then fallback
  const userName = profile?.name || 
    (profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile?.first_name || profile?.last_name || user?.email?.split('@')[0] || 'User')
  
  // Get user email - prioritize auth user email (most reliable), then profile email
  const userEmail = user?.email || profile?.email || ''
  
  // Get avatar URL
  const userAvatar = profile?.avatar_url || ''
  
  // Get initials for fallback
  const userInitials = getInitials(profile?.name, profile?.first_name, profile?.last_name) || 
    (userEmail ? userEmail[0]?.toUpperCase() : 'U')

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#F5F4F0]">
      {/* Layer 1: Main Container */}
      <div className="flex items-center justify-between gap-2 md:gap-6 px-2 md:px-4 lg:px-6 xl:px-8 py-1 bg-red-200/30">
        {/* Mobile Menu Button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 shrink-0"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px]">
            <nav className="flex flex-col gap-4 mt-8">
              {navItems.map((item) => {
                let isActive = false
                if (item.href === '/dashboard') {
                  isActive = pathname === '/dashboard' || 
                            pathname === '/owner' || 
                            pathname === '/doctor' || 
                            pathname === '/manager' || 
                            pathname === '/psych' || 
                            pathname === '/nurse' || 
                            pathname === '/driver' || 
                            pathname === '/patient' ||
                            pathname.startsWith('/dashboard/')
                } else {
                  isActive = pathname === item.href || 
                            (item.href !== '/' && pathname.startsWith(item.href + '/'))
                }
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-4 py-3 rounded-[26px] text-base font-normal transition-colors',
                      isActive
                        ? 'text-white'
                        : 'text-black hover:bg-gray-50'
                    )}
                    style={isActive ? {
                      background: 'linear-gradient(180deg, #565656 0%, #1C1C1C 61%), linear-gradient(180deg, #5F5F5F 0%, #262315 100%)'
                    } : undefined}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Layer 2: Logo */}
        <div className="flex items-center py-1 shrink-0 bg-yellow-200/30">
          <Link 
            href="/" 
            className="flex items-center justify-center gap-2.5 px-3 md:px-[19px] py-2 h-[44px] md:h-[52px] rounded-[36px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]"
          >
            <Image
              src="/logo.png"
              alt="Iboga Logo"
              width={113}
              height={33}
              className="h-[28px] md:h-[33px] w-auto"
              priority
            />
          </Link>
        </div>

        {/* Layer 3: Navigation Items - Responsive */}
        <nav className="hidden md:flex items-center justify-center gap-2 lg:gap-[27px] flex-1 px-2 md:px-4 py-1 min-w-0 overflow-hidden bg-blue-200/30">
          {/* Layer 4: Navigation Items Container */}
          <div className="flex items-center justify-center gap-2 md:gap-4 lg:gap-[27px] pl-2 md:pl-3 pr-2 md:pr-3 h-[44px] md:h-[51px] rounded-[36px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] overflow-x-auto overflow-y-hidden scrollbar-hide">
            {navItems.map((item, index) => {
              // Check if current path matches the nav item
              // For Home, also check if on dashboard or role-specific routes
              let isActive = false
              if (item.href === '/dashboard') {
                // Home is active on /dashboard or any role-specific route
                isActive = pathname === '/dashboard' || 
                          pathname === '/owner' || 
                          pathname === '/doctor' || 
                          pathname === '/manager' || 
                          pathname === '/psych' || 
                          pathname === '/nurse' || 
                          pathname === '/driver' || 
                          pathname === '/patient' ||
                          pathname.startsWith('/dashboard/')
              } else {
                // For other items, exact match or starts with the href
                isActive = pathname === item.href || 
                          (item.href !== '/' && pathname.startsWith(item.href + '/'))
              }
              const isFirst = index === 0
              const isLast = index === navItems.length - 1
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-center gap-2.5 py-0 text-xs md:text-sm lg:text-base font-normal leading-[1.193em] tracking-[-0.04em] transition-colors whitespace-nowrap shrink-0',
                    isActive
                      ? 'px-2 md:px-3 lg:px-4 h-[36px] md:h-[41px] rounded-[26px] text-white'
                      : 'px-0 text-black hover:text-[#2D3A1F]',
                    isFirst && 'ml-1 md:ml-2',
                    isLast && 'mr-1 md:mr-2'
                  )}
                  style={isActive ? {
                    background: 'linear-gradient(180deg, #565656 0%, #1C1C1C 61%), linear-gradient(180deg, #5F5F5F 0%, #262315 100%)'
                  } : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Layer 5: Right side: Search + Bell (in one box) + Avatar */}
        <div className="flex items-center gap-2 md:gap-[21px] py-1 shrink-0 bg-green-200/30">
          {/* Layer 6: Search and Bell in one container - hidden on small mobile */}
          <div className="hidden sm:flex items-center gap-2 px-2 md:px-3 h-[44px] md:h-[51px] rounded-[36px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-1.5 md:p-2 hover:bg-transparent"
            >
              <Search className="h-4 w-4 md:h-5 md:w-5 text-black" />
              <span className="sr-only">Search</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-1.5 md:p-2 hover:bg-transparent relative"
            >
              <Bell className="h-4 w-4 md:h-5 md:w-5 text-black" />
              <span className="sr-only">Notifications</span>
            </Button>
          </div>

          {/* Layer 7: User Avatar */}
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
      </div>
    </header>
  )
}
