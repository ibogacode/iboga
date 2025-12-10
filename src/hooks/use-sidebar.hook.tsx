'use client'

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'

interface UseSidebarReturn {
  isOpen: boolean
  isCollapsed: boolean
  toggle: () => void
  open: () => void
  close: () => void
  toggleCollapse: () => void
  setCollapsed: (collapsed: boolean) => void
}

export function useSidebar(): UseSidebarReturn {
  const [isOpen, setIsOpen] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggle = useCallback(() => setIsOpen(prev => !prev), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggleCollapse = useCallback(() => setIsCollapsed(prev => !prev), [])
  const setCollapsed = useCallback((collapsed: boolean) => setIsCollapsed(collapsed), [])

  return {
    isOpen,
    isCollapsed,
    toggle,
    open,
    close,
    toggleCollapse,
    setCollapsed,
  }
}

// Context version for sharing sidebar state across components
const SidebarContext = createContext<UseSidebarReturn | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const sidebar = useSidebar()
  
  return (
    <SidebarContext.Provider value={sidebar}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarContext(): UseSidebarReturn {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider')
  }
  return context
}
