'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Bell, Menu, MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUnreadMessagesContext } from '@/contexts/unread-messages-context'
import { useState, useEffect } from 'react'
import { getUserConversations } from '@/app/(dashboard)/messages/actions'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
  const router = useRouter()
  const { unreadCount } = useUnreadMessagesContext()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)

  // Load recent conversations when dropdown opens OR when unread count changes
  useEffect(() => {
    if (isNotificationOpen) {
      setIsLoadingNotifications(true)
      getUserConversations().then(({ conversations }) => {
        // Show only conversations with unread messages, sorted by most recent
        const unreadConversations = conversations
          .filter((c: any) => c.unread_count > 0)
          .sort((a: any, b: any) =>
            new Date(b.last_message_at || b.updated_at).getTime() -
            new Date(a.last_message_at || a.updated_at).getTime()
          )
          .slice(0, 5) // Show max 5 notifications
        setConversations(unreadConversations)
        setIsLoadingNotifications(false)
      })
    } else {
      // Reset state when dropdown closes
      setConversations([])
      setIsLoadingNotifications(false)
    }
  }, [isNotificationOpen, unreadCount])

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
        {/* Mobile/Tablet Menu Button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 shrink-0"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
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
            <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-auto w-auto p-1.5 md:p-2 hover:bg-transparent relative"
                  data-tour="tour-dashboard-notifications"
                >
                  <Bell className="h-4 w-4 md:h-5 md:w-5 text-black" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-red-500 text-[10px] md:text-xs font-medium text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  <span className="sr-only">Messages ({unreadCount} unread)</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Messages</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isLoadingNotifications ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No unread messages
                  </div>
                ) : (
                  <>
                    {conversations.map((conv: any) => {
                      // Get the other participant's name and info
                      const otherParticipant = conv.participants?.find(
                        (p: any) => p.user_id !== user?.id
                      )
                      const displayName = conv.is_group
                        ? conv.name || 'Group Chat'
                        : otherParticipant?.user?.name ||
                          `${otherParticipant?.user?.first_name || ''} ${otherParticipant?.user?.last_name || ''}`.trim() ||
                          'Unknown'

                      // Get avatar and initials
                      const avatarUrl = conv.is_group ? null : otherParticipant?.user?.avatar_url
                      const initials = conv.is_group
                        ? 'GC'
                        : getInitials(
                            otherParticipant?.user?.name,
                            otherParticipant?.user?.first_name,
                            otherParticipant?.user?.last_name
                          ) || (otherParticipant?.user?.email?.[0]?.toUpperCase() || 'U')

                      return (
                        <DropdownMenuItem
                          key={conv.id}
                          className="cursor-pointer p-3 flex flex-col items-start gap-1"
                          onClick={() => {
                            router.push(`/messages?conversation=${conv.id}`)
                            setIsNotificationOpen(false)
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={avatarUrl || undefined} alt={displayName} className="object-cover" />
                              <AvatarFallback className="bg-[#2D3A1F] text-white text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm truncate flex-1">
                              {displayName}
                            </span>
                            {conv.unread_count > 0 && (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          {conv.last_message_preview && (
                            <p className="text-xs text-gray-500 truncate w-full pl-10">
                              {conv.last_message_preview}
                            </p>
                          )}
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer justify-center text-center text-sm font-medium"
                      onClick={() => {
                        router.push('/messages')
                        setIsNotificationOpen(false)
                      }}
                    >
                      View all messages
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-[44px] w-[44px] md:h-[51px] md:w-[51px] rounded-full bg-[#2D3A1F] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-0 hover:bg-[#2D3A1F]/90 overflow-hidden"
                data-tour="tour-profile-avatar"
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
