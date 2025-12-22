'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSidebarContext } from '@/hooks/use-sidebar.hook'
import { UserRole } from '@/types'
import { 
  Sun, 
  Moon,
  FilePlus,
  Lock,
  FileText,
  Archive,
  BarChart3,
  HelpCircle,
  ArrowLeft,
  LucideIcon
} from 'lucide-react'

interface SidebarProps {
  role?: UserRole
}

// Gradient style for active state (same as navbar)
const activeGradient = 'linear-gradient(180deg, #565656 0%, #1C1C1C 61%), linear-gradient(180deg, #5F5F5F 0%, #262315 100%)'

interface SidebarIconButtonProps {
  Icon: LucideIcon
  label: string
  isActive: boolean
  isExpanded: boolean
  onClick: () => void
}

function SidebarIconButton({ Icon, label, isActive, isExpanded, onClick }: SidebarIconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center h-10 rounded-full transition-all duration-300 shrink-0 relative',
        // Button always starts at same position, expands to right when hovered
        isExpanded ? 'w-full rounded-[26px]' : 'w-10',
        isActive ? '' : 'bg-transparent hover:bg-gray-50'
      )}
      style={isActive ? { background: activeGradient } : undefined}
      title={!isExpanded ? label : undefined}
    >
      {/* Icon - always in exact same position (centered in 10px width) */}
      <div className="absolute left-0 w-10 h-full flex items-center justify-center">
        <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-black')} />
      </div>
      
      {/* Text label - appears to the right of icon when expanded */}
      {isExpanded && (
        <span 
          className={cn(
            'ml-10 mr-3 text-sm font-medium whitespace-nowrap transition-opacity duration-300',
            isActive ? 'text-white' : 'text-black'
          )}
        >
          {label}
        </span>
      )}
    </button>
  )
}

export function Sidebar({ role: _role = 'patient' }: SidebarProps) {
  const { isOpen, close } = useSidebarContext()
  const [activeIcon, setActiveIcon] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // Detect if device supports touch
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // First box: 2 icons (Theme toggles)
  const firstBoxIcons = [
    { Icon: Sun, label: 'Light Mode' },
    { Icon: Moon, label: 'Dark Mode' },
  ]

  // Second box: 5 icons
  const secondBoxIcons = [
    { Icon: FilePlus, label: 'New Document' },
    { Icon: Lock, label: 'Secure Documents' },
    { Icon: FileText, label: 'Documents' },
    { Icon: Archive, label: 'Archive' },
    { Icon: BarChart3, label: 'Reports' },
  ]

  // Last box: 2 icons
  const lastBoxIcons = [
    { Icon: HelpCircle, label: 'Help' },
    { Icon: ArrowLeft, label: 'Back' },
  ]

  const handleIconClick = (label: string) => {
    setActiveIcon(activeIcon === label ? null : label)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      {/* Spacer - maintains layout space for collapsed sidebar */}
      <div className="hidden md:block w-16 shrink-0" />

      {/* Sidebar - overlays content when expanded */}
      <aside
        onMouseEnter={() => {
          // Only enable hover expansion on non-touch devices
          if (!isTouchDevice) {
            setIsHovered(true)
          }
        }}
        onMouseLeave={() => {
          if (!isTouchDevice) {
            setIsHovered(false)
          }
        }}
        className={cn(
          'fixed left-0 z-50 bg-[#F5F4F0] transition-all duration-300 ease-in-out',
          // Responsive top position: mobile navbar is shorter
          'top-[52px] md:top-[68px]',
          // Responsive height
          'h-[calc(100vh-52px)] md:h-[calc(100vh-68px)]',
          // Mobile behavior
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          // Width: always 16 on mobile, expands on hover for desktop
          'w-16',
          // Only expand on hover for desktop (non-touch devices)
          isHovered && !isTouchDevice && 'md:w-56'
        )}
      >
        <div className="flex h-full flex-col p-2 gap-2">
          {/* First Box - 2 icons */}
          <div className="flex flex-col gap-2 rounded-[40px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-1 overflow-hidden">
            {firstBoxIcons.map(({ Icon, label }) => (
              <SidebarIconButton
                key={label}
                Icon={Icon}
                label={label}
                isActive={activeIcon === label}
                isExpanded={isHovered}
                onClick={() => handleIconClick(label)}
              />
            ))}
          </div>

          {/* Second Box - 5 icons */}
          <div className="flex-1 flex flex-col gap-2 rounded-[40px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-1 overflow-y-auto overflow-x-hidden">
            {secondBoxIcons.map(({ Icon, label }) => (
              <SidebarIconButton
                key={label}
                Icon={Icon}
                label={label}
                isActive={activeIcon === label}
                isExpanded={isHovered}
                onClick={() => handleIconClick(label)}
              />
            ))}
          </div>

          {/* Last Box - 2 icons */}
          <div className="flex flex-col gap-2 rounded-[40px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-1 overflow-hidden">
            {lastBoxIcons.map(({ Icon, label }) => (
              <SidebarIconButton
                key={label}
                Icon={Icon}
                label={label}
                isActive={activeIcon === label}
                isExpanded={isHovered}
                onClick={() => handleIconClick(label)}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
