'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signInWithGoogle() {
  const supabase = await createClient()
  
  // Get the base URL from the request headers (most accurate for the current environment)
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  
  // Construct base URL from request headers, or fall back to env/defaults
  let baseUrl: string
  if (host) {
    // Use the actual host the request came from
    baseUrl = `${protocol}://${host}`
  } else {
    // Fallback to environment variable or defaults
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
    },
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }

  return { ok: false, message: 'Failed to initiate Google sign-in' }
}

