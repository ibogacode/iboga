'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'

export interface PDFDownloadOptions {
  filename: string
  title?: string
  orientation?: 'portrait' | 'landscape'
  format?: 'a4' | 'letter'
  margin?: number
}

// Debug flag for PDF break diagnostics
const DEBUG_PDF_BREAKS = false

// Minimum space required at bottom of page to prevent orphan headings
const MIN_ORPHAN_SPACE_PX = 250

/**
 * Find ranges that should be kept together (not split across pages)
 * Returns array of {start, end} positions that should not be split
 */
function findKeepTogetherRanges(element: HTMLElement, scale: number): Array<{start: number, end: number}> {
  const ranges: Array<{start: number, end: number}> = []
  const elementRect = element.getBoundingClientRect()

  // Find elements marked with pdf-keep-together or print:break-inside-avoid
  const keepTogetherElements = element.querySelectorAll(
    '.pdf-keep-together, [class*="break-inside-avoid"], .print\\:break-inside-avoid'
  )

  keepTogetherElements.forEach((el) => {
    const rect = el.getBoundingClientRect()
    ranges.push({
      start: (rect.top - elementRect.top) * scale,
      end: (rect.bottom - elementRect.top) * scale
    })
  })

  // Keep headings (h1, h2, h3) together with their next meaningful sibling block
  const headings = element.querySelectorAll('h1, h2, h3')
  headings.forEach((heading) => {
    const headingRect = heading.getBoundingClientRect()
    const headingStart = (headingRect.top - elementRect.top) * scale
    
    // Find the first meaningful sibling block element
    // Skip empty elements, separators, spacers, and very small elements
    let nextSibling: Element | null = heading.nextElementSibling
    while (nextSibling) {
      const tagName = nextSibling.tagName.toLowerCase()
      const htmlEl = nextSibling as HTMLElement
      const rect = nextSibling.getBoundingClientRect()
      const height = rect.height
      
      // Skip HR elements (horizontal rules/separators)
      if (tagName === 'hr') {
        nextSibling = nextSibling.nextElementSibling
        continue
      }
      
      // Skip elements with very small height (< 24px) unless they contain text
      const hasText = htmlEl.textContent && htmlEl.textContent.trim().length > 0
      if (height < 24 && !hasText) {
        nextSibling = nextSibling.nextElementSibling
        continue
      }
      
      // Skip elements that are likely separators/spacers
      const classList = Array.from(htmlEl.classList)
      const isSeparator = 
        classList.some(cls => 
          cls.includes('border-t') || 
          cls.includes('border-b') || 
          cls.includes('h-px') || 
          cls.includes('divider') ||
          cls.includes('separator')
        ) ||
        (classList.some(cls => cls.includes('my-') || cls.includes('py-')) && !hasText)
      
      if (isSeparator) {
        nextSibling = nextSibling.nextElementSibling
        continue
      }
      
      // Check if it's a block-level element
      const isBlockElement = ['div', 'p', 'section', 'article', 'ul', 'ol', 'dl', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)
      
      if (isBlockElement && hasText) {
        const nextRect = nextSibling.getBoundingClientRect()
        const nextEnd = (nextRect.bottom - elementRect.top) * scale
        
        // Create a keep-together range from heading start to next sibling end
        ranges.push({
          start: headingStart,
          end: nextEnd
        })
        
        if (DEBUG_PDF_BREAKS) {
          console.log(`[PDF] Heading keep-together range: ${heading.tagName} "${heading.textContent?.trim()}"`, {
            start: headingStart / scale,
            end: nextEnd / scale,
            height: (nextEnd - headingStart) / scale
          })
        }
        break
      }
      
      nextSibling = nextSibling.nextElementSibling
    }
  })

  return ranges
}

/**
 * Find safe break points in the element to avoid cutting content mid-section
 * Returns an array of Y positions (in pixels relative to element top) where it's safe to break
 */
