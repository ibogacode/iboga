import { MarketingStatCard } from '@/components/marketing/marketing-stat-card'
import { SocialPlatformsCard } from '@/components/marketing/social-platforms-card'
import { FollowersGrowthChart } from '@/components/marketing/followers-growth-chart'
import { LeadSourcesCard } from '@/components/marketing/lead-sources-card'
import { SEOKeywordTable } from '@/components/marketing/seo-keyword-table'
import { ContentLibraryTable } from '@/components/marketing/content-library-table'

export const metadata = {
  title: 'Marketing',
}

export default function MarketingPage() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
      {/* Header Section */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
          Marketing Performance
        </h1>
        <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-black">
          Stay on top of your tasks, monitor progress, and track status.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 md:gap-[25px]">
        <MarketingStatCard
          title="Total Followers"
          value="82.4K"
          change="12%"
          changeLabel="than last month"
        />
        <MarketingStatCard
          title="Engagement Rate"
          value="4.7%"
          change="12%"
          changeLabel="than last month"
        />
        <MarketingStatCard
          title="Website Sessions (30d)"
          value="18.2K"
          change="12%"
          changeLabel="than last month"
        />
        <MarketingStatCard
          title="Articles Published"
          value="112"
          change="+62"
          changeLabel="than last month"
        />
        <MarketingStatCard
          title="SEO Authority"
          value="38"
          change="12%"
          changeLabel="than last month"
        />
      </div>

      {/* Programs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SocialPlatformsCard />
        <FollowersGrowthChart />
      </div>

      {/* Lead Sources Section */}
      <div>
        <LeadSourcesCard />
      </div>

      {/* Bottom Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SEOKeywordTable />
        <ContentLibraryTable />
      </div>
    </div>
  )
}
