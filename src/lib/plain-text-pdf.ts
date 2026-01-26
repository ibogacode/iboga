'use client'

import jsPDF from 'jspdf'
import { formatFormFilename } from './pdf-utils'

/**
 * Text block types for PDF generation
 */
export type TextBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'kv'; key: string; value: string }
  | { type: 'spacer'; height?: number }

export interface PlainTextPDFOptions {
  format?: 'a4' | 'letter'
  marginMm?: number
  fontSize?: {
    h1?: number
    h2?: number
    h3?: number
    p?: number
    kv?: { key?: number; value?: number }
  }
  lineHeight?: {
    h1?: number
    h2?: number
    h3?: number
    p?: number
  }
}

const DEFAULT_OPTIONS: Required<PlainTextPDFOptions> = {
  format: 'a4',
  marginMm: 12, // Reduced from 15mm to use more page width
  fontSize: {
    h1: 16,
    h2: 13,
    h3: 11,
    p: 9,
    kv: { key: 9, value: 9 },
  },
  lineHeight: {
    h1: 1.3,  // With pt-to-mm conversion: 16pt * 0.35 * 1.3 ≈ 7.3mm
    h2: 1.3,  // With pt-to-mm conversion: 13pt * 0.35 * 1.3 ≈ 5.9mm
    h3: 1.25, // With pt-to-mm conversion: 11pt * 0.35 * 1.25 ≈ 4.8mm
    p: 1.4,   // With pt-to-mm conversion: 9pt * 0.35 * 1.4 ≈ 4.4mm
  },
}

// Minimum space required at bottom of page to prevent orphan headings (in mm)
const MIN_ORPHAN_SPACE_MM = 12

/**
 * Download a PDF from text blocks using jsPDF text rendering
 * Supports automatic page breaks and orphan heading prevention
 */
