'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Send, Save, Loader2, FlaskConical, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useUser } from '@/hooks/use-user.hook'
import { getPatientProfile } from '@/actions/patient-profile.action'
import {
  createTaperingSchedule,
  getTaperingScheduleByOnboarding,
  updateTaperingSchedule,
  sendTaperingScheduleToClient,
  deleteTaperingSchedule,
} from '@/actions/tapering-schedule.action'
import { getProgramDaysForOnboarding } from '@/actions/treatment-scheduling.action'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ScheduleDay {
  day: number
  dose: string
  notes: string
  label?: string // Optional custom label like "Day Before Ibogaine"
}

interface TaperingScheduleData {
  id: string
  status: 'draft' | 'sent' | 'acknowledged'
  starting_dose: string
  total_days: number
  schedule_days: ScheduleDay[]
  additional_notes?: string
  created_at: string
  sent_at?: string
}

export default function TaperingSchedulePage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useUser()
  const id = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSendConfirm, setShowSendConfirm] = useState(false)

  const [patientName, setPatientName] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [onboardingId, setOnboardingId] = useState<string | null>(null)
  const [existingSchedule, setExistingSchedule] = useState<TaperingScheduleData | null>(null)

  // Form state
  const [startingDose, setStartingDose] = useState('')
  const [totalDays, setTotalDays] = useState(14) // Default from service agreement
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([])
  const [additionalNotes, setAdditionalNotes] = useState('')

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'manager'
  const isReadOnly = existingSchedule?.status === 'sent' || existingSchedule?.status === 'acknowledged'

  // Generate default schedule days based on total days
  function generateDefaultScheduleDays(days: number): ScheduleDay[] {
    return Array.from({ length: days }, (_, i) => ({
      day: i + 1, // Start from Day 1, Day 2, ... Day N
      dose: '',
      notes: '',
      label: i === 0 ? 'Day Before Ibogaine' : '', // Day 1 gets default label
    }))
  }

  // Load patient and schedule data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        // Get patient profile to find onboarding ID
        const profileResult = await getPatientProfile({
          patientId: id,
          partialFormId: id,
          intakeFormId: id,
        })

        if (!profileResult?.data?.success || !profileResult.data.data) {
          toast.error('Failed to load patient profile')
          router.push(`/patient-pipeline/patient-profile/${id}`)
          return
        }

        const profileData = profileResult.data.data
        const onboarding = profileData.onboarding?.onboarding

        if (!onboarding?.id) {
          toast.error('Patient is not in onboarding stage')
          router.push(`/patient-pipeline/patient-profile/${id}`)
          return
        }

        setOnboardingId(onboarding.id)
        setPatientName(`${onboarding.first_name || ''} ${onboarding.last_name || ''}`.trim() || 'Patient')
        setPatientEmail(onboarding.email || '')

        // Check for existing schedule
        const scheduleResult = await getTaperingScheduleByOnboarding({ onboarding_id: onboarding.id })

        if (scheduleResult?.data?.success && scheduleResult.data.data) {
          const schedule = scheduleResult.data.data as TaperingScheduleData
          setExistingSchedule(schedule)
          setStartingDose(schedule.starting_dose)
          setTotalDays(schedule.total_days)
          setScheduleDays(schedule.schedule_days as ScheduleDay[])
          setAdditionalNotes(schedule.additional_notes || '')
        } else {
          // Fetch number of days from service agreement
          const programDaysResult = await getProgramDaysForOnboarding({ onboarding_id: onboarding.id })
          const defaultDays = programDaysResult?.data?.success && programDaysResult.data.data?.number_of_days
            ? programDaysResult.data.data.number_of_days
            : 14 // Default fallback
          
          setTotalDays(defaultDays)
          setScheduleDays(generateDefaultScheduleDays(defaultDays))
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id, router])

  // Update schedule days when total days changes
  function handleTotalDaysChange(newTotal: number) {
    if (newTotal < 1 || newTotal > 30) return
    setTotalDays(newTotal)

    // Adjust schedule days array
    const currentDays = [...scheduleDays]
    if (newTotal > currentDays.length) {
      // Add more days at the end (Day 1, 2, ... N)
      const additionalDays = Array.from({ length: newTotal - currentDays.length }, (_, i) => ({
        day: currentDays.length + i + 1,
        dose: '',
        notes: '',
        label: '',
      }))
      setScheduleDays([...currentDays, ...additionalDays])
    } else {
      // Remove days from the end
      const trimmed = currentDays.slice(0, newTotal)
      setScheduleDays(trimmed)
    }
  }

  // Update a specific day's data
  function updateScheduleDay(index: number, field: 'dose' | 'notes' | 'label', value: string) {
    const updated = [...scheduleDays]
    updated[index] = { ...updated[index], [field]: value }
    setScheduleDays(updated)
  }

  // Save schedule (create or update)
  async function handleSave() {
    if (!onboardingId) return

    // Check if at least one day has content (dose or notes)
    const hasAtLeastOneEntry = scheduleDays.some(d => d.dose.trim() || d.notes.trim())
    if (!hasAtLeastOneEntry) {
      toast.error('Please enter dose or notes for at least one day')
      return
    }

    setIsSaving(true)
    try {
      if (existingSchedule) {
        // Update existing schedule
        const result = await updateTaperingSchedule({
          id: existingSchedule.id,
          starting_dose: startingDose,
          total_days: totalDays,
          schedule_days: scheduleDays.map(d => ({
            day: d.day,
            dose: d.dose || '',
            notes: d.notes || '',
            label: d.label || '',
          })),
          additional_notes: additionalNotes,
        })

        if (result?.data?.success) {
          toast.success('Tapering schedule saved successfully')
          // Reload schedule
          const reloadResult = await getTaperingScheduleByOnboarding({ onboarding_id: onboardingId })
          if (reloadResult?.data?.success && reloadResult.data.data) {
            setExistingSchedule(reloadResult.data.data as TaperingScheduleData)
          }
        } else {
          toast.error(result?.data?.error || 'Failed to save schedule')
        }
      } else {
        // Create new schedule
        const result = await createTaperingSchedule({
          onboarding_id: onboardingId,
          starting_dose: startingDose,
          total_days: totalDays,
          schedule_days: scheduleDays.map(d => ({
            day: d.day,
            dose: d.dose || '',
            notes: d.notes || '',
            label: d.label || '',
          })),
          additional_notes: additionalNotes,
        })

        if (result?.data?.success) {
          toast.success('Tapering schedule created successfully')
          // Reload schedule
          const reloadResult = await getTaperingScheduleByOnboarding({ onboarding_id: onboardingId })
          if (reloadResult?.data?.success && reloadResult.data.data) {
            setExistingSchedule(reloadResult.data.data as TaperingScheduleData)
          }
        } else {
          toast.error(result?.data?.error || 'Failed to create schedule')
        }
      }
    } catch (error) {
      console.error('Error saving schedule:', error)
      toast.error('Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  // Send schedule to client
  async function handleSend() {
    if (!existingSchedule) return

    setIsSending(true)
    try {
      const result = await sendTaperingScheduleToClient({ id: existingSchedule.id })

      if (result?.data?.success) {
        toast.success(result.data.data?.message || 'Tapering schedule sent to patient')
        setShowSendConfirm(false)
        // Reload schedule to update status
        if (onboardingId) {
          const reloadResult = await getTaperingScheduleByOnboarding({ onboarding_id: onboardingId })
          if (reloadResult?.data?.success && reloadResult.data.data) {
            setExistingSchedule(reloadResult.data.data as TaperingScheduleData)
          }
        }
      } else {
        toast.error(result?.data?.error || 'Failed to send schedule')
      }
    } catch (error) {
      console.error('Error sending schedule:', error)
      toast.error('Failed to send schedule')
    } finally {
      setIsSending(false)
    }
  }

  // Delete schedule
  async function handleDelete() {
    if (!existingSchedule) return

    setIsDeleting(true)
    try {
      const result = await deleteTaperingSchedule({ id: existingSchedule.id })

      if (result?.data?.success) {
        toast.success('Tapering schedule deleted')
        setShowDeleteConfirm(false)
        router.push(`/patient-pipeline/patient-profile/${id}`)
      } else {
        toast.error(result?.data?.error || 'Failed to delete schedule')
      }
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast.error('Failed to delete schedule')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#6E7A46]" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-700">You do not have permission to access this page</p>
        <Button onClick={() => router.back()} variant="outline">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/patient-pipeline/patient-profile/${id}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-[#6E7A46]" />
              Tapering Schedule
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {patientName} {patientEmail && `(${patientEmail})`}
            </p>
          </div>

          {/* Status badge */}
          {existingSchedule && (
            <div className="flex items-center gap-2">
              {existingSchedule.status === 'sent' || existingSchedule.status === 'acknowledged' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-[#DEF8EE] text-[#10B981]">
                  <CheckCircle2 className="h-4 w-4" />
                  Sent to Patient
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-yellow-100 text-yellow-700">
                  Draft
                </span>
              )}
            </div>
          )}
        </div>

        {/* Main form */}
        <div className="bg-white rounded-2xl border border-[#D6D2C8] p-6 space-y-6">
          {/* Schedule info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startingDose">Starting Dose <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input
                id="startingDose"
                placeholder="e.g., 50 mg daily"
                value={startingDose}
                onChange={(e) => setStartingDose(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalDays">Total Days</Label>
              <Input
                id="totalDays"
                type="number"
                min={1}
                max={30}
                value={totalDays}
                onChange={(e) => handleTotalDaysChange(parseInt(e.target.value) || 7)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Schedule days */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Daily Schedule</Label>
              <span className="text-sm text-gray-500">{totalDays} days total</span>
            </div>

            <div className="space-y-3">
              {scheduleDays.map((day, index) => (
                <div
                  key={day.day}
                  className="p-4 bg-gray-50 rounded-xl space-y-3"
                >
                  {/* Day header row */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 px-4 bg-[#6E7A46] text-white rounded-lg font-semibold whitespace-nowrap">
                      Day {day.day}
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder={day.day === 1 ? "e.g., Day Before Ibogaine" : "Custom label (optional)"}
                        value={day.label || ''}
                        onChange={(e) => updateScheduleDay(index, 'label', e.target.value)}
                        disabled={isReadOnly}
                        className="bg-white text-sm"
                      />
                    </div>
                  </div>
                  {/* Dose and Notes row */}
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Dose <span className="text-gray-400">(optional)</span></Label>
                      <Input
                        placeholder={day.day === 1 ? "e.g., None" : "e.g., 25 mg or Hold"}
                        value={day.dose}
                        onChange={(e) => updateScheduleDay(index, 'dose', e.target.value)}
                        disabled={isReadOnly}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Notes <span className="text-gray-400">(supports multiple lines)</span></Label>
                      <Textarea
                        placeholder={"Enter notes, each line will appear as a bullet point\n• BP should be stable\n• Ideal target: systolic <150"}
                        value={day.notes}
                        onChange={(e) => updateScheduleDay(index, 'notes', e.target.value)}
                        disabled={isReadOnly}
                        className="bg-white min-h-[60px]"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional notes */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes (optional)</Label>
            <Textarea
              id="additionalNotes"
              placeholder="Any additional instructions or notes for the patient..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              disabled={isReadOnly}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              {existingSchedule && existingSchedule.status === 'draft' && (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/patient-pipeline/patient-profile/${id}`)}
              >
                Cancel
              </Button>

              {!isReadOnly && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Draft
                  </Button>

                  {existingSchedule && (
                    <Button
                      onClick={() => setShowSendConfirm(true)}
                      disabled={isSending}
                      className="bg-[#6E7A46] hover:bg-[#5c6840] text-white"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Send to Patient
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sample schedule hint */}
        {!existingSchedule && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="font-medium text-blue-900 mb-2">Sample Schedule Format</h3>
            <p className="text-sm text-blue-700 mb-2">
              A typical 7-day blood pressure medication taper might look like:
            </p>
            <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
              <li>Day 7: 37.5 mg - Begin gradual down-titration</li>
              <li>Day 6: 25 mg</li>
              <li>Day 5: 25 mg - Hold steady to assess BP stability</li>
              <li>Day 4: 12.5 mg</li>
              <li>Day 3: 12.5 mg - Maintain hydration</li>
              <li>Day 2: Hold (no medication) - Monitor BP AM/PM</li>
              <li>Day 1: None - BP should be stable without medication</li>
            </ul>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tapering Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tapering schedule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send confirmation dialog */}
      <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Tapering Schedule</DialogTitle>
            <DialogDescription>
              This will send the tapering schedule to <strong>{patientName}</strong> at <strong>{patientEmail}</strong>.
              <br /><br />
              Once sent, the schedule cannot be edited. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="bg-[#6E7A46] hover:bg-[#5c6840] text-white"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send to Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
