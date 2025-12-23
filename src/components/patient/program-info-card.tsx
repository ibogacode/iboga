'use client'

export function ProgramInfoCard() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 md:gap-8 lg:gap-[291px] px-4 sm:px-6 md:px-8 py-4 sm:py-[17px] rounded-lg sm:rounded-[13px] bg-white">
      <div className="flex flex-col gap-2 sm:gap-2.5">
        <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-[#6B7280]">
          Program
        </p>
        <p className="text-xs sm:text-sm font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Parkinson's Treatment Program
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:gap-2.5">
        <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-[#6B7280]">
          Location
        </p>
        <p className="text-xs sm:text-sm font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Cozumel Facility
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:gap-2.5">
        <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-[#6B7280]">
          Arrival Date
        </p>
        <p className="text-xs sm:text-sm font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          March 18, 2026
        </p>
      </div>
    </div>
  )
}

