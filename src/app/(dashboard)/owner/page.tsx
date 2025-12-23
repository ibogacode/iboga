import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/stat-card'
import { ProgramsCard } from '@/components/dashboard/programs-card'
import { GraphCard } from '@/components/dashboard/graph-card'
import { ModuleCard } from '@/components/dashboard/module-card'

export const metadata = {
  title: 'Dashboard',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export default async function OwnerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user profile with name
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, first_name, last_name')
    .eq('id', user.id)
    .single()

  const userName = profile?.name || 
    (profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile?.first_name || 'User')
  const greeting = getGreeting()
  
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
      {/* Header Section */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
          {greeting}, {userName}
        </h1>
        <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-black">
          Stay on top of your tasks, monitor progress, and track status.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 md:gap-[25px]">
        <StatCard
          title="Monthly Revenue"
          value="$245K"
          change="12%"
          changeLabel="vs last month"
          isPositive={true}
          isPrimary={true}
        />
        <StatCard
          title="Pipeline Value"
          value="$380K"
          change="12%"
          changeLabel="vs last month"
          isPositive={true}
        />
        <StatCard
          title="Active Patients"
          value="14"
          change="12%"
          changeLabel="Stable"
          isPositive={true}
        />
        <StatCard
          title="Facility Utilization"
          value="78%"
          change="12%"
          changeLabel="Good"
          isPositive={true}
        />
        <StatCard
          title="Marketing Reach"
          value="82.4K"
          change="12%"
          changeLabel="This month"
          isPositive={true}
        />
      </div>

      {/* Programs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-[25px]">
        <ProgramsCard />
        <GraphCard />
      </div>

      {/* Modules Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-[25px]">
        <ModuleCard
          title="Marketing Module"
          description="Followers • Posts this week • Leads this month"
          href="/marketing"
          metrics={[
            { label: 'Followers', value: '82.4K' },
            { label: 'Posts this week', value: '18' },
            { label: 'Leads this month', value: '24' },
          ]}
        />
        <ModuleCard
          title="Patient Management"
          description="Active patients • Daily forms • Departures"
          href="/patient-management"
          metrics={[
            { label: 'Active patients', value: '14' },
            { label: 'Daily forms', value: '8' },
            { label: 'Departures', value: '3' },
          ]}
        />
        <ModuleCard
          title="Onboarding"
          description="Patients • Forms pending • Ready for arrival"
          href="/onboarding"
          metrics={[
            { label: 'Patients', value: '12' },
            { label: 'Forms pending', value: '5' },
            { label: 'Ready for arrival', value: '7' },
          ]}
        />
        <ModuleCard
          title="Research Module"
          description="Placeholder"
          href="/research"
          metrics={[
            { label: 'Studies', value: '8' },
            { label: 'Publications', value: '3' },
            { label: 'Ongoing', value: '5' },
          ]}
        />
      </div>
    </div>
  )
}
