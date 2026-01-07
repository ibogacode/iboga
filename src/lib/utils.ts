import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { UserRole } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if a role has owner/admin privileges
 */
export function hasOwnerAccess(role: UserRole | string | null | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

/**
 * Check if a role has staff access (can view patient pipeline and records)
 * Includes owner, admin, and manager roles
 */
export function hasStaffAccess(role: UserRole | string | null | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}
