'use server'

import { z } from 'zod'
import { actionClient, authActionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { addEmployeeSchema, addPatientSchema, updateEmployeeSchema } from '@/lib/validations/facility'
import { revalidatePath } from 'next/cache'
import { User } from '@/types'
import { hasOwnerAccess } from '@/lib/utils'
import { sendEmployeeWelcomeEmail } from '@/actions/email.action'

export const addEmployeeAction = actionClient
  .schema(addEmployeeSchema)
  .action(async ({ parsedInput }) => {
    const adminClient = createAdminClient()
    
    // Check if user already exists by checking profiles table
    const { data: existingProfile, error: checkError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', parsedInput.email)
      .maybeSingle()
    
    // If profile exists, user already exists
    if (!checkError && existingProfile) {
      return { success: false, error: 'User with this email already exists' }
    }
    
    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: parsedInput.email,
      password: parsedInput.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: parsedInput.firstName,
        last_name: parsedInput.lastName,
        role: parsedInput.role,
      },
    })
    
    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create user' }
    }
    
    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Check if profile was created by trigger, then update it
    const { data: triggerCreatedProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle()
    
    if (triggerCreatedProfile) {
      // Profile exists (created by trigger), update it
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          email: parsedInput.email,
          first_name: parsedInput.firstName,
          last_name: parsedInput.lastName,
          role: parsedInput.role,
          phone: parsedInput.phone || null,
          designation: parsedInput.designation || null,
          pay_rate_per_day: parsedInput.payRatePerDay ? parseFloat(parsedInput.payRatePerDay) : null,
          is_active: true,
        })
        .eq('id', authData.user.id)
      
      if (profileError) {
        await adminClient.auth.admin.deleteUser(authData.user.id)
        return { success: false, error: `Failed to update user profile: ${profileError.message}` }
      }
    } else {
      // Profile doesn't exist (trigger didn't fire), create it manually
      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: parsedInput.email,
          first_name: parsedInput.firstName,
          last_name: parsedInput.lastName,
          role: parsedInput.role,
          phone: parsedInput.phone || null,
          designation: parsedInput.designation || null,
          pay_rate_per_day: parsedInput.payRatePerDay ? parseFloat(parsedInput.payRatePerDay) : null,
          is_active: true,
        })
      
      if (profileError) {
        await adminClient.auth.admin.deleteUser(authData.user.id)
        return { success: false, error: `Failed to create user profile: ${profileError.message}` }
      }
    }
    
    // Send welcome email to the new employee (fire and forget - don't block response)
    sendEmployeeWelcomeEmail(
      parsedInput.email,
      parsedInput.firstName,
      parsedInput.lastName,
      parsedInput.password,
      parsedInput.role
    ).catch((error) => {
      // Log error but don't fail the employee creation
      console.error('Failed to send welcome email to employee:', error)
    })
    
    revalidatePath('/facility-management')
    return { success: true, data: { userId: authData.user.id } }
  })

export const updateEmployeeAction = authActionClient
  .schema(updateEmployeeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const adminClient = createAdminClient()
    
    // Check if user has admin or owner role
    if (!ctx.user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
      return { 
        success: false, 
        error: `Only admins and owners can update employees. Your role: ${ctx.user.role}` 
      }
    }
    
    // Check if employee exists
    const { data: existingProfile, error: checkError } = await adminClient
      .from('profiles')
      .select('id, email')
      .eq('id', parsedInput.userId)
      .maybeSingle()
    
    if (checkError || !existingProfile) {
      return { success: false, error: 'Employee not found' }
    }
    
    // Check if email is being changed and if new email already exists
    if (parsedInput.email !== existingProfile.email) {
      const { data: emailExists } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', parsedInput.email)
        .neq('id', parsedInput.userId)
        .maybeSingle()
      
      if (emailExists) {
        return { success: false, error: 'Email already in use by another user' }
      }
    }
    
    // Update profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        email: parsedInput.email,
        first_name: parsedInput.firstName,
        last_name: parsedInput.lastName,
        role: parsedInput.role,
        phone: parsedInput.phone || null,
        designation: parsedInput.designation || null,
        pay_rate_per_day: parsedInput.payRatePerDay ? parseFloat(parsedInput.payRatePerDay) : null,
      })
      .eq('id', parsedInput.userId)
    
    if (profileError) {
      return { success: false, error: `Failed to update employee: ${profileError.message}` }
    }
    
    // Update auth user email if changed
    if (parsedInput.email !== existingProfile.email) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        parsedInput.userId,
        {
          email: parsedInput.email,
          user_metadata: {
            first_name: parsedInput.firstName,
            last_name: parsedInput.lastName,
            role: parsedInput.role,
          },
        }
      )
      
      if (authError) {
        return { success: false, error: `Failed to update user email: ${authError.message}` }
      }
    } else {
      // Just update metadata if email didn't change
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        parsedInput.userId,
        {
          user_metadata: {
            first_name: parsedInput.firstName,
            last_name: parsedInput.lastName,
            role: parsedInput.role,
          },
        }
      )
      
      if (authError) {
        console.error('Failed to update user metadata:', authError)
        // Don't fail the whole operation if metadata update fails
      }
    }
    
    revalidatePath('/facility-management')
    return { success: true }
  })

