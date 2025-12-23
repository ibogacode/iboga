'use client'

const outcomes = [
  { label: 'Full Success', percentage: '86%', width: '86%' },
  { label: 'Partial Improvement', percentage: '60%', width: '60%' },
  { label: 'Minimal / No Change', percentage: '30%', width: '30%' },
]

export function TreatmentOutcomeCard() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Treatment Outcome Distribution
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Across all diagnoses
        </p>
      </div>

      {/* Outcome Bars */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {outcomes.map((outcome, index) => (
          <div key={index} className="flex flex-col justify-between h-auto sm:h-9">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#1C1C1C]">
                {outcome.label}
              </span>
              <span className="text-[10px] sm:text-xs leading-[1.5em] text-[#1C1C1C]">
                {outcome.percentage}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#F5F4F0] overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[rgba(255,255,255,0.2)] via-[rgba(255,255,255,0.4)] to-[#A8C5DA]"
                style={{ width: outcome.width }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

