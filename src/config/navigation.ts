import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  Calendar,
  ClipboardList,
  FileText,
  Heart,
  Pill,
  Plane,
  Car,
  Settings,
  BarChart3,
  Activity,
  Utensils,
  Stethoscope,
  Brain,
  type LucideIcon,
} from 'lucide-react'
import { UserRole } from '@/types'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string | number
  children?: NavItem[]
}

export interface NavigationConfig {
  mainNav: NavItem[]
  secondaryNav: NavItem[]
}

// Navigation items for each role
export const navigationByRole: Record<UserRole, NavigationConfig> = {
  owner: {
    mainNav: [
      { title: 'Dashboard', href: '/owner', icon: LayoutDashboard },
      { title: 'Locations', href: '/owner/locations', icon: Building2 },
      { title: 'Staff', href: '/owner/staff', icon: UserCog },
      { title: 'Patients', href: '/owner/patients', icon: Users },
      { title: 'Calendar', href: '/owner/calendar', icon: Calendar },
      { title: 'Reports', href: '/owner/reports', icon: BarChart3 },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  manager: {
    mainNav: [
      { title: 'Dashboard', href: '/manager', icon: LayoutDashboard },
      { title: 'Staff', href: '/manager/staff', icon: UserCog },
      { title: 'Patients', href: '/manager/patients', icon: Users },
      { title: 'Schedule', href: '/manager/schedule', icon: Calendar },
      { title: 'Reports', href: '/manager/reports', icon: BarChart3 },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  doctor: {
    mainNav: [
      { title: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
      { title: 'My Patients', href: '/doctor/patients', icon: Users },
      { title: 'Treatments', href: '/doctor/treatments', icon: Stethoscope },
      { title: 'Prescriptions', href: '/doctor/prescriptions', icon: Pill },
      { title: 'Schedule', href: '/doctor/schedule', icon: Calendar },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  psych: {
    mainNav: [
      { title: 'Dashboard', href: '/psych', icon: LayoutDashboard },
      { title: 'My Patients', href: '/psych/patients', icon: Users },
      { title: 'Assessments', href: '/psych/assessments', icon: Brain },
      { title: 'Sessions', href: '/psych/sessions', icon: ClipboardList },
      { title: 'Schedule', href: '/psych/schedule', icon: Calendar },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  nurse: {
    mainNav: [
      { title: 'Dashboard', href: '/nurse', icon: LayoutDashboard },
      { title: 'Patients', href: '/nurse/patients', icon: Users },
      { title: 'Visit Forms', href: '/nurse/visits', icon: ClipboardList },
      { title: 'Daily Logs', href: '/nurse/daily-logs', icon: FileText },
      { title: 'Vitals', href: '/nurse/vitals', icon: Activity },
      { title: 'Medications', href: '/nurse/medications', icon: Pill },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  driver: {
    mainNav: [
      { title: 'Dashboard', href: '/driver', icon: LayoutDashboard },
      { title: 'Transport', href: '/driver/transport', icon: Car },
      { title: 'Flights', href: '/driver/flights', icon: Plane },
      { title: 'Schedule', href: '/driver/schedule', icon: Calendar },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  patient: {
    mainNav: [
      { title: 'My Dashboard', href: '/patient', icon: LayoutDashboard },
      { title: 'My Health', href: '/patient/health', icon: Heart },
      { title: 'My Schedule', href: '/patient/schedule', icon: Calendar },
      { title: 'My Forms', href: '/patient/forms', icon: FileText },
      { title: 'Diet Plan', href: '/patient/diet', icon: Utensils },
      { title: 'Medications', href: '/patient/medications', icon: Pill },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
}

// Get navigation for a specific role
export function getNavigationForRole(role: UserRole): NavigationConfig {
  return navigationByRole[role] || navigationByRole.patient
}

// Role display names and colors
export const roleConfig: Record<UserRole, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-purple-500' },
  manager: { label: 'Manager', color: 'bg-blue-500' },
  doctor: { label: 'Doctor', color: 'bg-green-500' },
  psych: { label: 'Psychologist', color: 'bg-teal-500' },
  nurse: { label: 'Nurse', color: 'bg-pink-500' },
  driver: { label: 'Driver', color: 'bg-orange-500' },
  patient: { label: 'Patient', color: 'bg-gray-500' },
}