export const addPatientAction = actionClient
  .schema(addPatientSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Get current user's organization_id if available
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    const organizationId = currentProfile?.organization_id || null
    
    // Check if patient already exists (by email)
    const { data: existingProfile, error: profileCheckError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', parsedInput.email)
      .eq('role', 'patient')
      .maybeSingle()
    
    // If profile exists (no error and profile data), return error
    if (!profileCheckError && existingProfile) {
      return { success: false, error: 'Patient with this email already exists' }
    }
    
    // Create auth user for patient (optional - patients might not need login)
    // For now, we'll create a profile with role='patient'
    // If patients table exists, we'll also create a patient record
    
    // Generate a temporary password (patient can reset it)
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`
    
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: parsedInput.email,
      password: tempPassword,
      email_confirm: false, // Patient needs to verify email and set password
      user_metadata: {
        first_name: parsedInput.firstName,
        last_name: parsedInput.lastName,
        role: 'patient',
      },
    })
    
    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create patient account' }
    }
    
    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Check if profile was created by trigger, then update it
    const { data: triggerCreatedProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle()
    
    if (triggerCreatedProfile) {
      // Profile exists (created by trigger), update it
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          email: parsedInput.email,
          first_name: parsedInput.firstName,
          last_name: parsedInput.lastName,
          role: 'patient',
          phone: parsedInput.phone || null,
          date_of_birth: parsedInput.dateOfBirth || null,
          gender: parsedInput.gender || null,
          address: parsedInput.address || null,
          is_active: true,
        })
        .eq('id', authData.user.id)
      
      if (profileError) {
        await adminClient.auth.admin.deleteUser(authData.user.id)
        return { success: false, error: `Failed to update patient profile: ${profileError.message}` }
      }
    } else {
      // Profile doesn't exist (trigger didn't fire), create it manually
      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: parsedInput.email,
          first_name: parsedInput.firstName,
          last_name: parsedInput.lastName,
          role: 'patient',
          phone: parsedInput.phone || null,
          date_of_birth: parsedInput.dateOfBirth || null,
          gender: parsedInput.gender || null,
          address: parsedInput.address || null,
          is_active: true,
        })
      
      if (profileError) {
        await adminClient.auth.admin.deleteUser(authData.user.id)
        return { success: false, error: `Failed to create patient profile: ${profileError.message}` }
      }
    }
    
    // Try to create patient record if patients table exists
    // This will fail silently if table doesn't exist
    if (organizationId) {
      await adminClient
        .from('patients')
        .insert({
          user_id: authData.user.id,
          first_name: parsedInput.firstName,
          last_name: parsedInput.lastName,
          email: parsedInput.email,
          phone: parsedInput.phone || null,
          date_of_birth: parsedInput.dateOfBirth || null,
          gender: parsedInput.gender || null,
          address: parsedInput.address || null,
          city: parsedInput.city || null,
          state: parsedInput.state || null,
          postal_code: parsedInput.postalCode || null,
          emergency_contact_name: parsedInput.emergencyContactName || null,
          emergency_contact_phone: parsedInput.emergencyContactPhone || null,
          emergency_contact_relationship: parsedInput.emergencyContactRelationship || null,
          status: 'pending',
          organization_id: organizationId,
          notes: parsedInput.notes || null,
        })
        .select()
    }
    
    revalidatePath('/facility-management')
    return { 
      success: true, 
      data: { 
        userId: authData.user.id,
        message: 'Patient created. They will receive an email to set their password.',
      } 
    }
  })

/**
 * Get all employees (non-patient users)
 */
export const getEmployees = authActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const supabase = await createClient()
    
    // Check if user is authenticated and has owner/admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !hasOwnerAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner or Admin access required' }
    }
    
    // Get all profiles that are not patients
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'patient')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { 
      success: true, 
      data: { employees: (data || []) as User[] } 
    }
  })
