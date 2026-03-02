import type { DriveStep } from 'driver.js'

export const ONBOARDING_TOUR_STORAGE_KEY = 'hasSeenOnboardingTour'

export function getOnboardingTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="page-header"]',
      popover: {
        title: 'Onboarding',
        description:
          'Clients who have completed all four pipeline forms and been moved to onboarding appear here. Track release forms, consent, regulations, EKG, bloodwork, and scheduling until they are ready for Client Management.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="ready-banner"]',
      popover: {
        title: 'Ready to move',
        description:
          'When a client has completed all onboarding steps, they appear here. Use View to open their profile or move them to Client Management from the table.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="stats-cards"]',
      popover: {
        title: 'Summary cards',
        description:
          'Clients in Onboarding, Completion Rate, Ready for Management, and Pending Steps give you a quick overview of progress across all onboarding clients.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="filter-tabs"]',
      popover: {
        title: 'Filter',
        description: 'Show All, only In Progress, or only Completed clients to focus on what you need.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="clients-table"]',
      popover: {
        title: 'Clients in onboarding',
        description:
          'Table of clients going through onboarding. Each row shows progress and actions.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-steps"]',
      popover: {
        title: 'Steps',
        description:
          'Shows progress (e.g. 5/7). Green when all 7 steps are done; amber when in progress. Steps include Release Form, Outing Consent, Regulations, EKG, Bloodwork, and scheduling.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-treatment-date"]',
      popover: {
        title: 'Set Date',
        description:
          'Assign a treatment date for the client. Click Assign Date to open the calendar. A treatment date is required before moving the client to Management.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-actions"]',
      popover: {
        title: 'Upload',
        description:
          'Forms and documents are uploaded from the client profile. Click View to open the profile.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="action-move-to-management"]',
      popover: {
        title: 'Move to Management',
        description:
          'When all 7 steps are done and a treatment date is assigned, this button appears. Click to move the client to Client Management.',
        side: 'top',
        align: 'start',
      },
    },
  ]
}
