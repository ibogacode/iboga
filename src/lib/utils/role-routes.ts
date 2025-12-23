import { UserRole } from '@/types'

/**
 * Get the default dashboard route for a user role
 */
export function getRoleRoute(role: UserRole | null | undefined): string {
  const roleRouteMap: Record<UserRole, string> = {
    admin: '/owner',
    owner: '/owner',
    manager: '/manager',
    doctor: '/doctor',
    psych: '/psych',
    nurse: '/nurse',
    driver: '/driver',
    patient: '/patient',
  }

  return roleRouteMap[role || 'patient'] || '/patient'
}

