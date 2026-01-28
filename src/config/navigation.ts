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
  MessageSquare,
  Home,
  User,
  UserPlus,
  Search,
  UserCheck,
  Megaphone,
  Facebook,
  Instagram,
  Youtube,
  Globe,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'
import { UserRole } from '@/types'

export interface NavItem {
  title: string
  href?: string
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
  admin: {
    mainNav: [
      { title: 'Home', href: '/owner', icon: Home },
      { title: 'Facility Management', href: '/facility-management', icon: Building2 },
      {
        title: 'Client Pipeline',
        href: '/patient-pipeline',
        icon: Users,
        children: [
          { title: 'Consult Scheduling', href: '/patient-pipeline/consult-scheduling', icon: Calendar },
        ],
      },
      { title: 'Onboarding', href: '/onboarding', icon: UserPlus },
      { title: 'Client Management', href: '/patient-management', icon: UserCheck },
      { title: 'Research', href: '/research', icon: Search },
      {
        title: 'Marketing',
        icon: Megaphone,
        children: [
          { title: 'Facebook', href: '/marketing/facebook', icon: Facebook },
          { title: 'Instagram', href: '/marketing/instagram', icon: Instagram },
          { title: 'YouTube', href: '/marketing/youtube', icon: Youtube },
          { title: 'Web', href: '/marketing/web', icon: Globe },
        ],
      },
      { title: 'Messages', href: '/messages', icon: MessageSquare },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  owner: {
    mainNav: [
      { title: 'Home', href: '/owner', icon: Home },
      { title: 'Facility Management', href: '/facility-management', icon: Building2 },
      {
        title: 'Client Pipeline',
        href: '/patient-pipeline',
        icon: Users,
        children: [
          { title: 'Consult Scheduling', href: '/patient-pipeline/consult-scheduling', icon: Calendar },
        ],
      },
      { title: 'Onboarding', href: '/onboarding', icon: UserPlus },
      { title: 'Client Management', href: '/patient-management', icon: UserCheck },
      { title: 'Research', href: '/research', icon: Search },
      {
        title: 'Marketing',
        icon: Megaphone,
        children: [
          { title: 'Facebook', href: '/marketing/facebook', icon: Facebook },
          { title: 'Instagram', href: '/marketing/instagram', icon: Instagram },
          { title: 'YouTube', href: '/marketing/youtube', icon: Youtube },
          { title: 'Web', href: '/marketing/web', icon: Globe },
        ],
      },
      { title: 'Messages', href: '/messages', icon: MessageSquare },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  manager: {
    mainNav: [
      { title: 'Dashboard', href: '/manager', icon: LayoutDashboard },
      { title: 'Client Pipeline', href: '/patient-pipeline', icon: Users },
      { title: 'Client Management', href: '/patient-management', icon: UserCheck },
      { title: 'Onboarding', href: '/onboarding', icon: UserPlus },
      {
        title: 'Marketing',
        icon: Megaphone,
        children: [
          { title: 'Facebook', href: '/marketing/facebook', icon: Facebook },
          { title: 'Instagram', href: '/marketing/instagram', icon: Instagram },
          { title: 'YouTube', href: '/marketing/youtube', icon: Youtube },
          { title: 'Web', href: '/marketing/web', icon: Globe },
        ],
      },
      { title: 'Research', href: '/research', icon: Search },
      { title: 'Messages', href: '/messages', icon: MessageSquare },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  doctor: {
    mainNav: [
      { title: 'Onboarding', href: '/onboarding', icon: UserPlus },
      { title: 'Client Management', href: '/patient-management', icon: UserCheck },
      {
        title: 'Marketing',
        href: '/marketing',
        icon: Megaphone,
        children: [
          { title: 'Facebook', href: '/marketing/facebook', icon: Facebook },
        ]
      },
      { title: 'Research', href: '/research', icon: Search },
      { title: 'Messages', href: '/messages', icon: MessageSquare },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  psych: {
    mainNav: [
      { title: 'Onboarding', href: '/onboarding', icon: UserPlus },
      { title: 'Client Management', href: '/patient-management', icon: UserCheck },
      {
        title: 'Marketing',
        href: '/marketing',
        icon: Megaphone,
        children: [
          { title: 'Facebook', href: '/marketing/facebook', icon: Facebook },
        ]
      },
      { title: 'Research', href: '/research', icon: Search },
      { title: 'Messages', href: '/messages', icon: MessageSquare },
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
      { title: 'Messages', href: '/messages', icon: MessageSquare },
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
      { title: 'Messages', href: '/messages', icon: MessageSquare },
    ],
    secondaryNav: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  patient: {
    mainNav: [
      { title: 'Home', href: '/patient', icon: Home },
      { title: 'Tasks', href: '/patient/tasks', icon: ClipboardList },
      { title: 'Documents', href: '/patient/documents', icon: FileText },
      { title: 'Messages', href: '/messages', icon: MessageSquare },
      { title: 'Resources', href: '/patient/resources', icon: User },
      { title: 'Guide', href: '#', icon: BookOpen }, // Special item - handled by tour
    ],
    secondaryNav: [],
  },
}

// Get navigation for a specific role
export function getNavigationForRole(role: UserRole): NavigationConfig {
  return navigationByRole[role] || navigationByRole.patient
}

// Role display names and colors
export const roleConfig: Record<UserRole, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-purple-500' },
  admin: { label: 'Admin', color: 'bg-indigo-500' },
  manager: { label: 'Manager', color: 'bg-blue-500' },
  doctor: { label: 'Doctor', color: 'bg-green-500' },
  psych: { label: 'Psychologist', color: 'bg-teal-500' },
  nurse: { label: 'Nurse', color: 'bg-pink-500' },
  driver: { label: 'Driver', color: 'bg-orange-500' },
  patient: { label: 'Patient', color: 'bg-gray-500' },
}

