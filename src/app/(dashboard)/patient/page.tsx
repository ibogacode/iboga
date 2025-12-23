import { createClient } from '@/lib/supabase/server'
import { ProgramInfoCard } from '@/components/patient/program-info-card'
import { NeedAssistanceCard } from '@/components/patient/need-assistance-card'
import { ProgressTracker } from '@/components/patient/progress-tracker'
import { PendingTasksCard } from '@/components/patient/pending-tasks-card'
import { WhatHappensNextCard } from '@/components/patient/what-happens-next-card'

export const metadata = {
  title: 'Home | Patient Portal',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export default async function PatientHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user profile with name
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, first_name, last_name')
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
          You're one step closer to your treatment. Complete the tasks below to finalize your preparation.
        </p>
      </div>

      {/* Program Info and Assistance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-[25px]">
        <div className="lg:col-span-2">
          <ProgramInfoCard />
        </div>
        <div>
          <NeedAssistanceCard />
        </div>
      </div>

      {/* Progress Tracker */}
      <div>
        <ProgressTracker />
      </div>

      {/* Pending Tasks */}
      <div>
        <PendingTasksCard />
      </div>

      {/* What Happens Next */}
      <div>
        <WhatHappensNextCard />
      </div>
    </div>
  )
}