export function downloadPlainTextPDF(
  blocks: TextBlock[],
  filename: string,
  options?: PlainTextPDFOptions
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const fontSize = { ...DEFAULT_OPTIONS.fontSize, ...(options?.fontSize || {}) }
  const fontSizeKv = { ...DEFAULT_OPTIONS.fontSize.kv, ...(options?.fontSize?.kv || {}) }
  const lineHeight = { ...DEFAULT_OPTIONS.lineHeight, ...(options?.lineHeight || {}) }

  // Create PDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: opts.format,
  })

  const pageWidth = opts.format === 'a4' ? 210 : 216
  const pageHeight = opts.format === 'a4' ? 297 : 279
  const contentWidth = pageWidth - opts.marginMm * 2
  // Clamp textWrapWidth to contentWidth to prevent right-margin overflow
  const textWrapWidth = contentWidth
  let currentY = opts.marginMm

  /**
   * Check if we need a new page and add it if necessary
   * Returns true if a new page was added
   * Uses equal top and bottom margins
   */
  function checkPageBreak(requiredHeight: number): boolean {
    // Use same margin for top and bottom to ensure equal spacing
    // Top margin is already accounted for by starting currentY at opts.marginMm
    // So we only need to subtract the bottom margin from pageHeight
    const effectivePageHeight = pageHeight - opts.marginMm
    if (currentY + requiredHeight > effectivePageHeight) {
      pdf.addPage()
      currentY = opts.marginMm
      return true
    }
    return false
  }

  /**
   * Prevent orphan headings: if a heading would be too close to page bottom,
   * start a new page before printing it
   */
  function preventOrphanHeading(block: TextBlock): void {
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      const remainingSpace = pageHeight - opts.marginMm - currentY
      if (remainingSpace < MIN_ORPHAN_SPACE_MM) {
        pdf.addPage()
        currentY = opts.marginMm
      }
    }
  }

  // Convert points to mm (1 point = 0.352778 mm)
  const ptToMm = 0.352778

  /**
   * Add text with word wrapping (left-aligned)
   */
  function addText(text: string, size: number, isBold: boolean = false, lineHeightMultiplier: number = 1.1): number {
    pdf.setFontSize(size)
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal')
    
    const lines = pdf.splitTextToSize(text, textWrapWidth)
    // Convert font size from points to mm, then apply line height multiplier
    const lineHeightMm = size * ptToMm * lineHeightMultiplier
    const requiredHeight = lines.length * lineHeightMm
    
    lines.forEach((line: string) => {
      // Check page break for each line to handle multi-page text
      checkPageBreak(lineHeightMm)
      pdf.text(line, opts.marginMm, currentY)
      currentY += lineHeightMm
    })
    
    return requiredHeight
  }

  /**
   * Add centered text with word wrapping (for titles)
   */
  function addCenteredText(text: string, size: number, isBold: boolean = false, lineHeightMultiplier: number = 1.1): number {
    pdf.setFontSize(size)
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal')
    
    const lines = pdf.splitTextToSize(text, textWrapWidth)
    // Convert font size from points to mm, then apply line height multiplier
    const lineHeightMm = size * ptToMm * lineHeightMultiplier
    
    // Check if we need a new page before adding text
    const requiredHeight = lines.length * lineHeightMm
    checkPageBreak(requiredHeight)
    
    lines.forEach((line: string) => {
      // Calculate text width and center position
      const textWidth = pdf.getTextWidth(line)
      const centerX = pageWidth / 2 - textWidth / 2
      pdf.text(line, centerX, currentY)
      currentY += lineHeightMm
    })
    
    return requiredHeight
  }

  // Process each block
  blocks.forEach((block) => {
    // Prevent orphan headings
    preventOrphanHeading(block)

    // Get font sizes with fallbacks
    const h1Size = fontSize.h1 ?? 16
    const h2Size = fontSize.h2 ?? 13
    const h3Size = fontSize.h3 ?? 11
    const pSize = fontSize.p ?? 9
    const kvKeySize = fontSizeKv.key ?? 9
    const kvValueSize = fontSizeKv.value ?? 9
    const h1LineHeight = lineHeight.h1 ?? 1.3
    const h2LineHeight = lineHeight.h2 ?? 1.3
    const h3LineHeight = lineHeight.h3 ?? 1.25
    const pLineHeight = lineHeight.p ?? 1.4

    switch (block.type) {
      case 'h1':
        currentY += 1.5 // Top margin (reduced)
        addCenteredText(block.text, h1Size, true, h1LineHeight) // Center h1 titles
        currentY += 1 // Bottom margin (reduced)
        break

      case 'h2':
        currentY += 1.5 // Top margin (reduced)
        addText(block.text, h2Size, true, h2LineHeight)
        currentY += 0.5 // Bottom margin (reduced)
        break

      case 'h3':
        currentY += 1 // Top margin (reduced)
        addText(block.text, h3Size, true, h3LineHeight)
        currentY += 0.3 // Bottom margin (reduced)
        break

      case 'p':
        // No top margin for paragraphs - they follow headings closely
        const pLines = pdf.splitTextToSize(block.text, textWrapWidth)
        pdf.setFontSize(pSize)
        pdf.setFont('helvetica', 'normal')
        
        // Convert points to mm for line height
        const pLineHeightMm = pSize * ptToMm * pLineHeight
        checkPageBreak(pLines.length * pLineHeightMm)
        
        pLines.forEach((line: string) => {
          pdf.text(line, opts.marginMm, currentY)
          currentY += pLineHeightMm
        })
        currentY += 0.3 // Bottom margin (reduced)
        break

      case 'kv':
        // No top margin for key-value pairs
        pdf.setFontSize(kvKeySize)
        pdf.setFont('helvetica', 'bold')
        
        // Key (bold, on same line if fits, otherwise wrap)
        const keyLines = pdf.splitTextToSize(block.key, textWrapWidth * 0.4) // Key takes ~40% width
        const keyLineHeightMm = kvKeySize * ptToMm * 1.15 // Convert to mm
        
        // Value (normal, wraps)
        pdf.setFontSize(kvValueSize)
        pdf.setFont('helvetica', 'normal')
        const valueLines = pdf.splitTextToSize(block.value || 'N/A', textWrapWidth * 0.6) // Value takes ~60% width
        const valueLineHeightMm = kvValueSize * ptToMm * 1.15 // Convert to mm
        
        const kvHeight = Math.max(keyLines.length, valueLines.length) * Math.max(keyLineHeightMm, valueLineHeightMm)
        checkPageBreak(kvHeight)
        
        // Print key and value side by side if both fit on one line, otherwise stack
        if (keyLines.length === 1 && valueLines.length === 1) {
          pdf.setFontSize(kvKeySize)
          pdf.setFont('helvetica', 'bold')
          pdf.text(keyLines[0], opts.marginMm, currentY)
          
          pdf.setFontSize(kvValueSize)
          pdf.setFont('helvetica', 'normal')
          pdf.text(valueLines[0], opts.marginMm + contentWidth * 0.4 + 3, currentY) // Reduced gap
          
          currentY += Math.max(keyLineHeightMm, valueLineHeightMm)
        } else {
          // Stack vertically
          keyLines.forEach((line: string) => {
            pdf.setFontSize(kvKeySize)
            pdf.setFont('helvetica', 'bold')
            pdf.text(line, opts.marginMm, currentY)
            currentY += keyLineHeightMm
          })
          
          valueLines.forEach((line: string) => {
            pdf.setFontSize(kvValueSize)
            pdf.setFont('helvetica', 'normal')
            pdf.text(line, opts.marginMm + 3, currentY) // Reduced indent
            currentY += valueLineHeightMm
          })
        }
        
        currentY += 0.2 // Bottom margin (minimal)
        break

      case 'spacer':
        const spacerHeight = block.height || 1.5 // Reduced default from 2
        checkPageBreak(spacerHeight)
        currentY += spacerHeight
        break
    }
  })

  // Save the PDF
  pdf.save(`${filename}.pdf`)
}

/**
 * Helper to format boolean values as Yes/No
 */
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return 'N/A'
}

/**
 * Helper to format date values
 */
export function formatDateForPDF(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/**
 * Helper to format currency values
 */
export function formatCurrencyForPDF(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return 'N/A'
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.]/g, '')) : amount
  if (isNaN(num)) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num)
}
