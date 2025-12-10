'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSidebarContext } from '@/hooks/use-sidebar.hook'
import { getNavigationForRole, type NavItem } from '@/config/navigation'
import { UserRole } from '@/types'

interface SidebarProps {
  role?: UserRole
}

export function Sidebar({ role = 'patient' }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, isCollapsed, toggleCollapse, close } = useSidebarContext()
  const navigation = getNavigationForRole(role)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300 md:relative md:z-0',
          isCollapsed ? 'w-16' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            'flex h-14 items-center border-b px-4',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}>
            {!isCollapsed && (
              <Link href="/" className="flex items-center gap-2">
                {/* TODO: Add your logo here */}
                <span className="font-bold text-xl">Iboga</span>
              </Link>
            )}
            
            {/* Collapse button - Desktop only */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-8 w-8"
              onClick={toggleCollapse}
            >
              <ChevronLeft className={cn(
                'h-4 w-4 transition-transform',
                isCollapsed && 'rotate-180'
              )} />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-2">
              {navigation.mainNav.map((item) => (
                <SidebarItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                  isCollapsed={isCollapsed}
                />
              ))}
            </nav>

            {/* Secondary nav */}
            {navigation.secondaryNav.length > 0 && (
              <>
                <div className="my-4 px-4">
                  <div className="border-t" />
                </div>
                <nav className="space-y-1 px-2">
                  {navigation.secondaryNav.map((item) => (
                    <SidebarItem
                      key={item.href}
                      item={item}
                      isActive={pathname === item.href}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </nav>
              </>
            )}
          </ScrollArea>

          {/* Footer - optional */}
          <div className="border-t p-4">
            {!isCollapsed && (
              <p className="text-xs text-muted-foreground text-center">
                © 2024 Iboga
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

interface SidebarItemProps {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
}

function SidebarItem({ item, isActive, isCollapsed }: SidebarItemProps) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground',
        isCollapsed && 'justify-center px-2'
      )}
      title={isCollapsed ? item.title : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}


