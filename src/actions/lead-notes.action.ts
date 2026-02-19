'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { isStaffRole } from '@/lib/utils'

const getLeadNoteSchema = z.object({ leadId: z.string().uuid() })

export const getLeadNote = authActionClient
  .schema(getLeadNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('lead_notes')
      .select('notes')
      .eq('lead_id', parsedInput.leadId)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data: { notes: data?.notes ?? '' } }
  })

const updateLeadNoteSchema = z.object({
  leadId: z.string().uuid(),
  notes: z.string(),
})

export const updateLeadNote = authActionClient
  .schema(updateLeadNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()
    const { error } = await admin
      .from('lead_notes')
      .upsert(
        {
          lead_id: parsedInput.leadId,
          notes: parsedInput.notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lead_id' }
      )

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  })