function findBreakPoints(element: HTMLElement, scale: number): number[] {
  const breakPoints: number[] = [0] // Start with 0
  const elementRect = element.getBoundingClientRect()

  // First, find explicit break points marked with pdf-break-point class
  const explicitBreakElements = element.querySelectorAll('.pdf-break-point, .pdf-break-before, .pdf-break-after')
  explicitBreakElements.forEach((el) => {
    const rect = el.getBoundingClientRect()
    if (el.classList.contains('pdf-break-before') || el.classList.contains('pdf-break-point')) {
      breakPoints.push((rect.top - elementRect.top) * scale)
    }
    if (el.classList.contains('pdf-break-after') || el.classList.contains('pdf-break-point')) {
      breakPoints.push((rect.bottom - elementRect.top) * scale)
    }
  })

  // Find all major section boundaries (divs with space-y, mb-, sections, etc.)
  const breakableSelectors = [
    // Explicit section markers
    '.pdf-break-point',
    // Section containers - look for direct children of spacing containers
    '.space-y-6 > div',
    '.space-y-4 > div',
    '.space-y-8 > div',
    '.space-y-3 > div',
    // Semantic elements
    'section',
    'article',
    // Border separators (good break points)
    '[class*="border-t"]',
    '[class*="border-b"]',
    // Form section patterns - these are commonly used as major sections
    '.mb-8',
    '.mb-6',
    '.mt-8',
    '.pt-8',
    '.pt-6',
  ]

  // Get all potential break point elements (excluding headings for now)
  const breakableElements = element.querySelectorAll(breakableSelectors.join(', '))

  breakableElements.forEach((el) => {
    const rect = el.getBoundingClientRect()
    // Get the top position relative to the parent element, scaled
    const relativeTop = (rect.top - elementRect.top) * scale

    // Prefer breaking BEFORE sections (at the top of elements)
    if (relativeTop > 0) {
      breakPoints.push(relativeTop)
    }
  })

  // Handle headings (h1, h2) as breakpoints only if there's enough room after them
  // This prevents "heading at top + huge whitespace below" layouts
  const headings = element.querySelectorAll('h1, h2')
  const minContentAfterHeading = 200 * scale // ~200px of content needed after heading
  
  headings.forEach((heading) => {
    const rect = heading.getBoundingClientRect()
    const relativeTop = (rect.top - elementRect.top) * scale
    const relativeBottom = (rect.bottom - elementRect.top) * scale
    
    // Calculate available space after heading
    const elementHeight = (element.getBoundingClientRect().bottom - elementRect.top) * scale
    const spaceAfterHeading = elementHeight - relativeBottom
    
    // Only use heading as breakpoint if there's enough room for content after it
    // OR if it's explicitly marked as a break point
    if (relativeTop > 0 && (spaceAfterHeading >= minContentAfterHeading || heading.classList.contains('pdf-break-point'))) {
      breakPoints.push(relativeTop)
    }
  })

  // Sort and remove duplicates
  const sortedPoints = [...new Set(breakPoints)].sort((a, b) => a - b)

  // Merge points that are too close together (within 30 scaled pixels)
  const mergedPoints: number[] = [0]
  for (let i = 1; i < sortedPoints.length; i++) {
    if (sortedPoints[i] - mergedPoints[mergedPoints.length - 1] > 30 * scale) {
      mergedPoints.push(sortedPoints[i])
    }
  }

  return mergedPoints
}

/**
 * Apply PDF/print-safe CSS spacing overrides to reduce excessive spacing for headings
 * This helps prevent large blank spaces in PDF output
 */
function applyPDFPrintStyles(clonedDoc: Document): void {
  // Create a style element if it doesn't exist
  let styleElement = clonedDoc.getElementById('pdf-print-styles')
  if (!styleElement) {
    styleElement = clonedDoc.createElement('style')
    styleElement.id = 'pdf-print-styles'
    clonedDoc.head.appendChild(styleElement)
  }

  // Add CSS rules to reduce heading spacing
  const cssRules = `
    /* Reduce heading margins for PDF/print */
    h1, h2, h3 {
      margin-bottom: 8px !important;
      margin-top: 0 !important;
    }
    
    /* Remove large top margins from headings */
    h1[class*="mt-"], h2[class*="mt-"], h3[class*="mt-"] {
      margin-top: 0 !important;
    }
    
    /* Reduce spacing after headings */
    h1 + *, h2 + *, h3 + * {
      margin-top: 4px !important;
    }
    
    /* Reduce large margin-bottom classes on headings */
    h1[class*="mb-"], h2[class*="mb-"], h3[class*="mb-"] {
      margin-bottom: 8px !important;
    }
  `

  styleElement.textContent = cssRules
}

/**
 * Find the best break point that doesn't exceed the maximum height
 * Also considers keep-together ranges to avoid breaking within them
 * Prevents orphan headings near the bottom of pages
 */
