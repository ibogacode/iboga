import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentsClient } from './documents-client'
import { getPatientTasks } from '@/actions/patient-tasks.action'
import { getTaperingScheduleForPatient } from '@/actions/tapering-schedule.action'

export const metadata = {
  title: 'Documents | Patient Portal',
}

export default async function PatientDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/patient/documents')
  }

  // Fetch completed forms, tapering schedule, and onboarding upload status in parallel
  let completedDocuments: any[] = []
  let taperingScheduleData: any = null
  let onboardingUploadContext: {
    onboardingId: string
    hasEkg: boolean
    hasBloodwork: boolean
    ekgSkipped: boolean
    bloodworkSkipped: boolean
  } | null = null

  try {
    const [tasksResult, taperingResult] = await Promise.all([
      getPatientTasks({}),
      getTaperingScheduleForPatient({ patient_id: user.id }),
    ])

    if (tasksResult?.data?.success && tasksResult.data.data?.tasks) {
      const tasks = tasksResult.data.data.tasks as any[]
      // Filter to only show completed forms (exclude onboarding upload tasks from "completed documents" grid)
      completedDocuments = tasks.filter(
        (task: any) =>
          task.status === 'completed' &&
          task.formId &&
          task.type !== 'onboarding_ekg_upload' &&
          task.type !== 'onboarding_bloodwork_upload' &&
          task.type !== 'onboarding_consult_clinical_director'
      )
      // Sort by completion date (most recent first)
      completedDocuments.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return dateB - dateA
      })

      const onboardingStatus = tasksResult.data.data.onboardingStatus as {
        isInOnboarding?: boolean
        onboardingId?: string
        ekgSkipped?: boolean
        bloodworkSkipped?: boolean
      } | undefined
      if (onboardingStatus?.isInOnboarding && onboardingStatus?.onboardingId) {
        const ekgTask = tasks.find((t: any) => t.type === 'onboarding_ekg_upload')
        const bloodworkTask = tasks.find((t: any) => t.type === 'onboarding_bloodwork_upload')
        onboardingUploadContext = {
          onboardingId: onboardingStatus.onboardingId,
          hasEkg: ekgTask?.status === 'completed',
          hasBloodwork: bloodworkTask?.status === 'completed',
          ekgSkipped: onboardingStatus.ekgSkipped ?? false,
          bloodworkSkipped: onboardingStatus.bloodworkSkipped ?? false,
        }
      }
    }

    // Get tapering schedule if sent to patient
    if (taperingResult?.data?.success && taperingResult.data.data) {
      taperingScheduleData = taperingResult.data.data
    }
  } catch (error) {
    console.error('[PatientDocumentsPage] Error fetching documents:', error)
  }

  return (
    <DocumentsClient
      documents={completedDocuments}
      taperingSchedule={taperingScheduleData}
      onboardingUpload={onboardingUploadContext}
    />
  )
}
