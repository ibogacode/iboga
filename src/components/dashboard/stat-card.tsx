'use client'

import { ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  change: string
  changeLabel: string
  isPositive?: boolean
  isPrimary?: boolean
  /** When true, the change/percentage indicator is hidden (e.g. for Total Revenue) */
  hideChange?: boolean
  /** Optional text shown under the value (e.g. "12 clients") */
  subValue?: string
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  isPositive = true,
  isPrimary = false,
  hideChange = false,
  subValue,
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
      </div>

      {/* Value */}
      <p className={cn(
        "text-xl sm:text-2xl md:text-[25px] font-semibold leading-[1.193em] tracking-[-0.04em]",
        isPrimary ? "text-white" : "text-black"
      )}>
        {value}
      </p>

      {subValue != null && subValue !== '' && (
        <p className={cn(
          "text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em]",
          isPrimary ? "text-white/90" : "text-[#777777]"
        )}>
          {subValue}
        </p>
      )}

      {/* Change Indicator - hidden for cards like Total Revenue */}
      {!hideChange && (
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <div className={cn(
            "flex items-center justify-center gap-0.5 px-2 sm:px-2.5 py-1 rounded-[10px]",
            isPositive ? "bg-[#DEF8EE]" : "bg-[#FEE2E2]"
          )}>
            {isPositive ? (
              <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#10B981]" />
            ) : (
              <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#EF4444]" />
            )}
            <span className={cn(
              "text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em]",
              isPositive ? "text-[#10B981]" : "text-[#EF4444]"
            )}>
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
      )}
    </div>
  )
}

