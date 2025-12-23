'use client'

import { Check } from 'lucide-react'

const steps = [
  { name: 'Inquiry', completed: true, current: false },
  { name: 'Forms', completed: true, current: true },
  { name: 'Medical Review', completed: false, current: false },
  { name: 'Arrival', completed: false, current: false },
  { name: 'Treatment', completed: false, current: false },
]

export function ProgressTracker() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Your Progress
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Current step: Forms & Agreements
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative h-[100px] sm:h-[72px] overflow-x-auto">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#D6D2C8] -translate-y-1/2" />
        
        {/* Progress Line (filled up to current step) */}
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-[#6E7A46] -translate-y-1/2"
          style={{ width: '40%' }}
        />

        {/* Steps */}
        <div className="relative flex items-start justify-between h-full min-w-[500px] sm:min-w-0">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center gap-2 sm:gap-3 pt-0 flex-1 min-w-0">
              {/* Step Circle */}
              <div className={`
                flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 relative z-10 shrink-0
                ${step.completed 
                  ? 'bg-[#6E7A46] border-[#6E7A46]' 
                  : step.current
                  ? 'bg-white border-[#6E7A46] border-2'
                  : 'bg-white border-[#D6D2C8] border-2'
                }
              `}>
                {step.completed && (
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                )}
                {step.current && !step.completed && (
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#6E7A46]" />
                )}
              </div>
              
              {/* Step Label */}
              <span className={`
                text-xs sm:text-sm leading-[1.428em] tracking-[-0.01em] text-center
                ${step.completed || step.current ? 'text-black font-medium' : 'text-[#777777]'}
              `}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

