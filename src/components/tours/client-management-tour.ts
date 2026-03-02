import type { DriveStep } from 'driver.js'

export const CLIENT_MANAGEMENT_TOUR_STORAGE_KEY = 'hasSeenClientManagementTour'

export function getClientManagementTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="page-header"]',
      popover: {
        title: 'Client Management',
        description:
          'This page lists all clients who have been moved to management from onboarding. Use it to see who is present, arriving soon, or discharged, and to access daily and one-time forms.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="stats-cards"]',
      popover: {
        title: 'Summary cards',
        description:
          'Currently Present shows clients in the institute. Total Clients includes arriving and discharged. One-Time Forms shows completion across clients. Current View reflects the active filter count.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="status-filter"]',
      popover: {
        title: 'Filter by status',
        description:
          'Click to show only Currently Present, Arriving Soon, Discharged, or All Clients. Numbers show how many clients are in each group.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="clients-table"]',
      popover: {
        title: 'Clients list',
        description:
          'Table of all clients in management. Each row shows client name, program, status, and arrival date. Use the column headers to sort and the action buttons to work with each client.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-sort"]',
      popover: {
        title: 'Sort',
        description:
          'Click any column header (Client, Program, Status, or Arrival) to sort the list. Client sorts by name; Program by program type; Status by Present, Arriving Soon, or Discharged; Arrival by date. Click again to toggle ascending/descending.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-actions"]',
      popover: {
        title: 'View',
        description:
          'Opens the client profile where you can see their details, documents, notes, forms, billing, and travel info. Use this to review or update client information.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-actions"]',
      popover: {
        title: 'One-Time Forms',
        description:
          'Takes you to complete intake or Parkinson\'s forms. Neurological clients need Parkinson\'s Psychological Report and Mortality Scales. Other programs need the Intake Report. These are completed once per client.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-actions"]',
      popover: {
        title: 'Daily Forms',
        description:
          'Opens the daily forms page for ongoing assessments. Use this to record daily observations, vitals, and progress. Required throughout the client\'s stay.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-actions"]',
      popover: {
        title: 'Discharge',
        description:
          'Marks the client as completed when treatment is done. Sets their actual departure date to today and moves them to the Discharged list. Only shown for active clients.',
        side: 'top',
        align: 'start',
      },
    },
  ]
}
