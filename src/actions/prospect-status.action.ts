'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasOwnerAccess, hasStaffAccess } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export interface ProspectRow {
  id: string
  name: string
  email: string
  phone: string
  dateContacted: string
  dateContactedIso: string | null
  source: string
  status: string
}

/**
 * Get all clients in prospect stage (profiles with role=patient and is_prospect=true).
 * Staff can view; uses admin client to read profiles.
 */
export async function getProspects(): Promise<{ success: boolean; data?: ProspectRow[]; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!callerProfile || !hasStaffAccess(callerProfile.role)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[getProspects] Unauthorized:', { hasProfile: !!callerProfile, role: callerProfile?.role })
    }
    return { success: false, error: 'Unauthorized - Staff access required' }
  }

  const { data: rows, error } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email, phone, prospect_marked_at')
    .eq('role', 'patient')
    .eq('is_prospect', true)
    .order('prospect_marked_at', { ascending: false })

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getProspects] Query error:', error.message)
    }
    return { success: false, error: error.message }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[getProspects] Rows count:', rows?.length ?? 0, rows ? 'sample:' : '', rows?.[0])
  }

  // Derive source: Admin/Owner if email appears in partial_intake_forms, else Public
  const prospectEmails = [...new Set((rows || []).map((p: any) => p.email?.toLowerCase().trim()).filter(Boolean))]
  let adminOwnerEmails = new Set<string>()
  if (prospectEmails.length > 0) {
    const { data: partialForms } = await admin
      .from('partial_intake_forms')
      .select('email, recipient_email')
    ;(partialForms || []).forEach((pf: any) => {
      const e = pf.email?.toLowerCase().trim()
      const r = pf.recipient_email?.toLowerCase().trim()
      if (e) adminOwnerEmails.add(e)
      if (r) adminOwnerEmails.add(r)
    })
  }

  const prospects: ProspectRow[] = (rows || []).map((p: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    phone: string | null
    prospect_marked_at: string | null
  }) => {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || '—'
    const dateContacted = p.prospect_marked_at
      ? new Date(p.prospect_marked_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—'
    const emailLower = p.email?.toLowerCase().trim()
    const source = emailLower && adminOwnerEmails.has(emailLower) ? 'Admin/Owner' : 'Public'
    return {
      id: p.id,
      name,
      email: p.email || '',
      phone: p.phone || '',
      dateContacted,
      dateContactedIso: p.prospect_marked_at || null,
      source,
      status: 'Prospect',
    }
  })

  return { success: true, data: prospects }
}

/**
 * Mark a profile as prospect. When is_prospect is true, no reminder emails
 * are sent. Only owner/admin can perform this; uses admin client to bypass RLS.
 */
export async function markAsProspect(patientId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!hasOwnerAccess(callerProfile?.role)) {
    throw new Error('Only owner or admin can mark a profile as prospect')
  }

  const { error } = await admin
    .from('profiles')
    .update({
      is_prospect: true,
      prospect_marked_at: new Date().toISOString(),
      prospect_marked_by: user.id,
    })
    .eq('id', patientId)

  if (error) throw new Error(error.message)

  revalidatePath('/patient-pipeline')
  revalidatePath(`/patient-pipeline/patient-profile/${patientId}`)
  return { success: true }
}

/**
 * Remove prospect status so reminder emails can be sent again. Only owner/admin.
 */
export async function removeProspectStatus(patientId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!hasOwnerAccess(callerProfile?.role)) {
    throw new Error('Only owner or admin can remove prospect status')
  }

  const { error } = await admin
    .from('profiles')
    .update({
      is_prospect: false,
      prospect_marked_at: null,
      prospect_marked_by: null,
    })
    .eq('id', patientId)

  if (error) throw new Error(error.message)

  revalidatePath('/patient-pipeline')
  revalidatePath(`/patient-pipeline/patient-profile/${patientId}`)
  return { success: true }
}
