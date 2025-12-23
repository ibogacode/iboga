'use client'

const keywords = [
  { keyword: "ibogaine parkinson's treatment", position: '#3', change: '↑ 4', clicks: '420' },
  { keyword: 'ibogaine ptsd clinic mexico', position: '#5', change: '↑ 2', clicks: '420' },
  { keyword: 'ibogaine for opioid addiction', position: '#9', change: '↓ 3', clicks: '420' },
]

export function SEOKeywordTable() {
  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          SEO & Keyword Performance
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Search Console overview
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex gap-0 min-w-[600px] sm:min-w-0">
        {/* Keyword Column */}
        <div className="flex flex-col w-[200px] sm:w-[261px]">
          <div className="flex flex-col justify-center gap-1 py-2 pr-2 sm:pr-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Keyword
            </span>
          </div>
          {keywords.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 pr-2 sm:pr-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820] break-words">
                {item.keyword}
              </span>
            </div>
          ))}
        </div>

        {/* Position Column */}
        <div className="flex flex-col flex-1 min-w-[80px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Position
            </span>
          </div>
          {keywords.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
                {item.position}
              </span>
            </div>
          ))}
        </div>

        {/* Change Column */}
        <div className="flex flex-col flex-1 min-w-[80px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Change
            </span>
          </div>
          {keywords.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className={`text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] ${
                item.change.startsWith('↑') ? 'text-[#10B981]' : 'text-[#EF4444]'
              }`}>
                {item.change}
              </span>
            </div>
          ))}
        </div>

        {/* Clicks Column */}
        <div className="flex flex-col flex-1 min-w-[80px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Clicks
            </span>
          </div>
          {keywords.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
                {item.clicks}
              </span>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

