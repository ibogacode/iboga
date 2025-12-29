'use client'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

let supabase: SupabaseClient<Database> | null = null

export function createClient(): SupabaseClient<Database> {
  if (supabase) return supabase

  supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabase
}