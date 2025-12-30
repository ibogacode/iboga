'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface DocumentUploadProps {
  label: string
  fileType: 'intake' | 'medical' | 'service' | 'ibogaine'
  value?: string | null
  onChange: (url: string | null, fileName?: string) => void
  onUpload?: (file: File) => Promise<{ url: string; fileName?: string }>
  accept?: string
  maxSizeMB?: number
}

export function DocumentUpload({
  label,
  fileType,
  value,
  onChange,
  onUpload,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp',
  maxSizeMB = 10,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(`File size exceeds ${maxSizeMB}MB limit`)
      return
    }

    // Validate file type
    const validExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''))
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      toast.error(`Invalid file type. Allowed: ${accept}`)
      return
    }

    if (onUpload) {
      setIsUploading(true)
      setUploadedFileName(file.name)
      try {
        const result = await onUpload(file)
        onChange(result.url, result.fileName || file.name)
        toast.success('Document uploaded successfully')
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to upload document')
        setUploadedFileName(null)
      } finally {
        setIsUploading(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } else {
      // If no upload handler, just use file name (for URL input mode)
      setUploadedFileName(file.name)
    }
  }

  const handleRemove = () => {
    onChange(null)
    setUploadedFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          id={`file-upload-${fileType}`}
          disabled={isUploading}
        />
        <label
          htmlFor={`file-upload-${fileType}`}
          className="flex-1 cursor-pointer"
        >
          <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="text-sm text-gray-600">Uploading...</span>
              </>
            ) : value || uploadedFileName ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {uploadedFileName || 'Document uploaded'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleRemove()
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
              </>
            )}
          </div>
        </label>
      </div>
      {value && !uploadedFileName && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600 flex-1 truncate">{value}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <p className="text-xs text-gray-500">
        Max size: {maxSizeMB}MB. Accepted: {accept}
      </p>
    </div>
  )
}

