import type { DriveStep } from 'driver.js'

export const FACILITY_MANAGEMENT_TOUR_STORAGE_KEY = 'hasSeenFacilityManagementTour'

export function getFacilityManagementTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="page-header"]',
      popover: {
        title: 'Facility Overview',
        description:
          'See occupancy, bed availability, revenue, and staff load at a glance.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="add-employee-btn"]',
      popover: {
        title: 'Add Employee',
        description:
          'Create new staff accounts with role and optional pay rate.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="stats-cards"]',
      popover: {
        title: 'Overview metrics',
        description:
          'Occupancy (this month), Beds available in the next 30 days, Confirmed revenue, and Staff load percentage help you plan capacity and staffing.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="employees-section"]',
      popover: {
        title: 'Employees',
        description:
          'List of all staff. New employees are added via the Add Employee button in the header.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="edit-employee-action"]',
      popover: {
        title: 'Edit icon (pencil)',
        description:
          'Click the pencil icon in the Actions column to update an employee. You can change their name, email, role, phone, or pay rate per day. A dialog opens where you edit and save. Note: Password cannot be changed from here.',
        side: 'bottom',
        align: 'center',
      },
    },
  ]
}
