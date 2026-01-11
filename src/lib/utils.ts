import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { UserRole } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =============================================================================
// EST TIMEZONE UTILITIES
// All dates should be displayed and stored in EST (America/New_York)
// =============================================================================

const EST_TIMEZONE = 'America/New_York'

/**
 * Parse a date string (YYYY-MM-DD) as a local date without timezone shift
 * This prevents the issue where "2025-01-06" becomes "2025-01-05" due to UTC interpretation
 */
function parseDateString(dateString: string): Date {
  // If it's a date-only string (YYYY-MM-DD), parse it as local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0) // noon to avoid any edge cases
  }
  // Otherwise parse normally
  return new Date(dateString)
}

/**
 * Get current date/time in EST timezone
 */
export function getESTDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: EST_TIMEZONE }))
}

/**
 * Format a date string for display in MM-DD-YYYY format (EST)
 */
export function formatDateEST(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A'
  try {
    const date = typeof dateString === 'string' ? parseDateString(dateString) : dateString
    // For date-only display, just format the parts directly
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}-${day}-${year}`
  } catch {
    return String(dateString)
  }
}

/**
 * Format a date for database storage (YYYY-MM-DD) in EST
 */
export function formatDateForDB(dateString: string | Date | null | undefined): string {
  if (!dateString) return ''
  try {
    // If already in correct format, return as is
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    const date = typeof dateString === 'string' ? parseDateString(dateString) : dateString
    // Get the date parts in EST timezone
    const estDateStr = date.toLocaleDateString('en-US', {
      timeZone: EST_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    // Convert from MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = estDateStr.split('/')
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

/**
 * Get today's date in YYYY-MM-DD format (EST)
 */
export function getTodayEST(): string {
  const now = new Date()
  const estDateStr = now.toLocaleDateString('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  // Convert from MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = estDateStr.split('/')
  return `${year}-${month}-${day}`
}

/**
 * Format date with time in EST (MM-DD-YYYY HH:MM AM/PM)
 */
export function formatDateTimeEST(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A'
  try {
    const date = typeof dateString === 'string' ? parseDateString(dateString) : dateString
    return date.toLocaleString('en-US', {
      timeZone: EST_TIMEZONE,
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return String(dateString)
  }
}

/**
 * Get current time in HH:MM format (EST, 24-hour)
 */
export function getCurrentTimeEST(): string {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: EST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Format date as full readable string - e.g., "Monday, January 06, 2025"
 * Uses the date value directly without timezone conversion for date-only strings
 */
export function formatDateFullEST(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A'
  try {
    const date = typeof dateString === 'string' ? parseDateString(dateString) : dateString
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    })
  } catch {
    return String(dateString)
  }
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

/**
 * Check if a role is a staff role (can fill forms and manage patients)
 * Includes owner, admin, manager, doctor, nurse, and psych roles
 */
export function isStaffRole(role: UserRole | string | null | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager' || role === 'doctor' || role === 'nurse' || role === 'psych'
}
