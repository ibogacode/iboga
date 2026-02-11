'use client'

import { PauseCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ProspectBadge() {
  return (
    <Badge
      variant="outline"
      className="bg-amber-50 text-amber-700 border-amber-200 shrink-0"
    >
      <PauseCircle className="h-3 w-3 mr-1" />
      Prospect
    </Badge>
  )
}
