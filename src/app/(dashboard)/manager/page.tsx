import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/stat-card'
import { ProgramsCard } from '@/components/dashboard/programs-card'
import { GraphCard } from '@/components/dashboard/graph-card'
import { ModuleCard } from '@/components/dashboard/module-card'
import { getDashboardStats } from '@/actions/dashboard-stats.action'

export const metadata = {
  title: 'Dashboard',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function ManagerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/manager')
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

  const statsResult = await getDashboardStats({})
  const stats = statsResult?.data?.success ? statsResult.data.data : null
  const monthlyRevenueValue = stats?.monthlyRevenue ?? 0
  const monthlyRevenueChangePercent = stats?.monthlyRevenueChangePercent ?? null
  const totalRevenueValue = stats?.totalRevenue ?? 0
  const totalClientCount = stats?.totalClientCount ?? 0
  const activePatientsValue = stats?.activePatients ?? 0
  const activeClientsChangePercent = stats?.activeClientsChangePercent ?? null
  const facilityUtilizationValue = stats?.facilityUtilization ?? 0
  const programsByType = stats?.programsByType ?? [
    { name: 'Neurological', patientCount: 0 },
    { name: 'Mental Health', patientCount: 0 },
    { name: 'Addiction', patientCount: 0 },
  ]
  const facilityUtilizationMonth = stats?.facilityUtilizationMonth ?? 0

  const activeClientsChangeLabel =
    activeClientsChangePercent !== null
      ? `${activeClientsChangePercent >= 0 ? '+' : ''}${activeClientsChangePercent}%`
      : '—'
  const activeClientsChangePositive = activeClientsChangePercent === null || activeClientsChangePercent >= 0

  const monthlyChangeLabel =
    monthlyRevenueChangePercent !== null
      ? `${monthlyRevenueChangePercent >= 0 ? '+' : ''}${monthlyRevenueChangePercent}%`
      : '—'
  const monthlyChangePositive = monthlyRevenueChangePercent === null || monthlyRevenueChangePercent >= 0

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
          value={formatCurrencyShort(monthlyRevenueValue)}
          change={monthlyChangeLabel}
          changeLabel="vs last month"
          isPositive={monthlyChangePositive}
          isPrimary={true}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrencyShort(totalRevenueValue)}
          change="—"
          changeLabel="All agreements"
          isPositive={true}
          hideChange
          subValue={`${totalClientCount} client${totalClientCount === 1 ? '' : 's'}`}
        />
        <StatCard
          title="Active Clients"
          value={String(activePatientsValue)}
          change={activeClientsChangeLabel}
          changeLabel="vs last month"
          isPositive={activeClientsChangePositive}
        />
        <StatCard
          title="Facility Utilization"
          value={`${facilityUtilizationValue}%`}
          change={`${facilityUtilizationValue}%`}
          changeLabel="of capacity"
          isPositive={true}
        />
      </div>

      {/* Programs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-[25px]">
        <ProgramsCard
          programs={programsByType}
          facilityUtilizationPercent={facilityUtilizationMonth}
        />
        <GraphCard />
      </div>

      {/* Modules Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-[25px]">
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
