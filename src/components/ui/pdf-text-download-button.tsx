'use client'

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { handlePDFTextDownload, formatFormFilename, PDFDownloadOptions } from '@/lib/pdf-utils'
import { TextBlock } from '@/lib/plain-text-pdf'
import { toast } from 'sonner'

interface PDFTextDownloadButtonProps {
  formType: string
  patientName?: string
  date?: string
  children: ReactNode
  getBlocks: () => TextBlock[]
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  options?: Partial<PDFDownloadOptions>
}

/**
 * PDF download button that uses text-first PDF generation
 * Generates clean, searchable PDFs from text blocks
 */
export function PDFTextDownloadButton({
  formType,
  patientName,
  date,
  children,
  getBlocks,
  className,
  variant = 'outline',
  size = 'default',
  options,
}: PDFTextDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload() {
    setIsDownloading(true)
    try {
      const filename = formatFormFilename(formType, patientName, date)
      
      const success = await handlePDFTextDownload(getBlocks, {
        filename,
        ...options,
      })

      if (success) {
        toast.success('PDF downloaded successfully')
      } else {
        toast.error('Failed to generate PDF - check console for details')
      }
    } catch (error) {
      console.error('PDF download error:', error)
      toast.error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      variant={variant}
      size={size}
      className={className}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          {children}
        </>
      )}
    </Button>
  )
}
