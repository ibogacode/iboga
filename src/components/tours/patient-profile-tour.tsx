import type { ReactNode } from 'react'
import type { DriveStep } from 'driver.js'
import { useTour, type PatientProfileTab } from '@/hooks/use-tour.hook'

interface PatientProfileTourProps {
  children: (options: {
    startTourForEarlyStage: () => void
    startTourForFullStage: () => void
    hasSeenTour: boolean
    isRunning: boolean
  }) => ReactNode
  doesHaveOnboarding: boolean
  doesHaveManagement: boolean
  doesHaveBilling: boolean
  /** When provided, the tour will switch to the correct tab before each step so content is visible */
  setActiveTab?: (tab: PatientProfileTab) => void
}

export function PatientProfileTour({
  children,
  doesHaveOnboarding,
  doesHaveManagement,
  doesHaveBilling,
  setActiveTab,
}: PatientProfileTourProps) {
  const { hasSeenTour, isRunning, startTour } = useTour({
    storageKey: 'hasSeenPatientProfileTour',
    setActiveTab,
  })

  function buildCommonSteps(): DriveStep[] {
    return [
      {
        element: '[data-tour="page-header"]',
        popover: {
          title: 'Page header & navigation',
          description:
            'See the patient name and status, and access key actions like Mark as Prospect or Move to Onboarding.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="patient-sidebar"]',
        popover: {
          title: 'Patient quick info',
          description:
            'This card shows the avatar, patient name, lead ID, current stage, and assigned program so you can confirm you are on the right profile.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="key-dates"]',
        popover: {
          title: 'Key dates',
          description:
            'Here you can see when the patient first inquired and set or adjust their planned arrival (treatment start) date.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="notes-section"]',
        popover: {
          title: 'Notes',
          description:
            'Add, edit, and review notes about this patient so all team members stay aligned on the latest context.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="documents-list"]',
        popover: {
          title: 'Documents',
          description:
            'Quickly access uploaded documents such as forms and medical files from this list using the View button.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="tab-navigation"]',
        popover: {
          title: 'Main sections',
          description:
            'Switch between Activity overview, Forms & Docs, Billing (for admins/owners), and Travel details for this patient.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="activity-timeline"]',
        popover: {
          title: 'Activity timeline',
          description:
            'See the key milestones in the patient journey, including application, forms completion, onboarding steps, and treatment progress.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="tasks-card"]',
        popover: {
          title: 'Tasks for this lead',
          description:
            'Track and assign tasks related to this patient, set due dates, and update status as work is completed.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="readiness-card"]',
        popover: {
          title: 'Readiness score',
          description:
            'This score and checklist summarize how ready the patient is for treatment based on forms, payments, labs, medical clearance, and travel.',
          side: 'bottom',
          align: 'center',
        },
      },
    ]
  }

  function buildEarlyStageSteps(): DriveStep[] {
    const steps = [...buildCommonSteps()]

    steps.push(
      {
        element: '[data-tour="forms-table"]',
        popover: {
          title: 'Pre-arrival forms',
          description:
            'Here you can manage the core forms: Application, Medical History, Service Agreement, and Ibogaine Consent, including sending links and marking uploads.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-tour="form-status-badge"]',
        popover: {
          title: 'Form statuses',
          description:
            'Each form shows whether it is Not Started, Pending, or Submitted so you can see what is still outstanding.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="form-actions"]',
        popover: {
          title: 'Form actions',
          description:
            'Use Upload, Fill, Send, and View actions to help patients complete their paperwork or to review submitted forms.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="action-dropdown"]',
        popover: {
          title: 'Next-step workflows',
          description:
            'Use these actions to mark someone as a prospect, move them into onboarding, request labs, or progress them into patient management.',
          side: 'bottom',
          align: 'end',
        },
      }
    )

    return steps
  }

  function buildFullStageOnlySteps(): DriveStep[] {
    const steps: DriveStep[] = []

    if (doesHaveOnboarding) {
      steps.push({
        element: '[data-tour="onboarding-forms"]',
        popover: {
          title: 'Onboarding forms & medical docs',
          description:
            'Once a patient is in onboarding, use this table to track release, consent, regulations, EKG, bloodwork, and scheduling with the clinical team.',
          side: 'bottom',
          align: 'start',
        },
      })
    }

    if (doesHaveBilling) {
      steps.push({
        element: '[data-tour="billing-section"]',
        popover: {
          title: 'Billing (admins/owners)',
          description:
            'Record payments, see history, and manage reminders once a Service Agreement is activated for this patient.',
          side: 'bottom',
          align: 'start',
        },
      })
    }

    if (doesHaveManagement) {
      steps.push({
        element: '[data-tour="travel-section"]',
        popover: {
          title: 'Travel details',
          description:
            'Capture and reference travel information like flights and documents so the team is ready for arrival and departure.',
          side: 'bottom',
          align: 'start',
        },
      })
    }

    return steps
  }

  function getRequiredTabForStep(steps: DriveStep[]): (index: number) => PatientProfileTab | null {
    return (index: number) => {
      const step = steps[index]
      if (!step || typeof step.element !== 'string') return null
      const el = step.element
      if (el.includes('activity-timeline')) return 'overview'
      if (
        el.includes('forms-table') ||
        el.includes('form-status-badge') ||
        el.includes('form-actions') ||
        el.includes('onboarding-forms')
      )
        return 'details'
      if (el.includes('billing-section')) return 'billing'
      if (el.includes('travel-section')) return 'travel'
      return null
    }
  }

  function startTourForEarlyStage() {
    setActiveTab?.('overview')
    const steps = buildEarlyStageSteps()
    startTour(steps, { getRequiredTabForStep: getRequiredTabForStep(steps) })
  }

  function startTourForFullStage() {
    setActiveTab?.('overview')
    const steps = [...buildEarlyStageSteps(), ...buildFullStageOnlySteps()]
    startTour(steps, { getRequiredTabForStep: getRequiredTabForStep(steps) })
  }

  return (
    <>
      {children({
        startTourForEarlyStage,
        startTourForFullStage,
        hasSeenTour,
        isRunning,
      })}
    </>
  )
}

