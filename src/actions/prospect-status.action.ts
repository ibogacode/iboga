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
 * Get all clients in prospect stage:
 * - Profiles with role=patient and is_prospect=true
 * - Partial intake forms with is_prospect=true and not yet completed (added by admin/owner as prospect).
 * Staff can view; uses admin client to read.
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

  // 1) Prospects from profiles (role=patient, is_prospect=true)
  const { data: profileRows, error: profileError } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email, phone, prospect_marked_at')
    .eq('role', 'patient')
    .eq('is_prospect', true)
    .order('prospect_marked_at', { ascending: false })

  if (profileError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getProspects] Profile query error:', profileError.message)
    }
    return { success: false, error: profileError.message }
  }

  const profileProspectEmails = new Set(
    (profileRows || []).map((p: any) => p.email?.toLowerCase().trim()).filter(Boolean)
  )

  // 2) Prospects from partial forms (is_prospect=true, not completed) — exclude emails that already have a profile prospect
  const { data: partialRows, error: partialError } = await admin
    .from('partial_intake_forms')
    .select('id, first_name, last_name, email, recipient_email, recipient_name, phone_number, created_at')
    .eq('is_prospect', true)
    .is('completed_at', null)
    .order('created_at', { ascending: false })

  if (partialError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getProspects] Partial forms query error:', partialError.message)
    }
    return { success: false, error: partialError.message }
  }

  const partialProspects: ProspectRow[] = (partialRows || [])
    .filter((pf: any) => {
      const email = (pf.recipient_email || pf.email)?.toLowerCase().trim()
      return email && !profileProspectEmails.has(email)
    })
    .map((pf: any) => {
      const name =
        [pf.first_name, pf.last_name].filter(Boolean).join(' ') ||
        pf.recipient_name?.trim() ||
        '—'
      const email = (pf.recipient_email || pf.email) || ''
      const dateContacted = pf.created_at
        ? new Date(pf.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—'
      return {
        id: pf.id,
        name,
        email,
        phone: pf.phone_number || '',
        dateContacted,
        dateContactedIso: pf.created_at || null,
        source: 'Admin/Owner',
        status: 'Prospect',
      }
    })

  // Build set of admin/owner emails (from partial forms) for source labeling on profile prospects
  const adminOwnerEmails = new Set<string>()
  const allPartialForms = await admin.from('partial_intake_forms').select('email, recipient_email')
  ;(allPartialForms.data || []).forEach((pf: any) => {
    const e = pf.email?.toLowerCase().trim()
    const r = pf.recipient_email?.toLowerCase().trim()
    if (e) adminOwnerEmails.add(e)
    if (r) adminOwnerEmails.add(r)
  })

  const profileProspects: ProspectRow[] = (profileRows || []).map((p: {
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

  // Merge: profile prospects first, then partial-form prospects (no duplicate emails)
  const prospects: ProspectRow[] = [
    ...profileProspects,
    ...partialProspects,
  ]

  if (process.env.NODE_ENV === 'development') {
    console.log('[getProspects] Count:', { profiles: profileProspects.length, partial: partialProspects.length, total: prospects.length })
  }

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
