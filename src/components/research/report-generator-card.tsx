'use client'

import { ArrowDown, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

const reportTypes = [
  { title: 'Treatment Outcome Report', description: 'Per diagnosis / date range' },
  { title: 'Conversion Analysis Report', description: 'Inquiries → Arrivals by channel' },
  { title: 'Facility Performance Report', description: 'Occupancy, costs, margins' },
]

export function ReportGeneratorCard() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Report Generator
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Generate white papers and internal reports
        </p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 py-2 sm:py-2.5">
        {reportTypes.map((report, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#F5F4F0]"
          >
            <h4 className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-[#2B2820]">
              {report.title}
            </h4>
            <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              {report.description}
            </p>
          </div>
        ))}
      </div>

      {/* Parameters */}
      <div className="flex flex-col justify-center gap-2 sm:gap-2.5 h-auto sm:h-20">
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Parameters
        </p>
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Diagnosis Dropdown */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl sm:rounded-[34px] bg-[#F5F4F0] min-h-[44px]">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-black">
              Diagnosis
            </span>
            <ArrowDown className="w-4 h-4 sm:w-6 sm:h-6 text-black" />
          </div>
          
          {/* Date Range */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl sm:rounded-[34px] bg-[#F5F4F0] min-h-[44px]">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-black">
              Date Range
            </span>
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          </div>

          {/* Generate PDF Button */}
          <Button className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl bg-[#6E7A46] text-white text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] hover:bg-[#6E7A46]/90 min-h-[44px]">
            Generate PDF
          </Button>
        </div>
      </div>
    </div>
  )
}

