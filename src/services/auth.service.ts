import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { UserRole } from '@/types'

interface SignUpParams {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: UserRole
  organizationId: string
}

interface SignInParams {
  email: string
  password: string
}

export async function signUp({
  email,
  password,
  firstName,
  lastName,
  role = 'patient',
  organizationId,
}: SignUpParams) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  })

  if (authError) {
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error('Failed to create user')
  }

  // Create profile with role using admin client
  const adminClient = createAdminClient()
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      organization_id: organizationId,
    })

  if (profileError) {
    throw new Error('Failed to create user profile')
  }

  return authData
}

export async function signIn({ email, password }: SignInParams) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return data?.role as UserRole | null
}