function findBestBreakPoint(
  breakPoints: number[],
  keepTogetherRanges: Array<{start: number, end: number}>,
  currentY: number,
  maxHeight: number,
  canvasHeight: number,
  headingPositions?: number[]
): number {
  // Find all break points that would fit within the page
  const validPoints = breakPoints.filter(
    (point) => point > currentY && point <= currentY + maxHeight
  )

  if (validPoints.length === 0) {
    // No valid break points found, use the max height (fallback)
    return Math.min(currentY + maxHeight, canvasHeight)
  }

  // Filter out break points that fall within a keep-together range
  const safePoints = validPoints.filter((point) => {
    return !keepTogetherRanges.some(
      (range) => point > range.start && point < range.end
    )
  })

  // Find the best break point
  let bestBreakPoint: number
  if (safePoints.length > 0) {
    bestBreakPoint = safePoints[safePoints.length - 1]
  } else {
    // Fallback to any valid point if no safe points exist
    bestBreakPoint = validPoints[validPoints.length - 1]
  }

  // Prevent orphan headings: if the next slice would start at a heading
  // and there's not enough space left on current page, break before the heading
  if (headingPositions && headingPositions.length > 0) {
    const remainingSpace = currentY + maxHeight - bestBreakPoint
    const minOrphanSpace = MIN_ORPHAN_SPACE_PX * 2 // Scale factor is 2
    
    // Check if any heading would be orphaned (heading starts near end of page)
    for (const headingY of headingPositions) {
      if (headingY > currentY && headingY <= currentY + maxHeight) {
        const spaceBeforeHeading = headingY - currentY
        const spaceAfterHeading = currentY + maxHeight - headingY
        
        // If heading is within orphan threshold and there's not enough space after it
        if (spaceAfterHeading < minOrphanSpace && spaceBeforeHeading > 0) {
          // Find the last safe breakpoint before this heading
          const breakBeforeHeading = breakPoints
            .filter(p => p > currentY && p < headingY)
            .sort((a, b) => b - a)[0] // Get the last one before heading
          
          if (breakBeforeHeading) {
            // Check if this breakpoint is safe (not in a keep-together range)
            const isSafe = !keepTogetherRanges.some(
              (range) => breakBeforeHeading > range.start && breakBeforeHeading < range.end
            )
            
            if (isSafe) {
              bestBreakPoint = breakBeforeHeading
              
              if (DEBUG_PDF_BREAKS) {
                console.log(`[PDF] Prevented orphan heading at ${headingY / 2}px, moved break to ${breakBeforeHeading / 2}px`)
              }
              break
            }
          }
        }
      }
    }
  }

  if (DEBUG_PDF_BREAKS) {
    console.log(`[PDF] Break point selection:`, {
      currentY: currentY / 2,
      maxHeight: maxHeight / 2,
      selectedBreak: bestBreakPoint / 2,
      sliceHeight: (bestBreakPoint - currentY) / 2,
      remainingSpace: (currentY + maxHeight - bestBreakPoint) / 2
    })
  }

  return bestBreakPoint
}

