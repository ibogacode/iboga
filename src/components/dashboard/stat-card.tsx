'use client'

import { ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  change: string
  changeLabel: string
  isPositive?: boolean
  isPrimary?: boolean
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  isPositive = true,
  isPrimary = false 
}: StatCardProps) {
  return (
    <div className={cn(
      "flex flex-col gap-2 sm:gap-[10px] p-4 sm:p-5 rounded-xl sm:rounded-2xl",
      isPrimary 
        ? "bg-gradient-to-b from-[#9DB845] to-[#2E3D19] text-white"
        : "bg-white text-black"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex flex-col justify-center gap-2.5 flex-1 min-w-0">
          <p className={cn(
            "text-xs sm:text-sm font-medium leading-[1.193em] tracking-[-0.04em] truncate",
            isPrimary ? "text-white" : "text-[#777777]"
          )}>
            {title}
          </p>
        </div>
        <div className="flex items-center justify-center gap-1 px-1 py-0.5 rounded-md border border-[#D6D2C8] shrink-0">
          <div className="w-3 h-3 sm:w-[15px] sm:h-[15px] rounded-full bg-white" />
          <span className={cn(
            "text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em] hidden sm:inline",
            isPrimary ? "text-white" : "text-[#777777]"
          )}>
            USD
          </span>
          <ArrowDown className={cn(
            "w-2.5 h-2.5 sm:w-3 sm:h-3",
            isPrimary ? "text-white" : "text-[#777777]"
          )} />
        </div>
      </div>

      {/* Value */}
      <p className={cn(
        "text-xl sm:text-2xl md:text-[25px] font-semibold leading-[1.193em] tracking-[-0.04em]",
        isPrimary ? "text-white" : "text-black"
      )}>
        {value}
      </p>

      {/* Change Indicator */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <div className="flex items-center justify-center gap-0.5 px-2 sm:px-2.5 py-1 rounded-[10px] bg-[#DEF8EE]">
          <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#10B981]" />
          <span className="text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em] text-[#10B981]">
            {change}
          </span>
        </div>
        <span className={cn(
          "text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em]",
          isPrimary ? "text-white" : "text-[#777777]"
        )}>
          {changeLabel}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-stretch gap-2 sm:gap-3">
        <Button 
          className={cn(
            "flex-1 h-10 sm:h-auto py-2 sm:py-2.5 px-3 sm:px-4 rounded-2xl sm:rounded-3xl text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] min-h-[44px]",
            isPrimary 
              ? "bg-[#6E7A46] text-white hover:bg-[#6E7A46]/90"
              : "bg-[#6E7A46] text-white hover:bg-[#6E7A46]/90"
          )}
        >
          Export
        </Button>
        <Button 
          variant="outline"
          className={cn(
            "flex-1 h-10 sm:h-auto py-2 sm:py-2.5 px-3 sm:px-4 rounded-2xl sm:rounded-3xl text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] border border-[#6E7A46] min-h-[44px]",
            isPrimary 
              ? "bg-white text-white hover:bg-white/90"
              : "bg-white text-black hover:bg-gray-50"
          )}
        >
          Share
        </Button>
      </div>
    </div>
  )
}

