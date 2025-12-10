export type PatientStatus = 
  | 'pending'      // Registered but not arrived
  | 'active'       // Arrived and in treatment
  | 'in_treatment' // Currently receiving treatment
  | 'recovery'     // Post-treatment recovery
  | 'completed'    // Treatment completed
  | 'discharged'   // Left the facility

export interface Patient {
  id: string
  user_id?: string  // If patient has login access
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth: string
  gender?: 'male' | 'female' | 'other'
  
  // Address
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  
  // Emergency contact
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  
  // Treatment info
  status: PatientStatus
  organization_id: string
  location_id?: string
  assigned_doctor_id?: string
  assigned_psych_id?: string
  assigned_nurse_id?: string
  
  // Stay info
  arrival_date?: string
  departure_date?: string
  expected_stay_days?: number
  
  // Medical info
  blood_type?: string
  allergies?: string[]
  medical_conditions?: string[]
  current_medications?: string[]
  
  notes?: string
  
  created_at: string
  updated_at: string
}

export interface PatientWithRelations extends Patient {
  assigned_doctor?: {
    id: string
    first_name: string
    last_name: string
  }
  assigned_nurse?: {
    id: string
    first_name: string
    last_name: string
  }
  organization?: {
    id: string
    name: string
  }
}


