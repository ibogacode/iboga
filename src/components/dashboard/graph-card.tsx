'use client'

export function GraphCard() {
  // Dummy chart data - in a real implementation, you'd use a charting library
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const values = [30, 20, 10, 0]
  
  return (
    <div className="flex flex-col gap-4 sm:gap-5 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Programs
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          High-level view by diagnosis
        </p>
        <div className="ml-auto flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Profit Indicator */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-2 sm:px-2.5 py-1.5 sm:py-2.5 rounded-[19px] bg-[#F5F4F0]">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#B6BCA2]" />
            <span className="text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em] text-black">
              Profit
            </span>
          </div>
          {/* Occupancy Indicator */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-2 sm:px-2.5 py-1.5 sm:py-2.5 rounded-[19px] bg-[#F5F4F0]">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#6E7A46]" />
            <span className="text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em] text-black">
              Occupancy
            </span>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="flex items-end justify-between h-[120px] sm:h-[168px] px-2 sm:px-4 pt-3 sm:pt-4 pb-4 sm:pb-7 border-b border-[rgba(28,28,28,0.05)]">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between h-full text-[10px] sm:text-xs text-[rgba(28,28,28,0.4)]">
          <span>30M</span>
          <span>20M</span>
          <span>10M</span>
          <span>0</span>
        </div>
        
        {/* Chart bars */}
        <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 px-2 sm:px-4">
          {months.map((month, index) => {
            // Fixed heights to match design and avoid hydration errors
            const profitHeights = [98.37, 85.85, 96.90, 44.47, 48.74, 93.19]
            const occupancyHeights = [78.70, 68.68, 77.52, 35.58, 38.99, 74.55]
            const profitHeight = profitHeights[index] || 50
            const occupancyHeight = occupancyHeights[index] || 40
            return (
              <div key={month} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="relative w-full flex items-end justify-center gap-0.5 sm:gap-1">
                  {/* Profit bar */}
                  <div 
                    className="w-full rounded-t bg-[#B6BCA2]"
                    style={{ height: `${profitHeight}%` }}
                  />
                  {/* Occupancy bar */}
                  <div 
                    className="w-full rounded-t bg-[#6E7A46]"
                    style={{ height: `${occupancyHeight}%` }}
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-[rgba(28,28,28,0.4)] truncate w-full text-center">{month}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

