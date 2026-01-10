'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, FileText, Loader2, Image as ImageIcon, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Image from 'next/image'

interface FileUploadItem {
  url: string
  fileName: string
  fileType: string
}

interface MultiFileUploadProps {
  label: string
  value?: FileUploadItem[] | null
  onChange: (files: FileUploadItem[]) => void
  onUpload: (file: File) => Promise<{ url: string; fileName?: string }>
  accept?: string
  maxSizeMB?: number
  maxFiles?: number
  disabled?: boolean
}

export function MultiFileUpload({
  label,
  value = [],
  onChange,
  onUpload,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp',
  maxSizeMB = 10,
  maxFiles = 10,
  disabled = false,
}: MultiFileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())
  const [viewingImage, setViewingImage] = useState<{ url: string; fileName: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const files = value || []

  const isImage = (fileType: string) => {
    return fileType.startsWith('image/')
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (!selectedFiles.length) return

    // Check max files limit
    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Process files one by one
    for (const file of selectedFiles) {
      // Validate file size
      const maxSize = maxSizeMB * 1024 * 1024
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds ${maxSizeMB}MB limit`)
        continue
      }

      // Validate file type
      const validExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''))
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      if (!fileExtension || !validExtensions.includes(fileExtension)) {
        toast.error(`${file.name}: Invalid file type. Allowed: ${accept}`)
        continue
      }

      // Upload file
      const fileId = `${Date.now()}-${Math.random()}`
      setUploadingFiles(prev => new Set(prev).add(fileId))
      
      try {
        const result = await onUpload(file)
        const newFile: FileUploadItem = {
          url: result.url,
          fileName: result.fileName || file.name,
          fileType: file.type || 'application/octet-stream',
        }
        onChange([...files, newFile])
        toast.success(`${file.name} uploaded successfully`)
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(error instanceof Error ? error.message : `Failed to upload ${file.name}`)
      } finally {
        setUploadingFiles(prev => {
          const next = new Set(prev)
          next.delete(fileId)
          return next
        })
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onChange(newFiles)
    toast.success('File removed')
  }

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingImage) {
        setViewingImage(null)
      }
    }
    if (viewingImage) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [viewingImage])

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="multi-file-upload"
          disabled={disabled || uploadingFiles.size > 0}
        />
        <label
          htmlFor="multi-file-upload"
          className={`flex-1 cursor-pointer ${disabled || uploadingFiles.size > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-emerald-500 transition-colors">
            {uploadingFiles.size > 0 ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="text-sm text-gray-600">
                  Uploading {uploadingFiles.size} file{uploadingFiles.size > 1 ? 's' : ''}...
                </span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {files.length}/{maxFiles} files
                </span>
              </>
            )}
          </div>
        </label>
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white"
            >
              {isImage(file.fileType) ? (
                <div 
                  className="relative aspect-square cursor-pointer"
                  onClick={() => !disabled && setViewingImage({ url: file.url, fileName: file.fileName })}
                >
                  <Image
                    src={file.url}
                    alt={file.fileName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(index)
                      }}
                      disabled={disabled}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                    <div className="bg-white/90 rounded-full p-2 shadow-lg">
                      <ImageIcon className="h-5 w-5 text-gray-700" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex flex-col items-center justify-center min-h-[120px]">
                  <FileText className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-600 text-center truncate w-full px-1">
                    {file.fileName}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                    className="mt-2 h-6 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
              <div className="absolute top-1 right-1">
                {isImage(file.fileType) ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setViewingImage({ url: file.url, fileName: file.fileName })
                    }}
                    className="bg-white/90 hover:bg-white rounded-full p-1.5 shadow-sm transition-colors"
                    title="View full size"
                    disabled={disabled}
                  >
                    <ImageIcon className="h-3 w-3 text-gray-600" />
                  </button>
                ) : (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/90 hover:bg-white rounded-full p-1.5 shadow-sm transition-colors"
                    title="Open file"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <File className="h-3 w-3 text-gray-600" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Max size: {maxSizeMB}MB per file. Max files: {maxFiles}. Accepted: {accept}
      </p>

      {/* Full-Size Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
            <div 
              className="relative w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={viewingImage.url}
                alt={viewingImage.fileName}
                fill
                className="object-contain"
                unoptimized
                priority
              />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 rounded-lg px-4 py-2 shadow-lg">
              <p className="text-sm font-medium text-gray-900">{viewingImage.fileName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
