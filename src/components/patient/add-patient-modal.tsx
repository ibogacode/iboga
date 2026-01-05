'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import InitiateIntakeForm from '@/app/(dashboard)/owner/initiate-intake/initiate-intake-form'

interface AddPatientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddPatientModal({ open, onOpenChange, onSuccess }: AddPatientModalProps) {
  const [currentStep, setCurrentStep] = useState<'entry-mode' | 'details' | 'confirmation'>('entry-mode')
  const wasSuccessfulRef = useRef(false)

  function handleSuccess() {
    // Mark that the form was successfully submitted
    // This will be used to refresh data when the modal closes
    wasSuccessfulRef.current = true
  }

  function handleClose() {
    // If the form was successfully submitted, refresh data
    if (wasSuccessfulRef.current && onSuccess) {
      onSuccess()
    }
    // Reset form state when closing
    setCurrentStep('entry-mode')
    wasSuccessfulRef.current = false
    onOpenChange(false)
  }

  function handleStepChange(step: 'entry-mode' | 'details' | 'confirmation') {
    setCurrentStep(step)
    // Mark success when entering confirmation step (we'll assume success for now)
    if (step === 'confirmation') {
      wasSuccessfulRef.current = true
    }
  }

  function handleDialogOpenChange(open: boolean) {
    // Prevent closing when on confirmation step unless explicitly closed via handleClose
    if (!open && currentStep === 'confirmation') {
      // Don't close automatically, user must use close button or action buttons
      return
    }
    if (!open) {
      // Reset state when closing
      setCurrentStep('entry-mode')
      wasSuccessfulRef.current = false
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent 
        className="w-[95vw] sm:w-[90vw] md:max-w-5xl p-0 gap-0 bg-transparent border-none shadow-none overflow-visible max-h-[85vh] my-auto"
        showCloseButton={false}
        onInteractOutside={(e) => {
          // Prevent closing on outside click when on confirmation step
          if (currentStep === 'confirmation') {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing on escape when on confirmation step
          if (currentStep === 'confirmation') {
            e.preventDefault()
          }
        }}
      >
        <DialogTitle className="sr-only">Add Patient</DialogTitle>
        <div className="bg-white rounded-2xl shadow-[20px_20px_20px_0px_rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.1)] overflow-hidden max-h-[85vh] flex flex-col relative">
          {/* Custom close button that uses handleClose */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#F5F4F0] flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L9 9M1 9L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="overflow-y-auto flex-1 overscroll-contain">
            <InitiateIntakeForm 
              onSuccess={handleSuccess} 
              onClose={handleClose}
              onStepChange={handleStepChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

