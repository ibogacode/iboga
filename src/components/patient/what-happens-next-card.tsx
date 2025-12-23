'use client'

import { HelpCircle } from 'lucide-react'

export function WhatHappensNextCard() {
  return (
    <div className="flex items-center gap-4 p-6 rounded-2xl bg-white">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6E7A46] shrink-0">
        <HelpCircle className="w-5 h-5 text-white" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
          What happens next?
        </h3>
        <p className="text-base font-normal leading-[1.48em] tracking-[-0.04em] text-[#777777]">
          Our medical team reviews your completed forms. If anything is missing, your coordinator will message you.
        </p>
      </div>
    </div>
  )
}

