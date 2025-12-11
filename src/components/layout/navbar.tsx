'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

// TODO: Replace with actual user data
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'doctor',
  avatar: '',
  initials: 'J',
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

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full bg-[#F5F4F0]">
      {/* Layer 1: Main Container */}
      <div className="flex items-center justify-between gap-6 px-4 md:px-6 lg:px-8 py-4 bg-red-200/30">
        {/* Layer 2: Logo */}
        <Link 
          href="/" 
          className="flex items-center justify-center gap-2.5 px-[19px] py-2 h-[52px] rounded-[36px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] shrink-0"
        >
          <Image
            src="/logo.png"
            alt="Iboga Logo"
            width={113}
            height={33}
            className="h-[33px] w-auto"
            priority
          />
        </Link>

        {/* Layer 3: Navigation Items - Responsive */}
        <nav className="hidden md:flex items-center justify-center gap-[27px] flex-1 px-4 min-w-0 overflow-hidden bg-blue-200/30">
          {/* Layer 4: Navigation Items Container */}
          <div className="flex items-center justify-center gap-[27px] pl-3 pr-3 h-[51px] rounded-[36px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] overflow-hidden">
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
                    'flex items-center justify-center gap-2.5 py-0 text-sm md:text-base font-normal leading-[1.193em] tracking-[-0.04em] transition-colors whitespace-nowrap shrink-0',
                    isActive
                      ? 'px-4 h-[41px] rounded-[21px] bg-[#1C1C1C] text-white'
                      : 'px-0 text-black hover:text-[#2D3A1F]',
                    isFirst && 'ml-2',
                    isLast && 'mr-2'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Layer 5: Right side: Search + Bell (in one box) + Avatar */}
        <div className="flex items-center gap-[21px] shrink-0 bg-green-200/30">
          {/* Layer 6: Search and Bell in one container */}
          <div className="flex items-center gap-2 px-3 h-[51px] rounded-[36px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-2 hover:bg-transparent"
            >
              <Search className="h-5 w-5 text-black" />
              <span className="sr-only">Search</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-2 hover:bg-transparent relative"
            >
              <Bell className="h-5 w-5 text-black" />
              <span className="sr-only">Notifications</span>
            </Button>
          </div>

          {/* Layer 7: User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-[51px] w-[51px] rounded-[36px] bg-[#2D3A1F] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-[8px_13px] hover:bg-[#2D3A1F]/90"
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
                  <AvatarFallback className="bg-transparent text-white text-base font-normal">
                    {mockUser.initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{mockUser.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {mockUser.email}
                  </p>
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
