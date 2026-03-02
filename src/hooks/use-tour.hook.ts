import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

export type PatientProfileTab = 'overview' | 'details' | 'billing' | 'travel'

interface UseTourParams {
  storageKey: string
  autoStart?: boolean
  /** When provided, the tour can switch tabs before showing a step so content is visible */
  setActiveTab?: (tab: PatientProfileTab) => void
}

/** Extended options with internal _steps for onPrepareForStep callback */
export interface StartTourOptionsInternal extends StartTourOptions {
  _steps?: import('driver.js').DriveStep[]
}

export interface StartTourOptions {
  /** Return the tab that must be active for the step at this index (tour will switch before showing that step) */
  getRequiredTabForStep?: (stepIndex: number) => PatientProfileTab | null
  /** Called before showing a step (e.g. to switch tabs). Receives the step index and the step config so you can check element/tourMeta. */
  onPrepareForStep?: (stepIndex: number, step?: DriveStep) => void
}

interface UseTourResult {
  hasSeenTour: boolean
  isRunning: boolean
  startTour: (steps: DriveStep[], options?: StartTourOptions) => void
  resetTour: () => void
}

export function useTour({ storageKey, autoStart, setActiveTab }: UseTourParams): UseTourResult {
  const [hasSeenTour, setHasSeenTour] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const tourOptionsRef = useRef<StartTourOptionsInternal | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const value = window.localStorage.getItem(storageKey)
    setHasSeenTour(value === 'true')
  }, [storageKey])

  const driverInstance = useMemo(() => {
    const d = driver({
      allowClose: true,
      showProgress: true,
      animate: true,
      smoothScroll: true,
      overlayOpacity: 0.5,
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'driverjs-theme',
      onDestroyed: () => setIsRunning(false),
      onNextClick: (_element, _step, opts) => {
        const nextIndex = (opts.state?.activeIndex ?? 0) + 1
        const tourOpts = tourOptionsRef.current
        const nextStep = tourOpts?._steps?.[nextIndex]
        tourOpts?.onPrepareForStep?.(nextIndex, nextStep)
        const tab = tourOpts?.getRequiredTabForStep?.(nextIndex)
        if (tab && setActiveTab) {
          setActiveTab(tab)
          setTimeout(() => d.moveNext(), 300)
        } else {
          if (tourOpts?.onPrepareForStep) setTimeout(() => d.moveNext(), 280)
          else d.moveNext()
        }
      },
      onPrevClick: (_element, _step, opts) => {
        const prevIndex = (opts.state?.activeIndex ?? 0) - 1
        const tourOpts = tourOptionsRef.current
        const prevStep = tourOpts?._steps?.[prevIndex]
        tourOpts?.onPrepareForStep?.(prevIndex, prevStep)
        const tab = tourOpts?.getRequiredTabForStep?.(prevIndex)
        if (tab && setActiveTab) {
          setActiveTab(tab)
          setTimeout(() => d.movePrevious(), 300)
        } else {
          if (tourOpts?.onPrepareForStep) setTimeout(() => d.movePrevious(), 280)
          else d.movePrevious()
        }
      },
    })
    return d
  }, [setActiveTab])

  const markSeen = useCallback(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, 'true')
    setHasSeenTour(true)
  }, [storageKey])

  const startTour = useCallback(
    (steps: DriveStep[], options?: StartTourOptions) => {
      if (!steps.length) return
      // Only include steps whose target element exists (handles optional sections)
      const visibleSteps =
        typeof document !== 'undefined'
          ? steps.filter((step) => {
              if (typeof step.element !== 'string') return true
              try {
                return !!document.querySelector(step.element)
              } catch {
                return true
              }
            })
          : steps
      if (!visibleSteps.length) return
      tourOptionsRef.current = { ...options, _steps: visibleSteps }
      driverInstance.setSteps(visibleSteps)
      setIsRunning(true)
      driverInstance.drive()
      markSeen()
    },
    [driverInstance, markSeen]
  )

  const resetTour = useCallback(() => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(storageKey)
    setHasSeenTour(false)
  }, [storageKey])

  useEffect(() => {
    if (!autoStart || hasSeenTour || isRunning) return
    // Let the page render before attempting to start
  }, [autoStart, hasSeenTour, isRunning])

  return {
    hasSeenTour,
    isRunning,
    startTour,
    resetTour,
  }
}

