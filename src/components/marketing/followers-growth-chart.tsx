'use client'

import { ArrowDown } from 'lucide-react'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const values = [40, 30, 20, 10, 0]

export function FollowersGrowthChart() {
  return (
    <div className="flex flex-col gap-2.5 p-5 rounded-[10px] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-5">
        <h3 className="text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-[#17181A]">
          Followers Growth
        </h3>
        <div className="flex items-center gap-6">
          {/* Filter */}
          <div className="flex items-center justify-center gap-1 px-1 py-0.5 rounded-md border border-[#D6D2C8]">
            <span className="text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              6 Months
            </span>
            <ArrowDown className="w-3 h-3 text-[#777777]" />
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white">
            <div className="w-[11px] h-[11px] rounded-full border-2 border-[#6E7A46]" />
            <span className="text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Total Profits
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between h-[203px] px-5 pt-5 pb-7">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between h-full text-sm text-[#777777]">
          {values.map((val) => (
            <span key={val}>{val}k</span>
          ))}
        </div>
        
        {/* Chart bars */}
        <div className="flex-1 flex items-end justify-between gap-2 px-4">
          {months.map((month, index) => {
            const height = Math.random() * 60 + 20 // Random height between 20-80%
            return (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full rounded-t bg-gradient-to-t from-[#869064] to-[#FDFFF6] border-2 border-[#6E7A46]"
                  style={{ height: `${height}%` }}
                />
                <span className="text-sm text-[#777777]">{month}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

