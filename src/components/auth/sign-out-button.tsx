'use client'

import { useTransition } from 'react'
import { signOutAction } from '@/actions/auth.action'
import { Loader2 } from 'lucide-react'

interface SignOutButtonProps {
  className?: string
  children: React.ReactNode
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction()
    })
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className={className}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing out...
        </>
      ) : (
        children
      )}
    </button>
  )
}

