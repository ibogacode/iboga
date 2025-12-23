'use client'

import { Button } from '@/components/ui/button'

export function NeedAssistanceCard() {
  return (
    <div className="flex flex-row items-center gap-2.5 p-6 rounded-2xl bg-[#6E7A46]">
      <div className="flex flex-col gap-1 flex-1">
        <h3 className="text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-white">
          Need Assistance?
        </h3>
        <p className="text-base font-normal leading-[1.48em] tracking-[-0.04em] text-white">
          Message your care coordinator anytime with questions.
        </p>
      </div>
      <Button 
        className="px-4 py-2.5 rounded-3xl bg-white text-[#6E7A46] text-sm leading-[1.193em] tracking-[-0.04em] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] hover:bg-white/90"
      >
        Contact Care Team
      </Button>
    </div>
  )
}

