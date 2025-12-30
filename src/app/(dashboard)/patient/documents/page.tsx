import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentsClient } from './documents-client'
import { getPatientTasks } from '@/actions/patient-tasks.action'

export const metadata = {
  title: 'Documents | Patient Portal',
}

export default async function PatientDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/patient/documents')
  }

  // Fetch completed forms
  let completedDocuments: any[] = []
  try {
    const tasksResult = await getPatientTasks({})
    if (tasksResult?.data?.success && tasksResult.data.data?.tasks) {
      // Filter to only show completed forms
      completedDocuments = tasksResult.data.data.tasks.filter(
        (task: any) => task.status === 'completed' && task.formId
      )
      // Sort by completion date (most recent first)
      completedDocuments.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return dateB - dateA
      })
    }
  } catch (error) {
    console.error('[PatientDocumentsPage] Error fetching documents:', error)
  }

  return <DocumentsClient documents={completedDocuments} />
}
