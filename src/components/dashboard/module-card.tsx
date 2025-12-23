'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface ModuleCardProps {
  title: string
  description: string
  metrics: Array<{ label: string; value: string }>
  href: string
}

export function ModuleCard({ title, description, metrics, href }: ModuleCardProps) {
  return (
    <Link 
      href={href}
      className="flex flex-col gap-2 sm:gap-[10px] p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white hover:shadow-md transition-shadow cursor-pointer min-h-[44px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-2.5">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-[#2B2820] truncate flex-1">
          {title}
        </h3>
        <div className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F5F4F0] shrink-0">
          <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#2B2820]" />
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col justify-center gap-2 sm:gap-2.5">
        <p className="text-[10px] sm:text-xs font-normal leading-[1.193em] tracking-[-0.03em] text-[#777777]">
          {description}
        </p>
      </div>

      {/* Metrics */}
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <div className="flex items-center justify-center gap-0.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-[10px] bg-[#DEF8EE]">
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#10B981]">
                {metric.value}
              </span>
            </div>
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
              {metric.label}
            </span>
          </div>
        ))}
      </div>
    </Link>
  )
}

