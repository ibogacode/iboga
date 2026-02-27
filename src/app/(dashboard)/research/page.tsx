'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useResearchFilters } from '@/hooks/research/useResearchFilters'
import { ResearchHeader } from '@/components/research/ResearchHeader'
import { OverviewTab } from '@/components/research/overview/OverviewTab'
import { WithdrawalTab } from '@/components/research/withdrawal/WithdrawalTab'
import { ParkinsonsTab } from '@/components/research/parkinsons/ParkinsonsTab'
import { DosingTab } from '@/components/research/dosing/DosingTab'
import { OperationalTab } from '@/components/research/operational/OperationalTab'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export default function ResearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state, setParams, tabs } = useResearchFilters()

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`/research?${params.toString()}`, { scroll: false })
  }

  function handleExport() {
    // TODO: Export current tab data as CSV
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1
          style={{
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '44px',
            fontWeight: 400,
            color: 'black',
            wordWrap: 'break-word',
          }}
          className="text-2xl sm:text-3xl md:text-[44px]"
        >
          Research
        </h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base md:text-lg">
          Simple summaries of how many clients we serve and how programs are doing
        </p>
      </div>

      <ResearchHeader onExport={handleExport} />

      <Tabs value={state.tab} onValueChange={handleTabChange} className="mt-6 w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto border-b border-gray-200 bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-gray-600 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none'
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-h-[400px]">
          {state.tab === 'overview' && <OverviewTab />}
          {state.tab === 'withdrawal' && <WithdrawalTab />}
          {state.tab === 'parkinsons' && <ParkinsonsTab />}
          {state.tab === 'dosing' && <DosingTab />}
          {state.tab === 'operational' && <OperationalTab />}
        </div>
      </Tabs>
    </div>
  )
}
