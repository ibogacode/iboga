'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validations/auth'
import { changePasswordAction } from '@/actions/auth.action'
import { toast } from 'sonner'
import { designTokens } from '@/config/design-system'

export function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  async function onSubmit(data: ChangePasswordFormData) {
    setIsLoading(true)
    
    try {
      const result = await changePasswordAction({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
      })

      if (result?.serverError) {
        toast.error(result.serverError)
        return
      }

      if (result?.validationErrors) {
        const errors = Object.values(result.validationErrors)
        const firstError = errors.length > 0 ? String(errors[0]) : null
        toast.error(firstError || 'Validation failed')
        return
      }

      if (result?.data) {
        if (result.data.success) {
          toast.success('Password changed successfully!')
          reset()
        } else if (result.data.error) {
          toast.error(result.data.error)
        } else {
          toast.error('Failed to change password')
        }
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label 
          htmlFor="currentPassword"
          style={{
            fontFamily: designTokens.typography.navItem.fontFamily,
            fontSize: '14px',
            fontWeight: 400,
            color: 'black',
          }}
        >
          Current Password
        </Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? 'text' : 'password'}
            placeholder="Enter your current password"
            autoComplete="current-password"
            disabled={isLoading}
            style={{
              fontFamily: designTokens.typography.navItem.fontFamily,
            }}
            {...register('currentPassword')}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="text-sm text-red-500 mt-1">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label 
          htmlFor="newPassword"
          style={{
            fontFamily: designTokens.typography.navItem.fontFamily,
            fontSize: '14px',
            fontWeight: 400,
            color: 'black',
          }}
        >
          New Password
        </Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            placeholder="Enter your new password"
            autoComplete="new-password"
            disabled={isLoading}
            style={{
              fontFamily: designTokens.typography.navItem.fontFamily,
            }}
            {...register('newPassword')}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-sm text-red-500 mt-1">{errors.newPassword.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Must be at least 8 characters with uppercase, lowercase, and a number
        </p>
      </div>

      <div className="space-y-2">
        <Label 
          htmlFor="confirmNewPassword"
          style={{
            fontFamily: designTokens.typography.navItem.fontFamily,
            fontSize: '14px',
            fontWeight: 400,
            color: 'black',
          }}
        >
          Confirm New Password
        </Label>
        <div className="relative">
          <Input
            id="confirmNewPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your new password"
            autoComplete="new-password"
            disabled={isLoading}
            style={{
              fontFamily: designTokens.typography.navItem.fontFamily,
            }}
            {...register('confirmNewPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.confirmNewPassword && (
          <p className="text-sm text-red-500 mt-1">{errors.confirmNewPassword.message}</p>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: '#6E7A46',
            color: 'white',
            fontFamily: designTokens.typography.navItem.fontFamily,
          }}
          className="hover:opacity-90 disabled:opacity-50 rounded-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Changing...
            </>
          ) : (
            'Change Password'
          )}
        </Button>
      </div>
    </form>
  )
}
