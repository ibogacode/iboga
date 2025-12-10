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
  first_name: string
  last_name: string
  avatar_url?: string
  phone?: string
  organization_id: string
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


