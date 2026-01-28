import { TourStep } from '@/contexts/tour-context'

/**
 * Tour Steps Configuration
 * 
 * To add a new step:
 * 1. Add a new TourStep object to this array
 * 2. Add the data-tour attribute to the target element in your component
 * 3. Ensure the route matches the page where the element exists
 * 
 * Properties:
 * - id: Unique identifier for the step
 * - route: (Optional) Route to navigate to before showing this step
 * - selector: The value of the data-tour attribute on the target element
 * - title: Tooltip title
 * - content: Tooltip description
 * - placement: (Optional) Preferred tooltip position (defaults to 'bottom')
 * - waitForSelector: (Optional) Max milliseconds to wait for element (defaults to 2000)
 */
export const tourSteps: TourStep[] = [
  // Step 1: Welcome to the Guide (centered, no target element)
  {
    id: 'welcome-guide',
    selector: '', // Empty selector means no target element - will be centered
    title: 'Welcome to the Guide',
    content: 'This guided tour will help you navigate the patient portal. Click "Next" to continue through the tour.',
    placement: 'center',
  },

  // Step 2: Dashboard Header
  {
    id: 'dashboard-header',
    route: '/patient',
    selector: 'tour-dashboard-header',
    title: 'Dashboard Overview',
    content: 'This is your dashboard. Here you can see your personalized greeting and overview of your treatment journey.',
    placement: 'bottom',
  },

  // Step 3: Pending Tasks Area
  {
    id: 'dashboard-pending-tasks',
    route: '/patient',
    selector: 'tour-dashboard-pending-tasks',
    title: 'Pending Tasks',
    content: 'This section shows your pending tasks that need to be completed. Complete these to finalize your preparation.',
    placement: 'bottom',
  },

  // Step 4: Progress Bar
  {
    id: 'dashboard-progress',
    route: '/patient',
    selector: 'tour-dashboard-progress',
    title: 'Progress Tracker',
    content: 'This progress bar shows how many forms you have completed. Track your progress here as you complete required tasks.',
    placement: 'bottom',
  },

  // Step 5: Notifications Icon
  {
    id: 'dashboard-notifications',
    route: '/patient',
    selector: 'tour-dashboard-notifications',
    title: 'Notifications',
    content: 'Click the bell icon to view your notifications and unread messages.',
    placement: 'bottom',
  },

  // Step 6: Sidebar Tasks Tab
  {
    id: 'sidebar-tasks',
    route: '/patient',
    selector: 'tour-sidebar-tasks',
    title: 'Tasks Navigation',
    content: 'Click here to navigate to the Tasks page where you can see all your tasks and their status.',
    placement: 'right',
  },

  // Step 7: Tasks Page - Not Started Filter
  {
    id: 'tasks-incomplete-button',
    route: '/patient/tasks',
    selector: 'tour-tasks-incomplete-button',
    title: 'Not Started Tasks',
    content: 'Use this filter to see tasks that need to be started. Click "Start" on any task to begin working on it.',
    placement: 'bottom',
    waitForSelector: 3000, // Give more time for tasks to load
  },

  // Step 8: Tasks Page - Completed Filter
  {
    id: 'tasks-completed-button',
    route: '/patient/tasks',
    selector: 'tour-tasks-completed-button',
    title: 'Completed Tasks',
    content: 'Use this filter to see your completed tasks. Click "View" on any completed task to review it.',
    placement: 'bottom',
    waitForSelector: 3000,
  },

  // Step 9: Sidebar Documents Tab
  {
    id: 'sidebar-documents',
    route: '/patient/tasks',
    selector: 'tour-sidebar-documents',
    title: 'Documents Navigation',
    content: 'Click here to navigate to the Documents page where you can view all your uploaded documents.',
    placement: 'right',
  },

  // Step 10: Documents Page - Documents List
  {
    id: 'documents-list',
    route: '/patient/documents',
    selector: 'tour-documents-list',
    title: 'Documents',
    content: 'This is where all your documents appear. You can view, download, and manage your documents here.',
    placement: 'bottom',
    waitForSelector: 3000,
  },

  // Step 11: Profile Avatar/Menu
  {
    id: 'profile-avatar',
    route: '/patient/documents',
    selector: 'tour-profile-avatar',
    title: 'Profile Menu',
    content: 'Click your profile avatar in the top-right corner to open your profile menu and access account settings.',
    placement: 'bottom',
  },

  // Step 12: Profile Image Control (navigate to profile page)
  {
    id: 'profile-image',
    route: '/profile',
    selector: 'tour-profile-image',
    title: 'Profile Picture',
    content: 'You can change your profile picture by clicking the "Upload Photo" button. Upload a new image to personalize your account.',
    placement: 'bottom',
    waitForSelector: 3000,
  },

  // Step 13: Profile Name/Details
  {
    id: 'profile-details',
    route: '/profile',
    selector: 'tour-profile-details',
    title: 'Profile Information',
    content: 'Update your name and personal details here. Click "Edit" to modify your information, then click "Save Changes" when done.',
    placement: 'bottom',
    waitForSelector: 3000,
  },

  // Step 14: Change Password (requires security tab to be active)
  {
    id: 'profile-password',
    route: '/profile',
    selector: 'tour-profile-password',
    title: 'Change Password',
    content: 'Click the "Security" tab, then use this section to change your password. Keep your account secure by updating your password regularly.',
    placement: 'bottom',
    waitForSelector: 3000,
  },
]
