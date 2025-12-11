'use client'

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
  ArrowLeft
} from 'lucide-react'

interface SidebarProps {
  role?: UserRole
}

export function Sidebar({ role: _role = 'patient' }: SidebarProps) {
  const { isOpen, close } = useSidebarContext()

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
          'fixed left-0 top-[calc(52px+2rem)] z-40 h-[calc(100vh-52px-2rem)] bg-black transition-all duration-300 md:relative md:top-0 md:h-full md:z-0 w-24',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col p-4 gap-4">
          {/* First Box - 2 icons */}
          <div className="flex flex-col gap-2 rounded-[40px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-2 overflow-hidden">
            {firstBoxIcons.map(({ Icon, label }) => (
              <button
                key={label}
                className="flex items-center justify-center h-12 w-12 rounded-2xl bg-transparent hover:bg-gray-50 transition-colors shrink-0"
                title={label}
              >
                <Icon className="h-5 w-5 text-black" />
              </button>
            ))}
          </div>

          {/* Second Box - 5 icons */}
          <div className="flex-1 flex flex-col gap-2 rounded-[40px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-2 overflow-y-auto">
            {secondBoxIcons.map(({ Icon, label }) => (
              <button
                key={label}
                className="flex items-center justify-center h-12 w-12 rounded-2xl bg-transparent hover:bg-gray-50 transition-colors shrink-0"
                title={label}
              >
                <Icon className="h-5 w-5 text-black" />
              </button>
            ))}
          </div>

          {/* Last Box - 2 icons */}
          <div className="flex flex-col gap-2 rounded-[40px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] p-2 overflow-hidden">
            {lastBoxIcons.map(({ Icon, label }) => (
              <button
                key={label}
                className="flex items-center justify-center h-12 w-12 rounded-2xl bg-transparent hover:bg-gray-50 transition-colors shrink-0"
                title={label}
              >
                <Icon className="h-5 w-5 text-black" />
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
