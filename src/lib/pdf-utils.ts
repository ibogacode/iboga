'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface PDFDownloadOptions {
  filename: string
  title?: string
  orientation?: 'portrait' | 'landscape'
  format?: 'a4' | 'letter'
  margin?: number
}

/**
 * Replace unsupported CSS color functions with fallback colors
 */
function sanitizeElementForCanvas(element: HTMLElement): () => void {
  const elementsWithLabColor: { el: HTMLElement; originalBg: string; originalColor: string }[] = []

  // Find all elements and check their computed styles
  const allElements = element.querySelectorAll('*')
  const checkAndReplace = (el: HTMLElement) => {
    const computedStyle = window.getComputedStyle(el)
    const bgColor = computedStyle.backgroundColor
    const textColor = computedStyle.color

    // Check if color contains lab(), lch(), oklch(), oklab()
    const hasUnsupportedColor = (color: string) =>
      color.includes('lab(') ||
      color.includes('lch(') ||
      color.includes('oklch(') ||
      color.includes('oklab(')

    if (hasUnsupportedColor(bgColor) || hasUnsupportedColor(textColor)) {
      elementsWithLabColor.push({
        el,
        originalBg: el.style.backgroundColor,
        originalColor: el.style.color,
      })
      // Replace with fallback colors
      if (hasUnsupportedColor(bgColor)) {
        el.style.backgroundColor = '#ffffff'
      }
      if (hasUnsupportedColor(textColor)) {
        el.style.color = '#000000'
      }
    }
  }

  checkAndReplace(element)
  allElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      checkAndReplace(el)
    }
  })

  // Return cleanup function
  return () => {
    elementsWithLabColor.forEach(({ el, originalBg, originalColor }) => {
      el.style.backgroundColor = originalBg
      el.style.color = originalColor
    })
  }
}

/**
 * Generate and download a PDF from an HTML element
 */
export async function downloadElementAsPDF(
  element: HTMLElement,
  options: PDFDownloadOptions
): Promise<void> {
  const {
    filename,
    orientation = 'portrait',
    format = 'a4',
    margin = 10,
  } = options

  // Sanitize element to remove unsupported CSS color functions
  const cleanup = sanitizeElementForCanvas(element)

  try {
    // Convert HTML to canvas directly without cloning
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (el) => {
        // Ignore elements with print:hidden class
        return el.classList?.contains('print:hidden') ||
               el.getAttribute?.('data-html2canvas-ignore') === 'true'
      },
    })

    // Calculate dimensions
    const imgWidth = format === 'a4' ? 210 : 216 // mm
    const imgHeight = format === 'a4' ? 297 : 279 // mm
    const pageWidth = imgWidth - margin * 2
    const pageHeight = imgHeight - margin * 2

    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    })

    // Calculate the scaling ratio
    const widthRatio = pageWidth / canvasWidth
    const scaledHeight = canvasHeight * widthRatio

    // If content fits on one page
    if (scaledHeight <= pageHeight) {
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(imgData, 'JPEG', margin, margin, pageWidth, scaledHeight)
    } else {
      // Multiple pages needed
      const pageCanvasHeight = pageHeight / widthRatio
      let sourceY = 0
      let pageNum = 0

      while (sourceY < canvasHeight) {
        if (pageNum > 0) {
          pdf.addPage()
        }

        const sliceHeight = Math.min(pageCanvasHeight, canvasHeight - sourceY)

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvasWidth
        pageCanvas.height = sliceHeight
        const ctx = pageCanvas.getContext('2d')

        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvasWidth, sliceHeight)
          ctx.drawImage(
            canvas,
            0, sourceY, canvasWidth, sliceHeight,
            0, 0, canvasWidth, sliceHeight
          )

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95)
          const pageContentHeight = sliceHeight * widthRatio

          pdf.addImage(pageImgData, 'JPEG', margin, margin, pageWidth, pageContentHeight)
        }

        sourceY += pageCanvasHeight
        pageNum++
      }
    }

    // Download
    pdf.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Error in downloadElementAsPDF:', error)
    throw error
  } finally {
    // Restore original styles
    cleanup()
  }
}

/**
 * Download button component helper - generates PDF from a ref
 */
export async function handlePDFDownload(
  contentRef: React.RefObject<HTMLElement>,
  options: PDFDownloadOptions
): Promise<boolean> {
  if (!contentRef.current) {
    console.error('Content ref is not available')
    return false
  }

  try {
    await downloadElementAsPDF(contentRef.current, options)
    return true
  } catch (error) {
    console.error('Error generating PDF:', error)
    return false
  }
}

/**
 * Format form name for filename
 */
export function formatFormFilename(
  formType: string,
  patientName?: string,
  date?: string
): string {
  const parts: string[] = []

  // Add form type
  parts.push(formType.replace(/\s+/g, '-').toLowerCase())

  // Add patient name if provided
  if (patientName) {
    parts.push(patientName.replace(/\s+/g, '-').toLowerCase())
  }

  // Add date
  const dateStr = date || new Date().toISOString().split('T')[0]
  parts.push(dateStr)

  return parts.join('_')
}
