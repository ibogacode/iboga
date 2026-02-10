'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isStaffRole } from '@/lib/utils'

const leadIdSchema = z.object({ leadId: z.string().uuid() })

export interface LeadTaskRow {
  id: string
  lead_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  assigned_to_id: string | null
  created_by_id: string
  created_at: string
  updated_at: string
  created_by_name?: string | null
  assigned_to_name?: string | null
}

export const getLeadTasks = authActionClient
  .schema(leadIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()
    const { data: tasks, error } = await admin
      .from('lead_tasks')
      .select(`
        id,
        lead_id,
        title,
        description,
        status,
        due_date,
        assigned_to_id,
        created_by_id,
        created_at,
        updated_at
      `)
      .eq('lead_id', parsedInput.leadId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    const profileIds = new Set<string>()
    ;(tasks || []).forEach((t: any) => {
      if (t.created_by_id) profileIds.add(t.created_by_id)
      if (t.assigned_to_id) profileIds.add(t.assigned_to_id)
    })
    const ids = Array.from(profileIds)
    let names: Record<string, string> = {}
    if (ids.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', ids)
      profiles?.forEach((p: any) => {
        names[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
      })
    }

    const rows: LeadTaskRow[] = (tasks || []).map((t: any) => ({
      ...t,
      created_by_name: names[t.created_by_id] || null,
      assigned_to_name: t.assigned_to_id ? (names[t.assigned_to_id] || null) : null,
    }))

    return { success: true, data: rows }
  })

const createLeadTaskSchema = z.object({
  leadId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  assigned_to_id: z.string().uuid().optional().nullable(),
})

export const createLeadTask = authActionClient
  .schema(createLeadTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()
    const createdBy = ctx.user.id

    const { data: task, error } = await admin
      .from('lead_tasks')
      .insert({
        lead_id: parsedInput.leadId,
        title: parsedInput.title.trim(),
        description: parsedInput.description?.trim() || null,
        due_date: parsedInput.due_date || null,
        assigned_to_id: parsedInput.assigned_to_id || null,
        created_by_id: createdBy,
        status: 'todo',
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    if (parsedInput.assigned_to_id && parsedInput.assigned_to_id !== createdBy) {
      await admin.from('user_notifications').insert({
        user_id: parsedInput.assigned_to_id,
        type: 'task_assigned',
        entity_type: 'lead_task',
        entity_id: task.id,
        title: `Task assigned: ${parsedInput.title.trim()}`,
        body: parsedInput.description?.trim() || null,
        link_url: `/patient-pipeline/patient-profile/${parsedInput.leadId}`,
      })
    }

    return { success: true, data: task }
  })

const updateLeadTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  assigned_to_id: z.string().uuid().optional().nullable(),
})

export const updateLeadTask = authActionClient
  .schema(updateLeadTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('lead_tasks')
      .select('id, lead_id, assigned_to_id, title')
      .eq('id', parsedInput.taskId)
      .single()

    if (!existing) {
      return { success: false, error: 'Task not found' }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsedInput.title !== undefined) updates.title = parsedInput.title.trim()
    if (parsedInput.description !== undefined) updates.description = parsedInput.description || null
    if (parsedInput.due_date !== undefined) updates.due_date = parsedInput.due_date || null
    if (parsedInput.assigned_to_id !== undefined) updates.assigned_to_id = parsedInput.assigned_to_id || null

    const { data: task, error } = await admin
      .from('lead_tasks')
      .update(updates)
      .eq('id', parsedInput.taskId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const newAssignee = parsedInput.assigned_to_id
    if (newAssignee && newAssignee !== existing.assigned_to_id && newAssignee !== ctx.user.id) {
      await admin.from('user_notifications').insert({
        user_id: newAssignee,
        type: 'task_assigned',
        entity_type: 'lead_task',
        entity_id: task.id,
        title: `Task assigned: ${(parsedInput.title ?? existing.title).trim()}`,
        link_url: `/patient-pipeline/patient-profile/${existing.lead_id}`,
      })
    }

    return { success: true, data: task }
  })

const updateLeadTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['todo', 'in_progress', 'done']),
})

export const updateLeadTaskStatus = authActionClient
  .schema(updateLeadTaskStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('lead_tasks')
      .update({ status: parsedInput.status, updated_at: new Date().toISOString() })
      .eq('id', parsedInput.taskId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  })

const deleteLeadTaskSchema = z.object({ taskId: z.string().uuid() })

export const deleteLeadTask = authActionClient
  .schema(deleteLeadTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }
    const admin = createAdminClient()
    const { error } = await admin.from('lead_tasks').delete().eq('id', parsedInput.taskId)
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  })

export const getStaffForAssign = authActionClient.schema(z.object({})).action(async ({ ctx }) => {
  if (!isStaffRole(ctx.user.role)) {
    return { success: false, error: 'Staff access required' }
  }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('role', ['owner', 'admin', 'manager', 'doctor', 'nurse', 'psych'])
    .order('first_name')

  if (error) {
    return { success: false, error: error.message }
  }
  return {
    success: true,
    data: (data || []).map((p: any) => ({
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id,
    })),
  }
})

export interface UserNotificationRow {
  id: string
  type: string
  entity_type: string
  entity_id: string | null
  title: string
  body: string | null
  link_url: string | null
  read_at: string | null
  created_at: string
}

export const getMyTaskNotifications = authActionClient.schema(z.object({})).action(async ({ ctx }) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_notifications')
    .select('id, type, entity_type, entity_id, title, body, link_url, read_at, created_at')
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, data: (data || []) as UserNotificationRow[] }
})

export const markNotificationRead = authActionClient
  .schema(z.object({ notificationId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', parsedInput.notificationId)
      .eq('user_id', ctx.user.id)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  })