/**
 * Generate and download a PDF from an HTML element
 * Uses html2canvas-pro which supports modern CSS color functions (lab, oklch, etc.)
 * Implements smart page breaks to avoid cutting content mid-section
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

  const scale = 2 // Canvas scale for higher quality

  try {
    // Find the actual content element to capture (prefer data-pdf-content, fallback to passed element)
    // This fixes "unused right side" by capturing the content wrapper instead of outer container
    const captureElement = element.querySelector('[data-pdf-content]') as HTMLElement ?? element
    
    // Find break points and keep-together ranges BEFORE converting to canvas (while DOM is still accessible)
    const breakPoints = findBreakPoints(captureElement, scale)
    const keepTogetherRanges = findKeepTogetherRanges(captureElement, scale)
    
    // Extract heading positions for orphan prevention
    const elementRect = captureElement.getBoundingClientRect()
    const headings = captureElement.querySelectorAll('h1, h2, h3')
    const headingPositions = Array.from(headings).map(heading => {
      const rect = heading.getBoundingClientRect()
      return (rect.top - elementRect.top) * scale
    })
    
    if (DEBUG_PDF_BREAKS) {
      console.log('[PDF] Heading keep-together ranges:', keepTogetherRanges.map(r => ({
        start: r.start / scale,
        end: r.end / scale
      })))
      console.log('[PDF] Heading positions:', headingPositions.map(p => p / scale))
    }

    // Convert HTML to canvas using html2canvas-pro (supports lab/oklch colors)
    const canvas = await html2canvas(captureElement, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        // Find the capture element in the cloned DOM (same selector logic)
        const clonedCaptureEl = clonedDoc.querySelector('[data-pdf-content]') as HTMLElement ?? 
                                (clonedDoc.body.firstElementChild as HTMLElement)
        
        if (clonedCaptureEl) {
          // Force full-width styling ONLY in the cloned doc to fix "unused right side"
          // This removes width constraints (max-w-*, container, w-fit) and expands content to full width
          const forceFullWidth = (el: HTMLElement) => {
            if (!el.style) return
            
            // Remove Tailwind width constraints by overriding computed styles
            el.style.maxWidth = 'none'
            el.style.width = '100%'
            el.style.marginLeft = '0'
            el.style.marginRight = '0'
            
            // Remove Tailwind classes that constrain width (handled via style overrides above)
            // Note: We can't remove classes from cloned DOM easily, so style overrides are sufficient
          }
          
          // Apply to capture element
          forceFullWidth(clonedCaptureEl)
          
          // Also ensure parent wrappers don't restrict width (walk up 2-3 parents)
          let parent = clonedCaptureEl.parentElement
          let depth = 0
          while (parent && depth < 3 && parent !== clonedDoc.body) {
            forceFullWidth(parent as HTMLElement)
            parent = parent.parentElement
            depth++
          }
          
          // Ensure all elements are visible in the cloned document
          const allElements = clonedCaptureEl.querySelectorAll('*')
          allElements.forEach((el) => {
            // Ensure visibility
            const htmlEl = el as HTMLElement
            if (htmlEl.style) {
              if (htmlEl.style.display === 'none') htmlEl.style.display = 'block'
              if (htmlEl.style.visibility === 'hidden') htmlEl.style.visibility = 'visible'
              if (htmlEl.style.opacity === '0') htmlEl.style.opacity = '1'
            }
          })
        }
        
        // Apply PDF/print-safe CSS spacing overrides for headings
        applyPDFPrintStyles(clonedDoc)
      },
      ignoreElements: (el) => {
        // Ignore elements with print:hidden class or buttons
        return el.classList?.contains('print:hidden') ||
               el.getAttribute?.('data-html2canvas-ignore') === 'true' ||
               el.tagName === 'BUTTON'
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
      // Multiple pages needed - use smart break points
      const maxPageCanvasHeight = pageHeight / widthRatio
      let sourceY = 0
      let pageNum = 0

      // Add canvas height as final break point
      const allBreakPoints = [...breakPoints, canvasHeight]

      while (sourceY < canvasHeight) {
        if (pageNum > 0) {
          pdf.addPage()
        }

        // Find the best break point for this page
        const nextBreakY = findBestBreakPoint(
          allBreakPoints,
          keepTogetherRanges,
          sourceY,
          maxPageCanvasHeight,
          canvasHeight,
          headingPositions
        )

        const sliceHeight = nextBreakY - sourceY
        
        // Ensure we always make progress to prevent infinite loops
        if (sliceHeight <= 0) {
          console.warn('PDF generation: no progress made, forcing minimum slice')
          sourceY = Math.min(sourceY + maxPageCanvasHeight, canvasHeight)
          pageNum++
          continue
        }
        
        if (DEBUG_PDF_BREAKS) {
          console.log(`[PDF] Page ${pageNum + 1}:`, {
            sourceY: sourceY / scale,
            nextBreakY: nextBreakY / scale,
            sliceHeight: sliceHeight / scale
          })
        }

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

        sourceY = nextBreakY
        pageNum++

        // Safety check to prevent infinite loops
        if (pageNum > 100) {
          console.warn('PDF generation: exceeded maximum page limit')
          break
        }
      }
    }

    // Download
    pdf.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Error in downloadElementAsPDF:', error)
    throw error
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
// Sanitize string for use in filename
function sanitizeForFilename(str: string): string {
  return str
    .replace(/[/\\:*?"<>|]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .toLowerCase()
}

export function formatFormFilename(
  formType: string,
  patientName?: string,
  date?: string
): string {
  const parts: string[] = []

  // Add form type
  parts.push(sanitizeForFilename(formType))

  // Add patient name if provided
  if (patientName) {
    parts.push(sanitizeForFilename(patientName))
  }

  // Add date
  const dateStr = date || new Date().toISOString().split('T')[0]
  parts.push(dateStr)

  return parts.join('_')
}

/**
 * Download PDF from text blocks (new text-first strategy)
 * This is the preferred method for generating clean, searchable PDFs
 */
export async function handlePDFTextDownload(
  getBlocks: () => import('./plain-text-pdf').TextBlock[],
  options: PDFDownloadOptions
): Promise<boolean> {
  try {
    const { downloadPlainTextPDF } = await import('./plain-text-pdf')
    const blocks = getBlocks()
    
    downloadPlainTextPDF(blocks, options.filename, {
      format: options.format || 'a4',
      marginMm: options.margin || 15,
    })
    
    return true
  } catch (error) {
    console.error('Error generating text PDF:', error)
    return false
  }
}
