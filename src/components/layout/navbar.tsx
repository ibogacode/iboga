'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
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
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="flex h-[52px] items-center justify-between gap-6 py-5 px-4 md:px-6 lg:px-8">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center justify-center gap-2.5 px-[19px] py-2 h-[52px] rounded-[36px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] shrink-0"
        >
          <Image
            src="/logo.svg"
            alt="Iboga Logo"
            width={113}
            height={33}
            className="h-[33px] w-auto"
            priority
          />
        </Link>

        {/* Navigation Items - Hidden on mobile, shown on desktop */}
        <nav className="hidden lg:flex items-center justify-center gap-[27px] flex-1 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-center gap-2.5 px-0 py-0 text-base font-normal leading-[1.193em] tracking-[-0.04em] transition-colors whitespace-nowrap',
                  isActive
                    ? 'w-[90px] h-[41px] rounded-[21px] bg-gradient-to-b from-[#565656] to-[#1C1C1C] text-white'
                    : 'text-black hover:text-[#2D3A1F]'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side: Search + Avatar */}
        <div className="flex items-center gap-[21px] shrink-0">
          {/* Search Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-[51px] w-[51px] rounded-[36px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-[8px_13px]"
          >
            <Search className="h-5 w-5 text-black" />
            <span className="sr-only">Search</span>
          </Button>

          {/* User Avatar */}
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
              <DropdownMenuItem className="text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
