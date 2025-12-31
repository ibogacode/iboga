'use client'

import { Check } from 'lucide-react'

interface ProgressTrackerProps {
  formsCompleted?: boolean
}

export function ProgressTracker({ formsCompleted = false }: ProgressTrackerProps) {
  const steps = [
    { name: 'Inquiry', completed: true, current: false },
    { name: 'Forms', completed: formsCompleted, current: !formsCompleted },
    { name: 'Medical Review', completed: false, current: false },
    { name: 'Arrival', completed: false, current: false },
    { name: 'Treatment', completed: false, current: false },
  ]
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
      <div className="relative h-[100px] sm:h-[72px] overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        {/* Steps Container */}
        <div className="relative flex items-start justify-between h-full min-w-[400px] sm:min-w-0">
          {/* Background Line - positioned to align with circle center (8px for w-4, 10px for w-5) */}
          <div className="absolute top-[8px] sm:top-[10px] left-0 right-0 h-0.5 bg-[#D6D2C8] -translate-y-1/2" />
          
          {/* Progress Line (filled up to current step) */}
          {(() => {
            const currentStepIndex = steps.findIndex(s => s.current)
            const completedCount = steps.filter(s => s.completed).length
            // Calculate width: if current step is completed, fill to next step; otherwise fill halfway to current
            let progressWidth = 0
            if (currentStepIndex >= 0) {
              if (steps[currentStepIndex].completed) {
                // If current step is completed, fill to the next step
                progressWidth = currentStepIndex < steps.length - 1 
                  ? ((currentStepIndex + 1) / (steps.length - 1)) * 100
                  : 100
              } else {
                // If current step is not completed, fill halfway to current step
                progressWidth = currentStepIndex > 0
                  ? ((currentStepIndex - 0.5) / (steps.length - 1)) * 100
                  : 0
              }
            } else {
              // Fallback: use completed count
              progressWidth = (completedCount / steps.length) * 100
            }
            
            return (
              <div 
                className="absolute top-[8px] sm:top-[10px] left-0 h-0.5 bg-[#6E7A46] -translate-y-1/2 z-0"
                style={{ 
                  width: `${Math.min(Math.max(progressWidth, 0), 100)}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            )
          })()}

          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center gap-2 sm:gap-3 pt-0 flex-1 min-w-0 relative z-10">
              {/* Step Circle */}
              <div className={`
                flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 shrink-0
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

