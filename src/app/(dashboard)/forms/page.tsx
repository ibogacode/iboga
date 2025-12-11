'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MoreVertical } from 'lucide-react'

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
    'Treatment Plan',
    'Medical History',
    'Medication Log',
    'Therapy Session Notes',
  ]

  const onboardingForms = [
    'Intake Form',
    'Health Assessment',
    'Emergency Contact',
    'Insurance Information',
  ]

  interface FormBoxProps {
    title: string
    forms: string[]
  }

  function FormBox({ title, forms }: FormBoxProps) {
    return (
      <div className="flex flex-col gap-5 p-5 md:p-6 rounded-2xl bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
        <h3 
          className="text-center"
          style={{
            color: 'black',
            fontSize: 20,
            fontFamily: 'SF Pro Text',
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
        <div className="flex flex-col gap-5">
          {forms.map((formName) => (
            <div
              key={formName}
              className="flex items-center justify-between gap-2.5 px-2.5 py-2.5 rounded-[50px] bg-[#F5F4F0] hover:bg-[#F5F4F0]/80 transition-colors cursor-pointer"
            >
              <span
                style={{
                  fontFamily: 'SF Pro Text',
                  fontSize: '16px',
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
              <button className="flex items-center justify-center w-[30px] h-[31px] p-[11px_3px] rounded-full bg-white hover:bg-gray-50 transition-colors shrink-0">
                <MoreVertical className="h-[18px] w-[18px] text-black" />
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
            fontFamily: 'SF Pro Text',
            fontWeight: '400',
            wordWrap: 'break-word',
            marginTop: '8px',
            marginBottom: '16px'
          }}
        >
          Access, manage, and distribute all standardized institute documents.
        </p>
        
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
            style={activeFilter === 'all' ? { background: activeGradient } : undefined}
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
            style={activeFilter === 'active' ? { background: activeGradient } : undefined}
          >
            Active
          </button>
        </div>
      </div>

      {/* Three Form Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 mt-8 max-w-[1400px]">
        <FormBox title="Administration" forms={administrationForms} />
        <FormBox title="Services" forms={servicesForms} />
        <FormBox title="Onboarding" forms={onboardingForms} />
      </div>
    </div>
  )
}

