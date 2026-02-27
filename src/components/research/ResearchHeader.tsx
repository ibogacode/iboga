'use client'

import { FilterBar } from './FilterBar'

interface ResearchHeaderProps {
  onExport?: () => void
  isExporting?: boolean
}

export function ResearchHeader({ onExport, isExporting }: ResearchHeaderProps) {
  return (
    <div className="space-y-4">
      <FilterBar onExport={onExport} isExporting={isExporting} />
    </div>
  )
}
