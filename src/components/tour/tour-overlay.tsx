'use client'

import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTour } from '@/contexts/tour-context'
import { cn } from '@/lib/utils'

export function TourOverlay() {
  const { isActive, currentStepIndex, steps, nextStep, previousStep, stopTour, skipTour } = useTour()
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' | 'center' } | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const currentStep = steps[currentStepIndex]

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetElement(null)
      setTargetRect(null)
      setTooltipPosition(null)
      setError(null)
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
      return
    }

    // If step has no selector or placement is 'center', skip element finding and center the tooltip
    if (!currentStep.selector || currentStep.selector === '' || currentStep.placement === 'center') {
      setIsWaiting(false)
      setTargetElement(null)
      setTargetRect(null)
      setTooltipPosition({ top: 0, left: 0, placement: 'center' })
      setError(null)
      return
    }

    setIsWaiting(true)
    setError(null)

    const findElement = () => {
      const element = document.querySelector(`[data-tour="${currentStep.selector}"]`) as HTMLElement
      return element
    }

    // Navigate to route if needed
    if (currentStep.route) {
      // Wait a bit for navigation to complete
      setTimeout(() => {
        // Special handling for profile password step - activate security tab
        if (currentStep.id === 'profile-password') {
          // Find and click the security tab button
          const securityTabButton = document.querySelector('button[data-tour-security-tab="true"]') as HTMLElement
          if (securityTabButton) {
            securityTabButton.click()
            // Wait a bit for tab to activate and content to render
            setTimeout(() => checkForElement(), 500)
            return
          }
        }
        checkForElement()
      }, 500)
    } else {
      checkForElement()
    }

    function checkForElement() {
      let attempts = 0
      const maxAttempts = (currentStep.waitForSelector || 2000) / 100 // Check every 100ms
      
      checkIntervalRef.current = setInterval(() => {
        attempts++
        const element = findElement()
        
        if (element) {
          setIsWaiting(false)
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current)
            checkIntervalRef.current = null
          }
          
          // Scroll element into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
          
          // Wait for scroll to complete, then set element
          setTimeout(() => {
            const rect = element.getBoundingClientRect()
            setTargetElement(element)
            setTargetRect(rect)
            // Position will be calculated by useLayoutEffect after tooltip renders
          }, 300)
        } else if (attempts >= maxAttempts) {
          setIsWaiting(false)
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current)
            checkIntervalRef.current = null
          }
          setError(`Element not found: ${currentStep.selector}. This step will be skipped.`)
          // Auto-advance after showing error
          setTimeout(() => {
            if (currentStepIndex < steps.length - 1) {
              nextStep()
            } else {
              stopTour()
            }
          }, 2000)
        }
      }, 100)
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
    }
  }, [isActive, currentStepIndex, currentStep, steps.length, nextStep, stopTour])

  // Measure and position tooltip after it's rendered
  useLayoutEffect(() => {
    if (!targetRect || !currentStep) return

    // Use a small delay to ensure tooltip is rendered and measured
    const timeoutId = setTimeout(() => {
      if (tooltipRef.current && targetRect && currentStep) {
        const placement = currentStep.placement || 'bottom'
        if (placement !== 'center') {
          calculateTooltipPosition(targetRect, placement)
        }
      }
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [targetRect, currentStep])

  // Update tooltip position when window resizes or scrolls
  useEffect(() => {
    if (!targetElement || !isActive) return

    const updatePosition = () => {
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect()
        setTargetRect(rect)
        // Position will be recalculated by useLayoutEffect
      }
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    // Listen to visual viewport changes (handles mobile browser UI changes)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updatePosition)
      window.visualViewport.addEventListener('scroll', updatePosition)
    }

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updatePosition)
        window.visualViewport.removeEventListener('scroll', updatePosition)
      }
    }
  }, [targetElement, isActive])

  const calculateTooltipPosition = (rect: DOMRect, preferredPlacement: 'top' | 'bottom' | 'left' | 'right') => {
    if (!tooltipRef.current) return

    const tooltip = tooltipRef.current
    // Force a reflow to ensure tooltip is measured
    void tooltip.offsetHeight
    const tooltipRect = tooltip.getBoundingClientRect()
    const padding = 16
    
    // Account for navbar height (52px on mobile, 68px on desktop)
    const navbarHeight = window.innerWidth >= 768 ? 68 : 52
    // Account for sidebar width - check if expanded (280px) or collapsed (72px)
    // Sidebar is expanded when hovering, so we need to account for max width
    const sidebarCollapsedWidth = window.innerWidth >= 1024 ? 72 : 0
    const sidebarExpandedWidth = window.innerWidth >= 1024 ? 280 : 0
    
    // Detect if target is in sidebar (left edge is close to 0 or within sidebar bounds)
    const isInSidebar = rect.left < sidebarExpandedWidth + 20 // 20px tolerance
    
    // Use visual viewport if available (accounts for browser UI like address bar)
    const viewportWidth = window.visualViewport?.width || window.innerWidth
    const viewportHeight = window.visualViewport?.height || window.innerHeight
    
    // Calculate available space (viewport minus navbar and safe areas)
    // For sidebar elements, we need more space on the right
    const availableTop = navbarHeight + padding
    const availableBottom = padding
    const availableLeft = isInSidebar ? sidebarExpandedWidth + padding : sidebarCollapsedWidth + padding
    const availableRight = padding
    const availableWidth = viewportWidth - availableLeft - availableRight
    const availableHeight = viewportHeight - availableTop - availableBottom

    // Get actual dimensions, or use conservative estimates if not yet measured
    const tooltipWidth = tooltipRect.width > 0 ? tooltipRect.width : 320 // Default max-w-sm is ~384px
    const tooltipHeight = tooltipRect.height > 0 ? tooltipRect.height : 250 // Estimate based on typical content

    // For sidebar elements with 'right' placement, prefer 'bottom' or 'top' if not enough horizontal space
    // Try to find the best placement that keeps tooltip fully visible
    let placements: Array<'top' | 'bottom' | 'left' | 'right'>
    if (isInSidebar && preferredPlacement === 'right') {
      // Check if there's enough space to the right
      const spaceToRight = viewportWidth - rect.right - padding
      if (spaceToRight < tooltipWidth + padding) {
        // Not enough space to the right, prefer bottom/top
        placements = ['bottom', 'top', 'right', 'left']
      } else {
        placements = [preferredPlacement, 'bottom', 'top', 'left']
      }
    } else {
      placements = [
        preferredPlacement,
        preferredPlacement === 'bottom' ? 'top' : preferredPlacement === 'top' ? 'bottom' : preferredPlacement === 'right' ? 'left' : 'right',
        'bottom',
        'top',
        'right',
        'left',
      ]
    }

    let bestPosition: { top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' } | null = null

    for (const placement of placements) {
      let top = 0
      let left = 0

      switch (placement) {
        case 'bottom':
          top = rect.bottom + padding
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'top':
          top = rect.top - tooltipHeight - padding
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'right':
          left = rect.right + padding
          // For sidebar elements, ensure vertical position accounts for navbar
          const verticalCenter = rect.top + rect.height / 2
          top = Math.max(availableTop + tooltipHeight / 2, Math.min(verticalCenter, viewportHeight - availableBottom - tooltipHeight / 2)) - tooltipHeight / 2
          break
        case 'left':
          left = rect.left - tooltipWidth - padding
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          break
      }

      // Clamp to available viewport space (accounting for navbar and sidebar)
      const clampedLeft = Math.max(availableLeft, Math.min(left, viewportWidth - tooltipWidth - availableRight))
      const clampedTop = Math.max(availableTop, Math.min(top, viewportHeight - tooltipHeight - availableBottom))

      // Check if this placement keeps the tooltip fully visible
      const fitsHorizontally = clampedLeft >= availableLeft && clampedLeft + tooltipWidth <= viewportWidth - availableRight
      const fitsVertically = clampedTop >= availableTop && clampedTop + tooltipHeight <= viewportHeight - availableBottom

      if (fitsHorizontally && fitsVertically) {
        bestPosition = { top: clampedTop, left: clampedLeft, placement }
        break
      }
    }

    // If no perfect fit, use the best we can get (clamped to viewport)
    if (!bestPosition) {
      let top = 0
      let left = 0
      let placement = preferredPlacement

      switch (preferredPlacement) {
        case 'bottom':
          top = rect.bottom + padding
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          if (top + tooltipHeight > viewportHeight - availableBottom) {
            placement = 'top'
            top = Math.max(availableTop, rect.top - tooltipHeight - padding)
          }
          break
        case 'top':
          top = rect.top - tooltipHeight - padding
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          if (top < availableTop) {
            placement = 'bottom'
            top = Math.min(viewportHeight - tooltipHeight - availableBottom, rect.bottom + padding)
          }
          break
        case 'right':
          left = rect.right + padding
          // For sidebar elements, ensure vertical position accounts for navbar
          const verticalCenterFallback = rect.top + rect.height / 2
          top = Math.max(availableTop + tooltipHeight / 2, Math.min(verticalCenterFallback, viewportHeight - availableBottom - tooltipHeight / 2)) - tooltipHeight / 2
          if (left + tooltipWidth > viewportWidth - availableRight) {
            // Not enough space to the right, try bottom instead
            if (isInSidebar) {
              placement = 'bottom'
              top = Math.min(viewportHeight - tooltipHeight - availableBottom, rect.bottom + padding)
              left = rect.left + rect.width / 2 - tooltipWidth / 2
            } else {
              placement = 'left'
              left = Math.max(availableLeft, rect.left - tooltipWidth - padding)
            }
          }
          break
        case 'left':
          left = rect.left - tooltipWidth - padding
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          if (left < availableLeft) {
            placement = 'right'
            left = Math.min(viewportWidth - tooltipWidth - availableRight, rect.right + padding)
          }
          break
      }

      // Final aggressive clamping to ensure it never goes off-screen
      // Clamp horizontally (accounting for sidebar)
      left = Math.max(availableLeft, Math.min(left, viewportWidth - tooltipWidth - availableRight))
      // Clamp vertically (accounting for navbar)
      top = Math.max(availableTop, Math.min(top, viewportHeight - tooltipHeight - availableBottom))
      
      // If still doesn't fit, center it in available viewport space
      if (left < availableLeft || left + tooltipWidth > viewportWidth - availableRight) {
        left = Math.max(availableLeft, (viewportWidth - tooltipWidth) / 2)
      }
      if (top < availableTop || top + tooltipHeight > viewportHeight - availableBottom) {
        top = Math.max(availableTop, (viewportHeight - tooltipHeight) / 2)
      }

      bestPosition = { top, left, placement }
    }

    setTooltipPosition(bestPosition)
  }

  if (!isActive || !currentStep) return null

  const progress = ((currentStepIndex + 1) / steps.length) * 100
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  return (
    <>
      {/* No overlay - just highlight the target element */}

      {/* Highlight border around target */}
      {targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none border-2 border-[#2D3A1F] rounded-lg shadow-[0_0_0_4px_rgba(45,58,31,0.3)] transition-all duration-300"
          style={{
            left: `${targetRect.left - 4}px`,
            top: `${targetRect.top - 4}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
          }}
        />
      )}

      {/* Tooltip - Always render when we have a target, are waiting, or have a centered step */}
      {(targetRect || isWaiting || error || (isActive && currentStep) || (tooltipPosition && tooltipPosition.placement === 'center')) && (
        <div
          ref={tooltipRef}
          className={cn(
            'fixed z-[10000] bg-white rounded-lg shadow-xl p-6 max-w-sm transition-all duration-300 overflow-y-auto',
            // Show tooltip if we have a target, or if we're active and have a step (even if target not found yet), or if it's a centered step
            (targetRect || (isActive && currentStep && !isWaiting && !error) || (tooltipPosition && tooltipPosition.placement === 'center')) ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          style={{
            ...(tooltipPosition
              ? (() => {
                  // Account for navbar and sidebar when positioning
                  const navbarHeight = typeof window !== 'undefined' && window.innerWidth >= 768 ? 68 : 52
                  const viewportHeight = typeof window !== 'undefined' && window.visualViewport?.height ? window.visualViewport.height : (typeof window !== 'undefined' ? window.innerHeight : 0)
                  const viewportWidth = typeof window !== 'undefined' && window.visualViewport?.width ? window.visualViewport.width : (typeof window !== 'undefined' ? window.innerWidth : 0)
                  
                  // If placement is 'center', center the tooltip on the page
                  if (tooltipPosition.placement === 'center') {
                    return {
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      maxWidth: 'min(384px, calc(100vw - 32px))',
                      maxHeight: `calc(100vh - ${navbarHeight + 32}px)`,
                    }
                  }
                  
                  // Check if target is in sidebar for proper left boundary
                  const sidebarExpandedWidth = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 280 : 0
                  const sidebarCollapsedWidth = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 72 : 0
                  const isTargetInSidebar = targetRect && targetRect.left < sidebarExpandedWidth + 20
                  const minLeft = isTargetInSidebar ? sidebarExpandedWidth + 16 : sidebarCollapsedWidth + 16
                  
                  // For right/left placement, ensure top doesn't go above navbar
                  let finalTop = tooltipPosition.top
                  let finalTransform = tooltipPosition.placement === 'right' || tooltipPosition.placement === 'left' 
                    ? 'translateY(-50%)' 
                    : 'translateX(-50%)'
                  
                  // If using translateY(-50%), ensure the top position accounts for navbar
                  // Estimate tooltip height (typically ~250px for content)
                  const estimatedTooltipHeight = 250
                  if ((tooltipPosition.placement === 'right' || tooltipPosition.placement === 'left') && finalTop < navbarHeight + estimatedTooltipHeight / 2) {
                    finalTop = navbarHeight + estimatedTooltipHeight / 2
                  }
                  
                  return {
                    top: `${Math.max(navbarHeight + 16, Math.min(finalTop, viewportHeight - 16))}px`,
                    left: `${Math.max(minLeft, Math.min(tooltipPosition.left, viewportWidth - 16))}px`,
                    transform: finalTransform,
                    maxWidth: 'min(384px, calc(100vw - 32px))',
                    maxHeight: `calc(100vh - ${navbarHeight + 32}px)`,
                  }
                })()
              : targetRect
              ? (() => {
                  // Show tooltip immediately with a default position below the target
                  // Ensure it's visible on screen with aggressive clamping
                  const navbarHeight = typeof window !== 'undefined' && window.innerWidth >= 768 ? 68 : 52
                  const sidebarExpandedWidth = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 280 : 0
                  const sidebarCollapsedWidth = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 72 : 0
                  const viewportHeight = typeof window !== 'undefined' && window.visualViewport?.height ? window.visualViewport.height : (typeof window !== 'undefined' ? window.innerHeight : 0)
                  const viewportWidth = typeof window !== 'undefined' && window.visualViewport?.width ? window.visualViewport.width : (typeof window !== 'undefined' ? window.innerWidth : 0)
                  
                  // Check if target is in sidebar
                  const isTargetInSidebar = targetRect.left < sidebarExpandedWidth + 20
                  const minLeft = isTargetInSidebar ? sidebarExpandedWidth + 16 : sidebarCollapsedWidth + 16
                  
                  return {
                    top: `${Math.max(navbarHeight + 16, Math.min(targetRect.bottom + 16, viewportHeight - 250))}px`,
                    left: `${Math.max(minLeft, Math.min(Math.max(minLeft, targetRect.left + targetRect.width / 2), viewportWidth - 200))}px`,
                    transform: 'translateX(-50%)',
                    maxWidth: 'min(384px, calc(100vw - 32px))',
                    maxHeight: `calc(100vh - ${navbarHeight + 32}px)`,
                  }
                })()
              : (() => {
                  const navbarHeight = typeof window !== 'undefined' && window.innerWidth >= 768 ? 68 : 52
                  return {
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    maxWidth: 'min(384px, calc(100vw - 32px))',
                    maxHeight: `calc(100vh - ${navbarHeight + 32}px)`,
                  }
                })()),
          }}
        >
          {error ? (
            <div className="text-center">
              <p className="text-sm text-red-600 mb-4">{error}</p>
            </div>
          ) : isWaiting ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D3A1F] mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading step...</p>
            </div>
          ) : currentStep ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {currentStep.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {currentStep.content}
                  </p>
                </div>
                <button
                  onClick={stopTour}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close tour"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Progress indicator */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Step {currentStepIndex + 1} of {steps.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#2D3A1F] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={skipTour}
                    className="text-xs"
                  >
                    Skip Tour
                  </Button>
                  {!isFirstStep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={previousStep}
                      className="text-xs"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                </div>
                <Button
                  onClick={isLastStep ? stopTour : nextStep}
                  size="sm"
                  className="text-xs bg-[#2D3A1F] hover:bg-[#1F2A14] text-white"
                >
                  {isLastStep ? 'Finish' : 'Next'}
                  {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  )
}
