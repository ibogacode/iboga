'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { isStaffRole } from '@/lib/utils'

const getLeadNotesSchema = z.object({ leadId: z.string().uuid() })

export interface LeadNoteEntry {
  id: string
  lead_id: string
  notes: string
  created_at: string
  created_by: string | null
  created_by_name: string | null
}

export const getLeadNotes = authActionClient
  .schema(getLeadNotesSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('lead_note_entries')
      .select(`
        id,
        lead_id,
        notes,
        created_at,
        created_by,
        created_by_profile:created_by(first_name, last_name)
      `)
      .eq('lead_id', parsedInput.leadId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    const entries: LeadNoteEntry[] = (data || []).map((row: any) => {
      const profile = row.created_by_profile
      const createdByName = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || null
        : null
      return {
        id: row.id,
        lead_id: row.lead_id,
        notes: row.notes ?? '',
        created_at: row.created_at,
        created_by: row.created_by,
        created_by_name: createdByName,
      }
    })

    return { success: true, data: entries }
  })

const addLeadNoteSchema = z.object({
  leadId: z.string().uuid(),
  notes: z.string().min(1, 'Note cannot be empty'),
})

export const addLeadNote = authActionClient
  .schema(addLeadNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('lead_note_entries')
      .insert({
        lead_id: parsedInput.leadId,
        notes: parsedInput.notes.trim(),
        created_by: ctx.user.id,
      })
      .select('id, lead_id, notes, created_at, created_by')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const createdByName = ctx.user.email ?? null

    return {
      success: true,
      data: {
        id: data.id,
        lead_id: data.lead_id,
        notes: data.notes,
        created_at: data.created_at,
        created_by: data.created_by,
        created_by_name: createdByName,
      } as LeadNoteEntry,
    }
  })

const updateLeadNoteSchema = z.object({
  noteId: z.string().uuid(),
  notes: z.string().min(1, 'Note cannot be empty'),
})

export const updateLeadNote = authActionClient
  .schema(updateLeadNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('lead_note_entries')
      .update({ notes: parsedInput.notes.trim() })
      .eq('id', parsedInput.noteId)
      .select('id, lead_id, notes, created_at, created_by')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', data.created_by)
      .maybeSingle()

    const createdByName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || null
      : null

    return {
      success: true,
      data: {
        id: data.id,
        lead_id: data.lead_id,
        notes: data.notes,
        created_at: data.created_at,
        created_by: data.created_by,
        created_by_name: createdByName,
      } as LeadNoteEntry,
    }
  })

const deleteLeadNoteSchema = z.object({ noteId: z.string().uuid() })

export const deleteLeadNote = authActionClient
  .schema(deleteLeadNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()
    const { error } = await admin
      .from('lead_note_entries')
      .delete()
      .eq('id', parsedInput.noteId)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  })
