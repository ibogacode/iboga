'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useTour } from '@/contexts/tour-context'
import { cn } from '@/lib/utils'

export function TourHelpButton() {
  const { startTour, isActive } = useTour()
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-[9997]">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap transition-opacity duration-200">
          Quick Tour Guide
          {/* Arrow pointing down */}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}

      {/* Help Button */}
      <button
        onClick={() => {
          if (isActive) {
            // If tour is already active, do nothing or restart it
            return
          }
          startTour()
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-full bg-[#2D3A1F] text-white shadow-lg hover:bg-[#1F2A14] transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#2D3A1F] focus:ring-offset-2',
          isActive && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="Start Quick Tour Guide"
        disabled={isActive}
      >
        <HelpCircle className="h-6 w-6" />
      </button>
    </div>
  )
}
