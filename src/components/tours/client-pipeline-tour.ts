import type { DriveStep } from 'driver.js'

export const CLIENT_PIPELINE_TOUR_STORAGE_KEY = 'hasSeenClientPipelineTour'

export function getClientPipelineTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="page-header"]',
      popover: {
        title: 'Client Pipeline',
        description:
          'Track all inquiries and applications here. Use the steps below to add clients, filter leads, and manage applications.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="add-client-btn"]',
      popover: {
        title: 'Add Client',
        description:
          'Creates a new invite. Opens a modal to capture basic info and send the client an application link.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="add-existing-btn"]',
      popover: {
        title: 'Add Existing',
        description:
          'Links someone who already has a profile in the system. Use this when the person was created elsewhere or has an existing record.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="filters"]',
      popover: {
        title: 'Filters',
        description:
          'Narrow by date range (All time, Last 7/30/90 days, or custom), Program (Neurological, Mental Health, Addiction), and Source (e.g. Instagram, Web) to find the leads you need.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="stats-cards"]',
      popover: {
        title: 'Summary cards',
        description:
          'Total Inquiries (admin-sent + direct), Prospects (marked as prospect), Ready for onboarding (all 4 forms done), and Estimated pipeline value (inquiries × $7,500).',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="applications-section"]',
      popover: {
        title: 'Applications & invites',
        description:
          'Two tabs: Direct Public Applications (people who applied via the public form) and Admin/Owner Sent Invites (invites sent by staff). Switch tabs to see each list.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="tab-nav"]',
      popover: {
        title: 'Switch between tabs',
        description:
          'Direct Public Applications: people who applied directly. Admin/Owner Sent Invites: invites sent by staff. Click a tab to switch.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="admin-invites-content"]',
      popover: {
        title: 'Admin/Owner Sent Invites',
        description:
          'Shows invites sent by staff. Columns: Mode (Minimal/Partial), Sent To, Sent By, Status (forms completed), Sent Date, Action (View).',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="direct-public-table"]',
      popover: {
        title: 'Direct Public Applications',
        description:
          'People who applied via the public form. Columns: Name, Email, Program Type, Status (X/4 forms completed), Submission Date, Action (View). Click View to open the client profile.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-name"]',
      popover: {
        title: 'Name',
        description: 'Applicant name.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-email"]',
      popover: {
        title: 'Email',
        description: 'Contact email.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-program-type"]',
      popover: {
        title: 'Program Type',
        description: 'Neurological, Mental Health, or Addiction.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-status"]',
      popover: {
        title: 'Status',
        description: 'X/4 forms completed. Green = all done.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-submission-date"]',
      popover: {
        title: 'Submission Date',
        description: 'When they applied.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="col-action"]',
      popover: {
        title: 'Action',
        description: 'View opens the profile.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="admin-invites-pagination"]',
      popover: {
        title: 'Pagination (Invites)',
        description:
          'When there are more invites than fit on one page, use Previous and Next to move between pages. Click a page number to jump directly.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tour="direct-public-pagination"]',
      popover: {
        title: 'Pagination (Applications)',
        description:
          'When there are more applications than fit on one page, use Previous and Next to move between pages. Click a page number to jump directly.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tour="prospects-section"]',
      popover: {
        title: 'Prospects list',
        description:
          'Clients marked as prospects. Search, filter by source, and use bulk actions (Email, Delete). Click View to open a prospect profile.',
        side: 'top',
        align: 'start',
      },
    },
  ]
}
