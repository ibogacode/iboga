'use client'

import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FloatingTourTriggerProps {
  onClick: () => void
  disabled?: boolean
  /** Optional label for screen readers (default: "Start page guide") */
  ariaLabel?: string
}

/**
 * Fixed bottom-right circle button with a question mark.
 * Use on any page to start that page's guided tour.
 */
export function FloatingTourTrigger({
  onClick,
  disabled = false,
  ariaLabel = 'Start page guide',
}: FloatingTourTriggerProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="fixed bottom-6 right-6 z-[100] h-12 w-12 rounded-full border-2 border-[#6E7A46] bg-white text-[#6E7A46] shadow-lg hover:bg-[#6E7A46]/10 hover:text-[#6E7A46] focus-visible:ring-[#6E7A46]"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title="Start page guide"
    >
      <HelpCircle className="h-6 w-6" />
    </Button>
  )
}
