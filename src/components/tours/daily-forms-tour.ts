import type { DriveStep } from 'driver.js'

export const DAILY_FORMS_TOUR_STORAGE_KEY = 'hasSeenDailyFormsTour'

export function getDailyFormsTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="page-header"]',
      popover: {
        title: 'Daily Forms',
        description:
          'Daily forms are completed once per day per client. Psychological and Medical updates apply to all programs; SOWS and OOWS appear only for Addiction.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="back-nav"]',
      popover: {
        title: 'Back to Client Management',
        description: 'Return to the client list to choose another client or view one-time forms.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="date-selection"]',
      popover: {
        title: 'Select date (EST)',
        description: 'Choose the date for which you want to view or fill forms. You can only add or edit forms for today or past dates.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="form-type-cards"]',
      popover: {
        title: 'Form types',
        description:
          'Psychological Update and Medical Update are used for all programs. For Addiction clients, SOWS (Subjective) and OOWS (Objective) withdrawal scales are also available. Click a card to open that form for the selected date.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="forms-history"]',
      popover: {
        title: 'Forms history',
        description: 'See past forms by type. Click a date to open that form. Green check means completed; amber clock means in progress.',
        side: 'top',
        align: 'start',
      },
    },
  ]
}
