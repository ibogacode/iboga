'use client'

import Link from 'next/link'
import Image from 'next/image'
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
import { User } from '@/types'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { UserRole } from '@/types'
import { Sidebar } from './sidebar'

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

interface NavbarProps {
  user?: SupabaseUser | null
  profile?: User | null
  role?: UserRole
}

export function Navbar({ user, profile, role = 'patient' }: NavbarProps) {
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
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#F5F4F0] border-b border-gray-200/50">
      {/* Main Container */}
      <div className="flex items-center justify-between gap-2 md:gap-6 px-2 md:px-4 lg:px-6 xl:px-8 py-1">
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
          <SheetContent side="left" className="w-[280px] p-0">
            <Sidebar role={role} user={user} profile={profile} isMobile />
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <div className="flex items-center py-1 shrink-0">
          <Link 
            href="/" 
            className="flex items-center justify-center gap-2.5 px-3 md:px-4 py-2 h-[44px] md:h-[52px]"
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

        {/* Spacer to push right content to the end */}
        <div className="flex-1" />

        {/* Right side: Search + Bell + Avatar */}
        <div className="flex items-center gap-2 md:gap-[21px] py-1 shrink-0">
          {/* Search and Bell in one container */}
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

          {/* User Avatar */}
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
