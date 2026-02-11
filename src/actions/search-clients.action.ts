'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { isStaffRole } from '@/lib/utils'

const searchClientsSchema = z.object({
  query: z.string().min(1).max(200).transform((s) => s.trim()),
})

export interface ClientSearchResult {
  id: string
  name: string | null
  first_name: string | null
  last_name: string | null
  email: string
  avatar_url: string | null
}

export const searchClients = authActionClient
  .schema(searchClientsSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized - Staff access required', data: [] }
    }

    const q = parsedInput.query
    if (q.length < 2) {
      return { success: true, data: [] }
    }

    // Sanitize: remove commas so .or() filter parsing doesn't break; escape ilike wildcards
    const safe = q.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
    const pattern = `%${safe.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, first_name, last_name, email, avatar_url')
      .eq('role', 'patient')
      .or(`name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(10)
      .order('name', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('[searchClients]', error)
      return { success: false, error: 'Failed to search clients', data: [] }
    }

    const results: ClientSearchResult[] = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? null,
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      email: row.email,
      avatar_url: row.avatar_url ?? null,
    }))

    return { success: true, data: results }
  })
