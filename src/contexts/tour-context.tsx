'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface TourStep {
  id: string
  route?: string // Route to navigate to before showing this step
  selector: string // data-tour attribute value (empty string for centered steps)
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' // Preferred tooltip placement ('center' for centered steps without target)
  waitForSelector?: number // Max milliseconds to wait for element to appear
}

interface TourContextType {
  isActive: boolean
  currentStepIndex: number
  steps: TourStep[]
  startTour: () => void
  stopTour: () => void
  nextStep: () => void
  previousStep: () => void
  skipTour: () => void
  restartTour: () => void
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within TourProvider')
  }
  return context
}

interface TourProviderProps {
  children: React.ReactNode
  steps: TourStep[]
}

export function TourProvider({ children, steps: initialSteps }: TourProviderProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [steps] = useState<TourStep[]>(initialSteps)
  const router = useRouter()
  const pathname = usePathname()

  // Persist tour state in sessionStorage to survive route changes
  useEffect(() => {
    const savedState = sessionStorage.getItem('tour-state')
    if (savedState) {
      try {
        const { isActive: savedIsActive, currentStepIndex: savedIndex } = JSON.parse(savedState)
        if (savedIsActive && savedIndex < steps.length) {
          setIsActive(savedIsActive)
          setCurrentStepIndex(savedIndex)
        }
      } catch (e) {
        // Invalid state, clear it
        sessionStorage.removeItem('tour-state')
      }
    }
  }, [steps.length])

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (isActive) {
      sessionStorage.setItem('tour-state', JSON.stringify({ isActive, currentStepIndex }))
    } else {
      sessionStorage.removeItem('tour-state')
    }
  }, [isActive, currentStepIndex])

  const startTour = useCallback(() => {
    setCurrentStepIndex(0)
    setIsActive(true)
  }, [])

  const stopTour = useCallback(() => {
    setIsActive(false)
    setCurrentStepIndex(0)
    sessionStorage.removeItem('tour-state')
  }, [])

  const skipTour = useCallback(() => {
    stopTour()
  }, [stopTour])

  const restartTour = useCallback(() => {
    stopTour()
    // Small delay to ensure state is cleared
    setTimeout(() => {
      startTour()
    }, 100)
  }, [stopTour, startTour])

  const navigateToStepRoute = useCallback((step: TourStep) => {
    if (step.route && pathname !== step.route) {
      router.push(step.route)
    }
  }, [router, pathname])

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1
      const nextStep = steps[nextIndex]
      
      // Navigate if next step requires a different route
      if (nextStep.route && pathname !== nextStep.route) {
        navigateToStepRoute(nextStep)
      }
      
      setCurrentStepIndex(nextIndex)
    } else {
      // Tour complete
      stopTour()
    }
  }, [currentStepIndex, steps, pathname, navigateToStepRoute, stopTour])

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1
      const prevStep = steps[prevIndex]
      
      // Navigate if previous step requires a different route
      if (prevStep.route && pathname !== prevStep.route) {
        navigateToStepRoute(prevStep)
      }
      
      setCurrentStepIndex(prevIndex)
    }
  }, [currentStepIndex, steps, pathname, navigateToStepRoute])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopTour()
      } else if (e.key === 'ArrowRight' && !e.shiftKey) {
        e.preventDefault()
        nextStep()
      } else if (e.key === 'ArrowLeft' || (e.key === 'ArrowRight' && e.shiftKey)) {
        e.preventDefault()
        previousStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, nextStep, previousStep, stopTour])

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStepIndex,
        steps,
        startTour,
        stopTour,
        nextStep,
        previousStep,
        skipTour,
        restartTour,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}
