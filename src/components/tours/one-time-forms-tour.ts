import type { DriveStep } from 'driver.js'

export const ONE_TIME_FORMS_TOUR_STORAGE_KEY = 'hasSeenOneTimeFormsTour'

export function getOneTimeFormsTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="page-header"]',
      popover: {
        title: 'One-Time Forms',
        description:
          'These forms are completed once per client during their stay. Which forms appear depends on the client’s program (e.g. Neurological vs Addiction).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="back-nav"]',
      popover: {
        title: 'Back to Client Management',
        description: 'Use this button to return to the client list and select another client.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="forms-grid"]',
      popover: {
        title: 'Form cards',
        description:
          'Each card is one form: Medical Intake Report (all programs), Psychological Intake (non-neurological), or Parkinson’s reports (neurological only). Use Fill Form to complete or View Form to review.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="medical-history-section"]',
      popover: {
        title: 'Medical Health History',
        description: 'If a medical history document was uploaded, you can view or hide it here.',
        side: 'top',
        align: 'start',
      },
    },
  ]
}
