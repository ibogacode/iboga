import { MarketingStatCard } from '@/components/marketing/marketing-stat-card'
import { ConversionOutcomesTable } from '@/components/research/conversion-outcomes-table'
import { TreatmentOutcomeCard } from '@/components/research/treatment-outcome-card'
import { ReportGeneratorCard } from '@/components/research/report-generator-card'

export const metadata = {
  title: 'Research',
}

export default function ResearchPage() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
      {/* Header Section */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
          Research Overview
        </h1>
        <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-black">
          Treatment outcomes, conversion, and profitability by diagnosis.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-[25px]">
        <MarketingStatCard
          title="Patients with Data"
          value="234"
          change=""
          changeLabel="Across diagnoses"
        />
        <MarketingStatCard
          title="Data Points Collected"
          value="18.9K"
          change=""
          changeLabel="Daily Forms & Vitals"
        />
        <MarketingStatCard
          title="Active Studies"
          value="4"
          change=""
          changeLabel="Parkinson's • PTSD • Addiction"
          changeLabelColor="#10B981"
        />
        <MarketingStatCard
          title="Published Reports"
          value="6"
          change=""
          changeLabel="Ready for sharing / SEO"
        />
      </div>

      {/* Conversion & Outcomes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-[25px]">
        <ConversionOutcomesTable />
        <TreatmentOutcomeCard />
      </div>

      {/* Report Generator Section */}
      <div>
        <ReportGeneratorCard />
      </div>
    </div>
  )
}
