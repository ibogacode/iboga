'use client'

import { useState, useRef, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { handlePDFDownload, formatFormFilename } from '@/lib/pdf-utils'
import { toast } from 'sonner'

interface PDFDownloadButtonProps {
  formType: string
  patientName?: string
  date?: string
  children: ReactNode
  contentRef: React.RefObject<HTMLElement>
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function PDFDownloadButton({
  formType,
  patientName,
  date,
  children,
  contentRef,
  className,
  variant = 'outline',
  size = 'default',
}: PDFDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload() {
    if (!contentRef.current) {
      toast.error('Content not ready for PDF generation')
      return
    }

    setIsDownloading(true)
    try {
      const filename = formatFormFilename(formType, patientName, date)
      console.log('Starting PDF download for:', filename)
      console.log('Content ref element:', contentRef.current)

      const success = await handlePDFDownload(contentRef, { filename })

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

/**
 * Wrapper component that provides the ref and download button
 */
interface PDFDownloadWrapperProps {
  formType: string
  patientName?: string
  date?: string
  children: ReactNode
  buttonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  buttonText?: string
}

export function PDFDownloadWrapper({
  formType,
  patientName,
  date,
  children,
  buttonPosition = 'top-right',
  buttonText = 'Download PDF',
}: PDFDownloadWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }

  return (
    <div className="relative">
      <div className={`fixed ${positionClasses[buttonPosition]} z-50 print:hidden`}>
        <PDFDownloadButton
          formType={formType}
          patientName={patientName}
          date={date}
          contentRef={contentRef as React.RefObject<HTMLElement>}
        >
          {buttonText}
        </PDFDownloadButton>
      </div>
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  )
}
