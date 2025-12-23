'use client'

const diagnoses = [
  { name: "Parkinson's", inquiries: '68', conversion: '41%', successRate: '80%', margin: '61%' },
  { name: 'PTSD', inquiries: '54', conversion: '36%', successRate: '70%', margin: '42%' },
  { name: 'Addiction', inquiries: '92', conversion: '29%', successRate: '65%', margin: '48%' },
]

export function ConversionOutcomesTable() {
  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Conversion & Outcomes by Diagnosis
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Inquiry → Scheduled → Arrived and success rate
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex gap-0 min-w-[600px] sm:min-w-0">
        {/* Diagnosis Column */}
        <div className="flex flex-col flex-1 min-w-[100px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Diagnosis
            </span>
          </div>
          {diagnoses.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
                {item.name}
              </span>
            </div>
          ))}
        </div>

        {/* Inquiries Column */}
        <div className="flex flex-col flex-1 min-w-[80px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Inquiries
            </span>
          </div>
          {diagnoses.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
                {item.inquiries}
              </span>
            </div>
          ))}
        </div>

        {/* Conversion Column */}
        <div className="flex flex-col flex-1 min-w-[80px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Conversion
            </span>
          </div>
          {diagnoses.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className={`text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] ${
                index === 0 || index === 2 ? 'text-[#10B981]' : 'text-[#F59E0B]'
              }`}>
                {item.conversion}
              </span>
            </div>
          ))}
        </div>

        {/* Success Rate Column */}
        <div className="flex flex-col flex-1 min-w-[90px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Success Rate
            </span>
          </div>
          {diagnoses.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className={`text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] ${
                index === 0 ? 'text-[#10B981]' : index === 1 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
              }`}>
                {item.successRate}
              </span>
            </div>
          ))}
        </div>

        {/* Margin Column */}
        <div className="flex flex-col flex-1 min-w-[80px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Margin
            </span>
          </div>
          {diagnoses.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className={`text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] ${
                index === 0 ? 'text-[#10B981]' : index === 1 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
              }`}>
                {item.margin}
              </span>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

