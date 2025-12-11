export type UserRole = 
  | 'owner' 
  | 'manager' 
  | 'doctor' 
  | 'psych' 
  | 'nurse' 
  | 'driver' 
  | 'patient'

export interface User {
  id: string
  email: string
  role: UserRole
  first_name: string | null
  last_name: string | null
  name?: string // Generated column (first_name + last_name)
  designation?: string | null
  avatar_url?: string | null
  phone?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile extends User {
  organization?: {
    id: string
    name: string
  }
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
}


