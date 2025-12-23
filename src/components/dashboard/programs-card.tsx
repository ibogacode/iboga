'use client'

interface Program {
  name: string
  patients: string
  success: string
  margin: string
}

const programs: Program[] = [
  { name: "Parkinson's", patients: "12 patients", success: "82% success", margin: "Margin 61%" },
  { name: "PTSD", patients: "12 patients", success: "82% success", margin: "Margin 61%" },
  { name: "Addiction", patients: "12 patients", success: "82% success", margin: "Margin 61%" },
]

export function ProgramsCard() {
  return (
    <div className="flex flex-col gap-2 sm:gap-[10px] p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Programs
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          High-level view by diagnosis
        </p>
      </div>

      {/* Program Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
        {programs.map((program, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 sm:gap-2.5 p-3 sm:p-[17px] rounded-lg sm:rounded-[13px] bg-[#F5F4F0]"
          >
            <h4 className="text-xs sm:text-sm font-medium leading-[1.193em] tracking-[-0.04em] text-black">
              {program.name}
            </h4>
            <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#6B7280]">
              {program.patients} • {program.success}
            </p>
            <p className="text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em] text-[#10B981]">
              {program.margin}
            </p>
          </div>
        ))}
      </div>

      {/* Facility Capacity Utilization */}
      <div className="flex flex-col gap-2 sm:gap-2.5 pt-2 sm:pt-2.5 px-2 sm:px-2.5">
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
          Facility Capacity Utilization
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-[#F5F4F0] overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#6E7A46] to-[#CAE081]"
              style={{ width: '92%' }}
            />
          </div>
          <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#6B7280] whitespace-nowrap">
            92%
          </span>
        </div>
      </div>
    </div>
  )
}

