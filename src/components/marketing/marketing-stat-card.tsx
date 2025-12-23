'use client'

import { ArrowUp } from 'lucide-react'

interface MarketingStatCardProps {
  title: string
  value: string
  change: string
  changeLabel: string
  changeLabelColor?: string
}

export function MarketingStatCard({ 
  title, 
  value, 
  change, 
  changeLabel,
  changeLabelColor = '#777777'
}: MarketingStatCardProps) {
  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white">
      {/* Label */}
      <div className="flex items-stretch gap-2 sm:gap-2.5">
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777] truncate">
          {title}
        </p>
      </div>

      {/* Big Number */}
      <div className="flex items-stretch gap-2 sm:gap-2.5">
        <p className="text-xl sm:text-2xl md:text-[25px] font-semibold leading-[1.193em] tracking-[-0.04em] text-black">
          {value}
        </p>
      </div>

      {/* Trend Row */}
      <div className="flex items-center gap-2 sm:gap-2.5 bg-white flex-wrap">
        {change && (
          <div className="flex items-center justify-center gap-0.5 px-2 sm:px-2.5 py-1 rounded-[10px] bg-[#DEF8EE]">
            <ArrowUp className="w-3 h-3 sm:w-[15px] sm:h-[15px] text-[#10B981]" />
            <span className="text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em] text-[#10B981]">
              {change}
            </span>
          </div>
        )}
        <span className="text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em]" style={{ color: changeLabelColor }}>
          {changeLabel}
        </span>
      </div>
    </div>
  )
}

