'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { designTokens } from '@/config/design-system'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Upload } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { uploadAvatarAction, removeAvatarAction, updateProfileAction } from '@/actions/profile.action'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Area } from 'react-easy-crop'
import { User } from '@/types'
import { User as SupabaseUser } from '@supabase/supabase-js'

function getInitials(name?: string | null, firstName?: string | null, lastName?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name[0]?.toUpperCase() || 'U'
  }
  
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase()
  }
  
  if (firstName) {
    return firstName[0]?.toUpperCase() || 'U'
  }
  
  if (lastName) {
    return lastName[0]?.toUpperCase() || 'U'
  }
  
  return 'U'
}

// Form schema
const profileFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional().nullable(),
  last_name: z.string().min(1, 'Last name is required').optional().nullable(),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional().nullable(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

// Helper function to create cropped image
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: string = 'image/png'
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to create blob'))
      }
    }, mimeType, 0.95)
  })
}

interface ProfileFormProps {
  user: SupabaseUser | null
  profile: User | null
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(profile?.avatar_url || null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Get avatar URL
  const userAvatar = localAvatarUrl
  
  // Get user email for fallback
  const userEmail = user?.email || profile?.email || ''
  
  // Get initials for fallback
  const calculatedInitials = getInitials(profile?.name, profile?.first_name, profile?.last_name)
  const userInitials = calculatedInitials !== 'U' 
    ? calculatedInitials 
    : (userEmail ? userEmail[0]?.toUpperCase() : 'U')

  // Form setup with initial values from props
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
      date_of_birth: profile?.date_of_birth || '',
      address: profile?.address || '',
      gender: profile?.gender || null,
    },
  })

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit. Please choose a smaller file.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string)
      setSelectedFile(file)
      setShowCropDialog(true)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    })
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async () => {
    if (!imageSrc || !croppedAreaPixels || !selectedFile) return

    setIsUploading(true)
    try {
      const originalType = selectedFile.type || 'image/png'
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, originalType)
      
      const croppedFile = new File([croppedImageBlob], selectedFile.name, {
        type: originalType,
      })

      const formData = new FormData()
      formData.append('file', croppedFile)
      
      const result = await uploadAvatarAction(formData)
      
      if (result.success) {
        toast.success('Profile photo uploaded successfully')
        if (result.avatarUrl) {
          setLocalAvatarUrl(result.avatarUrl)
        }
        setShowCropDialog(false)
        setImageSrc('')
        setSelectedFile(null)
      } else {
        toast.error(result.error || 'Failed to upload photo')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) {
      return
    }

    setIsRemoving(true)
    try {
      const result = await removeAvatarAction()
      
      if (result.success) {
        toast.success('Profile photo removed successfully')
        setLocalAvatarUrl(null)
      } else {
        toast.error(result.error || 'Failed to remove photo')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove photo')
    } finally {
      setIsRemoving(false)
    }
  }

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const result = await updateProfileAction({
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        email: data.email,
        phone: data.phone || null,
        date_of_birth: data.date_of_birth || null,
        address: data.address || null,
        gender: data.gender || null,
      })

      if (result?.serverError) {
        toast.error(result.serverError || 'Failed to update profile')
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
          toast.success('Profile updated successfully')
          setIsEditing(false)
          window.location.reload()
        } else if (result.data.error) {
          toast.error(result.data.error || 'Failed to update profile')
        } else {
          toast.error('Failed to update profile')
        }
      } else {
        toast.error('Failed to update profile')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    }
  }

  const handleEditClick = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    form.reset({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
      date_of_birth: profile?.date_of_birth || '',
      address: profile?.address || '',
      gender: profile?.gender || null,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 
          style={{ 
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '44px',
            fontWeight: 400,
            color: 'black',
            wordWrap: 'break-word'
          }}
        >
          Profile Settings
        </h1>
        <p
          style={{
            color: 'black',
            fontSize: 16,
            fontFamily: designTokens.typography.navItem.fontFamily,
            fontWeight: '400',
            wordWrap: 'break-word',
            marginTop: '8px',
            marginBottom: '16px'
          }}
        >
          Manage your account settings and preferences
        </p>
      </div>

      {/* White box */}
      <div 
        className="rounded-2xl p-4 sm:p-5 md:p-6"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 8px 0px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="flex gap-12 sm:gap-16 lg:gap-20">
          {/* Left section */}
          <div 
            className="rounded-2xl p-4 sm:p-5 md:p-6"
            style={{
              width: '30%',
              backgroundColor: '#F5F4F0'
            }}
          >
          </div>
          
          {/* Right section */}
          <div 
            className="space-y-8 pr-12 sm:pr-16 lg:pr-20"
            style={{
              width: '70%'
            }}
          >
            {/* Profile Photo Section */}
            <div className="space-y-4">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24 rounded-full bg-gray-200" key={userAvatar || 'no-avatar'}>
                  {userAvatar ? (
                    <AvatarImage src={userAvatar} alt="Profile" />
                  ) : null}
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-lg font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 
                      style={{
                        fontFamily: designTokens.typography.navItem.fontFamily,
                        fontSize: '16px',
                        fontWeight: 500,
                        color: 'black',
                        marginBottom: '4px'
                      }}
                    >
                      Profile Photo
                    </h3>
                    <p
                      style={{
                        fontFamily: designTokens.typography.navItem.fontFamily,
                        fontSize: '14px',
                        fontWeight: 400,
                        color: '#666',
                        lineHeight: '1.4'
                      }}
                    >
                      Upload a new profile picture. Max 10MB.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      onClick={handleUploadClick}
                      disabled={isUploading}
                      style={{
                        backgroundColor: '#6E7A46',
                        color: 'white',
                        fontFamily: designTokens.typography.navItem.fontFamily,
                      }}
                      className="hover:opacity-90 disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                    <Button
                      onClick={handleRemove}
                      disabled={isRemoving || !userAvatar}
                      variant="outline"
                      style={{
                        fontFamily: designTokens.typography.navItem.fontFamily,
                        borderColor: '#E5E5E5',
                        color: '#666'
                      }}
                      className="disabled:opacity-50"
                    >
                      {isRemoving ? 'Removing...' : 'Remove'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 
                  style={{
                    fontFamily: designTokens.typography.navItem.fontFamily,
                    fontSize: '18px',
                    fontWeight: 500,
                    color: 'black'
                  }}
                >
                  Personal information
                </h3>
                {!isEditing ? (
                  <button
                    onClick={handleEditClick}
                    type="button"
                    style={{
                      fontFamily: designTokens.typography.navItem.fontFamily,
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#6E7A46',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={handleCancelEdit}
                    type="button"
                    style={{
                      fontFamily: designTokens.typography.navItem.fontFamily,
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#6E7A46',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Name Fields */}
                  <div className="space-y-2">
                    <FormLabel
                      style={{
                        fontFamily: designTokens.typography.navItem.fontFamily,
                        fontSize: '14px',
                        fontWeight: 400,
                        color: 'black'
                      }}
                    >
                      Name<span style={{ color: '#EF4444' }}>*</span>
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="First Name"
                                {...field}
                                value={field.value || ''}
                                disabled={!isEditing}
                                style={{
                                  fontFamily: designTokens.typography.navItem.fontFamily,
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Last Name"
                                {...field}
                                value={field.value || ''}
                                disabled={!isEditing}
                                style={{
                                  fontFamily: designTokens.typography.navItem.fontFamily,
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel
                          style={{
                            fontFamily: designTokens.typography.navItem.fontFamily,
                            fontSize: '14px',
                            fontWeight: 400,
                            color: 'black'
                          }}
                        >
                          Email<span style={{ color: '#EF4444' }}>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="Enter your email"
                            {...field}
                            disabled={true}
                            style={{
                              fontFamily: designTokens.typography.navItem.fontFamily,
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone Number Field */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel
                          style={{
                            fontFamily: designTokens.typography.navItem.fontFamily,
                            fontSize: '14px',
                            fontWeight: 400,
                            color: 'black'
                          }}
                        >
                          Phone number
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="tel"
                            placeholder="(123) 000-0000"
                            {...field}
                            value={field.value || ''}
                            disabled={!isEditing}
                            style={{
                              fontFamily: designTokens.typography.navItem.fontFamily,
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date of Birth and Gender */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel
                            style={{
                              fontFamily: designTokens.typography.navItem.fontFamily,
                              fontSize: '14px',
                              fontWeight: 400,
                              color: 'black'
                            }}
                          >
                            Date of Birth
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type="date"
                                {...field}
                                value={field.value || ''}
                                disabled={!isEditing}
                                style={{
                                  fontFamily: designTokens.typography.navItem.fontFamily,
                                }}
                              />
                              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel
                            style={{
                              fontFamily: designTokens.typography.navItem.fontFamily,
                              fontSize: '14px',
                              fontWeight: 400,
                              color: 'black'
                            }}
                          >
                            Gender
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || undefined}
                            disabled={!isEditing}
                          >
                            <FormControl>
                              <SelectTrigger 
                                className="w-full"
                                style={{
                                  fontFamily: designTokens.typography.navItem.fontFamily,
                                }}
                              >
                                <SelectValue placeholder="Select your gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Location Field */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel
                          style={{
                            fontFamily: designTokens.typography.navItem.fontFamily,
                            fontSize: '14px',
                            fontWeight: 400,
                            color: 'black'
                          }}
                        >
                          Location
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Street Address"
                            {...field}
                            value={field.value || ''}
                            disabled={!isEditing}
                            style={{
                              fontFamily: designTokens.typography.navItem.fontFamily,
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={!isEditing || form.formState.isSubmitting}
                      style={{
                        backgroundColor: '#6E7A46',
                        color: 'white',
                        fontFamily: designTokens.typography.navItem.fontFamily,
                      }}
                      className="hover:opacity-90 disabled:opacity-50"
                    >
                      {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>

      {/* Image Cropping Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: designTokens.typography.navItem.fontFamily,
              }}
            >
              Crop Your Profile Photo
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[400px] bg-gray-900 rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={true}
                style={{
                  containerStyle: {
                    background: '#1a1a1a',
                  },
                }}
              />
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                style={{
                  fontFamily: designTokens.typography.navItem.fontFamily,
                  fontSize: '14px',
                }}
              >
                Zoom
              </Label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCropDialog(false)
                setImageSrc('')
                setSelectedFile(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
              style={{
                fontFamily: designTokens.typography.navItem.fontFamily,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCropComplete}
              disabled={isUploading}
              style={{
                backgroundColor: '#6E7A46',
                color: 'white',
                fontFamily: designTokens.typography.navItem.fontFamily,
              }}
              className="hover:opacity-90 disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Upload Cropped Photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
