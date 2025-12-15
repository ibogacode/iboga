'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MoreHorizontal, FilePlus } from 'lucide-react'
import { designTokens } from '@/config/design-system'

export default function FormsPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active'>('all')
  
  const activeGradient = 'linear-gradient(180deg, #565656 0%, #1C1C1C 61%), linear-gradient(180deg, #5F5F5F 0%, #262315 100%)'

  // Sample form items for each category
  const administrationForms = [
    'Privacy Policy',
    'Ibogaine Consent',
    'Release Consent',
    'Service Agreement',
    'Outing / Transfer Consent',
    'Social Media Release',
    'Internal Regulations',
  ]

  const servicesForms = [
    'Intake Form (For Parkinson\'s)',
    'Intake Report',
    'Outtake Form',
    'Daily Medical Update',
    'Daily Psychological Update',
    'Parkinson\'s Mortality Scales',
  ]

  const onboardingForms = [
    'Medical Health History',
    'Letter of Informed Dissent',
  ]

  interface FormBoxProps {
    title: string
    forms: string[]
  }

  function FormBox({ title, forms }: FormBoxProps) {
    return (
      <div className="flex flex-col gap-4 sm:gap-5 p-4 sm:p-5 md:p-6 rounded-2xl bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] w-full">
        <h3 
          className="text-center text-base sm:text-lg md:text-xl"
          style={{
            color: 'black',
            fontFamily: designTokens.typography.navItem.fontFamily,
            fontWeight: '500',
            wordWrap: 'break-word'
          }}
        >
          {title}
        </h3>
        <div 
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: '#F5F4F0'
          }}
        />
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
          {forms.map((formName) => (
            <div
              key={formName}
              className="flex items-center justify-between gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-[50px] bg-[#F5F4F0] hover:bg-[#F5F4F0]/80 transition-colors cursor-pointer"
            >
              <span
                className="text-sm sm:text-base"
                style={{
                  fontFamily: designTokens.typography.navItem.fontFamily,
                  fontWeight: 400,
                  lineHeight: '1.193em',
                  letterSpacing: '-0.04em',
                  color: 'black',
                  flex: 1,
                  textAlign: 'center'
                }}
              >
                {formName}
              </span>
              <button className="flex items-center justify-center w-[28px] h-[28px] sm:w-[30px] sm:h-[31px] p-[11px_3px] rounded-full bg-white hover:bg-gray-50 transition-colors shrink-0">
                <MoreHorizontal className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-black" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 
          style={{ 
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '44px',
            fontWeight: 400,
            color: 'black',
            wordWrap: 'break-word'
          }}
        >
          Forms Library
        </h1>
        <p
          style={{
            color: 'black',
            fontSize: 16,
            fontFamily: designTokens.typography.navItem.fontFamily,
            fontWeight: '400',
            wordWrap: 'break-word',
            marginTop: '8px',
            marginBottom: '16px'
          }}
        >
          Access, manage, and distribute all standardized institute documents.
        </p>
        
        {/* Filter buttons and New Form Template button */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Filter buttons in rounded box */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[36px] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              'px-4 h-[32px] rounded-[26px] text-sm md:text-base font-normal leading-[1.193em] tracking-[-0.04em] transition-colors whitespace-nowrap',
              activeFilter === 'all'
                ? 'text-white'
                : 'text-black hover:text-[#2D3A1F]'
            )}
              style={{
                ...(activeFilter === 'all' ? { background: activeGradient } : {}),
                fontFamily: designTokens.typography.navItem.fontFamily,
              }}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('active')}
            className={cn(
              'px-4 h-[32px] rounded-[26px] text-sm md:text-base font-normal leading-[1.193em] tracking-[-0.04em] transition-colors whitespace-nowrap',
              activeFilter === 'active'
                ? 'text-white'
                : 'text-black hover:text-[#2D3A1F]'
            )}
              style={{
                ...(activeFilter === 'active' ? { background: activeGradient } : {}),
                fontFamily: designTokens.typography.navItem.fontFamily,
              }}
          >
            Active
            </button>
          </div>
          
          {/* New Form Template button */}
          <button
            className="inline-flex items-center justify-center gap-3 px-[22px] py-[10px] h-[32px] rounded-[42px] text-white text-sm md:text-base font-normal leading-[1.193em] tracking-[-0.04em] transition-colors whitespace-nowrap hover:opacity-90 ml-auto"
            style={{
              backgroundColor: '#6E7A46',
              fontFamily: designTokens.typography.navItem.fontFamily,
            }}
          >
            <span>New Form Template</span>
            <FilePlus className="h-6 w-6 sm:h-[24px] sm:w-[24px]" />
          </button>
        </div>
      </div>

      {/* Three Form Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 xl:gap-10 mt-8 w-full">
        <FormBox title="Administration" forms={administrationForms} />
        <FormBox title="Services" forms={servicesForms} />
        <FormBox title="Onboarding" forms={onboardingForms} />
      </div>
    </div>
  )
}

