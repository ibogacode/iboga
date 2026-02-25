'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { UserProvider } from '@/contexts/user.context'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <UserProvider>
        {children}
        <Toaster position="top-right" />
      </UserProvider>
    </ThemeProvider>
  )
}


