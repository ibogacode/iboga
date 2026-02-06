'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserRole } from '@/types'
import { navigationByRole } from '@/config/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from '@/types'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { ChevronRight, User as UserIcon } from 'lucide-react'
import { useUnreadMessagesContext } from '@/contexts/unread-messages-context'
import { useTour } from '@/contexts/tour-context'

interface SidebarProps {
  role?: UserRole
  user?: SupabaseUser | null
  profile?: User | null
  isMobile?: boolean
}

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

// Collapsed width: 72px (for icons + padding)
// Expanded width: 280px
const COLLAPSED_WIDTH = 72
const EXPANDED_WIDTH = 280

export function Sidebar({ role = 'patient', user, profile, isMobile = false }: SidebarProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const { unreadCount } = useUnreadMessagesContext()
  const { startTour, restartTour, isActive } = useTour()

  // Get navigation items based on role
  const navConfig = navigationByRole[role] || navigationByRole.patient
  const mainNavItems = navConfig.mainNav
  
  // Get user info
  const userName = profile?.name || 
    (profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile?.first_name || profile?.last_name || user?.email?.split('@')[0] || 'User')
  
  const userAvatar = profile?.avatar_url || ''
  const userInitials = getInitials(profile?.name, profile?.first_name, profile?.last_name) || 
    (user?.email ? user.email[0]?.toUpperCase() : 'U')

  // Check if a nav item is active
  const isItemActive = (href?: string) => {
    if (!href) return false
    if (href === '/dashboard' || href === '/patient' || href === '/owner' || 
        href === '/doctor' || href === '/manager' || href === '/psych' || 
        href === '/nurse' || href === '/driver') {
      if (href === '/patient') {
        return pathname === '/patient'
      } else if (href === '/owner') {
        return pathname === '/owner' || pathname === '/dashboard'
      } else if (href === '/dashboard') {
        return pathname === '/dashboard' || 
               pathname === '/owner' || 
               pathname === '/doctor' || 
               pathname === '/manager' || 
               pathname === '/psych' || 
               pathname === '/nurse' || 
               pathname === '/driver' || 
               pathname.startsWith('/dashboard/')
      } else {
        return pathname === href || pathname.startsWith(href + '/')
      }
    }
    return pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
  }

  // Initialize expanded items - auto-expand items with active children
  const getInitialExpandedItems = () => {
    const expanded = new Set<string>()
    mainNavItems.forEach(item => {
      if (item.children && item.children.some(child => isItemActive(child.href))) {
        expanded.add(item.title)
      }
    })
    return expanded
  }
  
  const [expandedItems, setExpandedItems] = useState<Set<string>>(getInitialExpandedItems)

  // Toggle expanded state for items with children but no href
  const toggleItemExpanded = (itemTitle: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemTitle)) {
        newSet.delete(itemTitle)
      } else {
        newSet.add(itemTitle)
      }
      return newSet
    })
  }

  // For mobile, always show expanded
  const showExpanded = isMobile || isExpanded

  return (
    <aside 
      className={cn(
        "bg-[#F5F4F0] border-r border-gray-200/50 flex flex-col transition-all duration-300 ease-in-out",
        isMobile 
          ? "h-full w-full" 
          : "fixed left-0 top-[52px] md:top-[68px] z-40 h-[calc(100vh-52px)] md:h-[calc(100vh-68px)] border-t-0"
      )}
      style={{ 
        width: isMobile ? '100%' : (showExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH) 
      }}
      onMouseEnter={() => !isMobile && setIsExpanded(true)}
      onMouseLeave={() => !isMobile && setIsExpanded(false)}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6">
        {/* Dashboards Section */}
        <div className="mb-6">
          <h3 className={cn(
            "px-4 mb-3 text-xs font-medium text-gray-500 uppercase tracking-wider transition-opacity duration-200 whitespace-nowrap",
            showExpanded ? "opacity-100" : "opacity-0"
          )}>
            Dashboards
          </h3>
          <nav className="space-y-1 px-3">
            {mainNavItems.map((item) => {
              const isActive = isItemActive(item.href) || (item.children && item.children.some(child => isItemActive(child.href)))
              const Icon = item.icon
              const hasChildren = item.children && item.children.length > 0
              const isItemExpanded = expandedItems.has(item.title) || (item.href && isActive)
              const hasHref = !!item.href
              
              const isMessagesItem = item.title === 'Messages'
              const showUnreadBadge = isMessagesItem && unreadCount > 0

              const isGuideItem = item.title === 'Guide'
              const itemContent = (
                <>
                  {/* Active indicator */}
                  {(isActive || (isGuideItem && isActive)) && showExpanded && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gray-900 rounded-r-full -ml-3" />
                  )}

                  <div className="relative">
                    <Icon className={cn(
                      'h-5 w-5 shrink-0',
                      (isActive || (isGuideItem && isActive)) ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                    )} />
                    {/* Unread badge on icon when collapsed */}
                    {showUnreadBadge && !showExpanded && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500">
                        <span className="sr-only">{unreadCount} unread</span>
                      </span>
                    )}
                  </div>

                  {showExpanded && (
                    <>
                      <span className="flex-1 whitespace-nowrap">{item.title}</span>
                      {showUnreadBadge && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      {hasChildren && (
                        <ChevronRight className={cn(
                          'h-4 w-4 shrink-0 transition-transform',
                          isActive ? 'text-white/70' : 'text-gray-400',
                          isItemExpanded && 'rotate-90'
                        )} />
                      )}
                    </>
                  )}
                </>
              )
              
              return (
                <div key={item.href || item.title}>
                  {isGuideItem ? (
                    <button
                      onClick={() => {
                        if (isActive) {
                          restartTour()
                        } else {
                          startTour()
                        }
                      }}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth relative focus-ring w-full text-left',
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-white hover:shadow-md',
                        !showExpanded && 'justify-center px-0'
                      )}
                      title={!showExpanded ? item.title : undefined}
                    >
                      {itemContent}
                    </button>
                  ) : hasHref ? (
                    <Link
                      href={item.href!}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth relative focus-ring',
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-white hover:shadow-md',
                        !showExpanded && 'justify-center px-0'
                      )}
                      title={!showExpanded ? item.title : undefined}
                      data-tour={item.title === 'Tasks' ? 'tour-sidebar-tasks' : item.title === 'Documents' ? 'tour-sidebar-documents' : undefined}
                    >
                      {itemContent}
                    </Link>
                  ) : (
                    <button
                      onClick={() => toggleItemExpanded(item.title)}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth relative focus-ring w-full text-left',
                        isItemExpanded
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-white hover:shadow-md',
                        !showExpanded && 'justify-center px-0'
                      )}
                      title={!showExpanded ? item.title : undefined}
                    >
                      {itemContent}
                    </button>
                  )}
                  
                  {/* Render children if expanded and item is expanded */}
                  {hasChildren && showExpanded && isItemExpanded && item.children && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.filter(child => child.href).map((child) => {
                        const isChildActive = isItemActive(child.href)
                        const ChildIcon = child.icon
                        
                        return (
                          <Link
                            key={child.href}
                            href={child.href!}
                            className={cn(
                              'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-smooth relative focus-ring',
                              isChildActive
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-600 hover:bg-gray-100 hover:shadow-sm'
                            )}
                          >
                            {isChildActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gray-900 rounded-r-full -ml-3" />
                            )}
                            
                            <ChildIcon className={cn(
                              'h-4 w-4 shrink-0',
                              isChildActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                            )} />
                            
                            <span className="flex-1 whitespace-nowrap">{child.title}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        {/* User Section */}
        <div className="mb-6">
          <h3 className={cn(
            "px-4 mb-3 text-xs font-medium text-gray-500 uppercase tracking-wider transition-opacity duration-200 whitespace-nowrap",
            showExpanded ? "opacity-100" : "opacity-0"
          )}>
            User
          </h3>
          <nav className="space-y-1 px-3">
            <Link
              href="/profile"
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative',
                pathname === '/profile'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-white hover:shadow-sm',
                !showExpanded && 'justify-center px-0'
              )}
              title={!showExpanded ? 'User Profile' : undefined}
            >
              {pathname === '/profile' && showExpanded && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gray-900 rounded-r-full -ml-3" />
              )}
              
              <UserIcon className={cn(
                'h-5 w-5 shrink-0',
                pathname === '/profile'
                  ? 'text-white'
                  : 'text-gray-500 group-hover:text-gray-700'
              )} />
              
              {showExpanded && (
                <>
                  <span className="flex-1 whitespace-nowrap">User Profile</span>
                  <ChevronRight className={cn(
                    'h-4 w-4 shrink-0',
                    pathname === '/profile'
                      ? 'text-white/70 rotate-90'
                      : 'text-gray-400'
                  )} />
                </>
              )}
            </Link>
          </nav>
        </div>
      </div>
      
      {/* User Profile at Bottom */}
      <div className="p-3 border-t border-gray-200/50">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-xl bg-white shadow-md hover-lift transition-smooth focus-ring",
            showExpanded ? "px-3 py-2.5" : "p-2 justify-center"
          )}
          title={!showExpanded ? userName : undefined}
        >
          <Avatar className={cn("shrink-0", showExpanded ? "h-10 w-10" : "h-8 w-8")}>
            <AvatarImage src={userAvatar || undefined} alt={userName} />
            <AvatarFallback className="bg-gray-200 text-gray-600 text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {showExpanded && (
            <span className="text-sm font-medium text-gray-900 truncate">
              {userName}
        </span>
      )}
        </Link>
        </div>
      </aside>
  )
}
