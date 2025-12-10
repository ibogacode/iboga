export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  
  // Contact
  email?: string
  phone?: string
  website?: string
  
  // Address
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  timezone?: string
  
  // Settings
  settings?: OrganizationSettings
  
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationSettings {
  allow_patient_registration?: boolean
  require_email_verification?: boolean
  default_stay_days?: number
  working_hours?: {
    start: string // "09:00"
    end: string   // "18:00"
  }
}

export interface Location {
  id: string
  organization_id: string
  name: string
  slug: string
  description?: string
  
  // Contact
  email?: string
  phone?: string
  
  // Address
  address: string
  city: string
  state?: string
  country: string
  postal_code?: string
  
  // Capacity
  capacity?: number
  current_occupancy?: number
  
  is_active: boolean
  created_at: string
  updated_at: string
}


