import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProgramInfoCard } from '@/components/patient/program-info-card'
import { NeedAssistanceCard } from '@/components/patient/need-assistance-card'
import { ProgressTracker } from '@/components/patient/progress-tracker'
import { PendingTasksCard } from '@/components/patient/pending-tasks-card'
import { WhatHappensNextCard } from '@/components/patient/what-happens-next-card'
import { getPatientTasks, type OnboardingStatus } from '@/actions/patient-tasks.action'

export const metadata = {
  title: 'Home | Patient Portal',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

function formatProgramName(programType: string | null | undefined): string {
  if (!programType) return 'Program Not Selected'
  
  const programMap: Record<string, string> = {
    neurological: "Neurological Treatment Program",
    mental_health: "Mental Health Treatment Program",
    addiction: "Addiction Treatment Program",
  }
  
  return programMap[programType] || 'Program Not Selected'
}

export default async function PatientHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/patient')
  }

  // Get user profile with name and email
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, first_name, last_name, email')
    .eq('id', user.id)
    .single()

  const userName = profile?.name || 
    (profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile?.first_name || 'User')
  const greeting = getGreeting()

  // Get patient's intake form to fetch program type
  let programName = 'Program Not Selected'
  if (profile?.email) {
    const patientEmail = profile.email.trim().toLowerCase()
    const { data: intakeForm } = await supabase
      .from('patient_intake_forms')
      .select('program_type')
      .ilike('email', patientEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (intakeForm?.program_type) {
      programName = formatProgramName(intakeForm.program_type)
    }
  }

  // Fetch patient tasks
  let pendingTasks: any[] = []
  let formsCompleted = false
  let onboardingStatus: OnboardingStatus | null = null
  try {
    const tasksResult = await getPatientTasks({})
    if (tasksResult?.data?.success && tasksResult.data.data?.tasks) {
      const allTasks = tasksResult.data.data.tasks
      
      // Get onboarding status if available
      onboardingStatus = tasksResult.data.data.onboardingStatus || null
      
      // Check if all initial 4 pipeline forms are completed (exclude onboarding forms)
      // Initial forms: intake, medical_history, service_agreement, ibogaine_consent
      const initialFormTypes = ['intake', 'medical_history', 'service_agreement', 'ibogaine_consent']
      const initialForms = allTasks.filter((task: any) => 
        initialFormTypes.includes(task.type) && task.isRequired
      )
      const completedInitialForms = initialForms.filter((task: any) => task.status === 'completed')
      formsCompleted = initialForms.length > 0 && completedInitialForms.length === initialForms.length
      
      // Filter to only show pending tasks (not_started or in_progress)
      pendingTasks = allTasks.filter(
        (task: any) => task.status === 'not_started' || task.status === 'in_progress'
      )
      // Sort: required first, then by status (in_progress before not_started)
      pendingTasks.sort((a, b) => {
        if (a.isRequired && !b.isRequired) return -1
        if (!a.isRequired && b.isRequired) return 1
        if (a.status === 'in_progress' && b.status === 'not_started') return -1
        if (a.status === 'not_started' && b.status === 'in_progress') return 1
        return 0
      })
      // Limit to 4 tasks for the dashboard
      pendingTasks = pendingTasks.slice(0, 4)
    }
  } catch (error) {
    console.error('[PatientHomePage] Error fetching tasks:', error)
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
      {/* Header Section */}
      <div className="space-y-1 sm:space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
          {greeting}, {userName}
        </h1>
            <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-black mt-1 sm:mt-2">
          You're one step closer to your treatment. Complete the tasks below to finalize your preparation.
        </p>
          </div>
          {/* Onboarding Status Badge */}
          {onboardingStatus?.isInOnboarding && (
            <div className="flex-shrink-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-medium text-blue-700">
                  Onboarding: {onboardingStatus.formsCompleted || 0}/{onboardingStatus.formsTotal || 3}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Program Info and Assistance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-[25px]">
        <div className="lg:col-span-2">
          <ProgramInfoCard programName={programName} />
        </div>
        <div>
          <NeedAssistanceCard />
        </div>
      </div>

      {/* Progress Tracker */}
      <div>
        <ProgressTracker formsCompleted={formsCompleted} onboardingStatus={onboardingStatus} />
      </div>

      {/* Pending Tasks */}
      <div>
        <PendingTasksCard tasks={pendingTasks} />
      </div>

      {/* What Happens Next */}
      <div>
        <WhatHappensNextCard />
      </div>
    </div>
  )
}
