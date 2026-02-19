'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { getPatientProfile } from '@/actions/patient-profile.action'
import {
  getClinicalDirectorConsultFormByOnboarding,
  upsertClinicalDirectorConsultForm,
} from '@/actions/clinical-director-consult-form.action'
import {
  DIAGNOSED_CONDITIONS_OPTIONS,
  type ClinicalDirectorConsultFormData,
} from '@/actions/clinical-director-consult-form.types'

type FieldType = 'boolean' | 'long_text' | 'date' | 'time' | 'multi_select' | 'integer'

const FIELD_CONFIG: Array<{
  key: keyof Omit<ClinicalDirectorConsultFormData, 'id' | 'onboarding_id' | 'created_at' | 'updated_at'>
  label: string
  type: FieldType
}> = [
  { key: 'psychedelics_before', label: 'Have you used psychedelics before?', type: 'boolean' },
  { key: 'psychedelics_which', label: 'If yes, which psychedelics have you used?', type: 'long_text' },
  { key: 'supplements_regular', label: 'What supplements do you take regularly?', type: 'long_text' },
  { key: 'arrival_date', label: 'Arrival date', type: 'date' },
  { key: 'arrival_time', label: 'Arrival time', type: 'time' },
  { key: 'questions_concerns_prior_arrival', label: 'Do you have any questions or concerns prior to arrival?', type: 'long_text' },
  { key: 'dietary_restrictions_allergies', label: 'Do you have any dietary restrictions or allergies?', type: 'long_text' },
  { key: 'substance_use_caffeine_nicotine_alcohol', label: 'Do you consume caffeine, nicotine, alcohol, cannabis, or other substances?', type: 'long_text' },
  { key: 'substance_use_frequency_amount', label: 'If yes, what is the frequency and amount?', type: 'long_text' },
  { key: 'diagnosed_conditions', label: 'Have you been diagnosed with any of the following?', type: 'multi_select' },
  { key: 'substances_used_past', label: 'What substances have you used in the past?', type: 'long_text' },
  { key: 'substances_started_when', label: 'When did you start using substances?', type: 'long_text' },
  { key: 'substances_current', label: 'What substances are you currently using?', type: 'long_text' },
  { key: 'substances_current_frequency_amount', label: 'Frequency and amount', type: 'long_text' },
  { key: 'substances_current_last_use_date', label: 'Last use date', type: 'date' },
  { key: 'withdrawal_symptoms_before', label: 'Have you experienced withdrawal symptoms before?', type: 'boolean' },
  { key: 'previous_detox_rehab', label: 'Previous detox or rehab experiences?', type: 'boolean' },
  { key: 'previous_detox_rehab_times', label: 'If yes, how many times?', type: 'integer' },
]

export default function ClinicalDirectorConsultFormPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [patientName, setPatientName] = useState('')
  const [onboardingId, setOnboardingId] = useState<string | null>(null)
  const [consultScheduledAt, setConsultScheduledAt] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string | boolean | number>>({})
  const [diagnosedConditions, setDiagnosedConditions] = useState<string[]>([])

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
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
        const onboarding = profileData.onboarding?.onboarding as { id: string; first_name?: string; last_name?: string; consult_scheduled_at?: string | null } | undefined
        if (!onboarding?.id) {
          toast.error('Patient is not in onboarding stage')
          router.push(`/patient-pipeline/patient-profile/${id}`)
          return
        }
        setOnboardingId(onboarding.id)
        setPatientName(`${onboarding.first_name || ''} ${onboarding.last_name || ''}`.trim() || 'Patient')
        setConsultScheduledAt(onboarding.consult_scheduled_at ?? null)

        const formResult = await getClinicalDirectorConsultFormByOnboarding({ onboarding_id: onboarding.id })
        const initial: Record<string, string | boolean | number> = {}
        if (formResult?.data?.success && formResult.data.data) {
          const form = formResult.data.data
          FIELD_CONFIG.forEach(({ key, type }) => {
            const raw = form[key]
            if (type === 'boolean') initial[key] = raw === true
            else if (type === 'integer') initial[key] = typeof raw === 'number' ? raw : raw != null && raw !== '' ? Number(raw) : ''
            else initial[key] = (raw != null && raw !== '') ? String(raw) : ''
          })
          try {
            const dc = form.diagnosed_conditions
            setDiagnosedConditions(dc && typeof dc === 'string' ? (JSON.parse(dc) as string[]) : [])
          } catch {
            setDiagnosedConditions([])
          }
        } else {
          FIELD_CONFIG.forEach(({ key, type }) => {
            if (type === 'boolean') initial[key] = false
            else if (type === 'integer') initial[key] = ''
            else initial[key] = ''
          })
          setDiagnosedConditions([])
        }
        setFormValues(initial)
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [id, router])

  async function handleSave() {
    if (!onboardingId) return
    setIsSaving(true)
    try {
      const payload: Record<string, string | boolean | number | null> = {}
      FIELD_CONFIG.forEach(({ key, type }) => {
        const v = formValues[key]
        if (key === 'diagnosed_conditions') {
          payload[key] = diagnosedConditions.length ? JSON.stringify(diagnosedConditions) : null
          return
        }
        if (type === 'boolean') payload[key] = v === true ? true : v === false ? false : null
        else if (type === 'integer') {
          const n = Number(v)
          payload[key] = (v === '' || v == null || Number.isNaN(n) || n < 0) ? null : n
        }
        else payload[key] = (v != null && String(v).trim() !== '') ? String(v).trim() : null
      })
      const result = await upsertClinicalDirectorConsultForm({
        onboarding_id: onboardingId,
        ...payload,
      })
      if (result?.data?.success) {
        toast.success('Form saved')
      } else {
        toast.error(result?.data?.error ?? 'Failed to save')
      }
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  function toggleDiagnosedCondition(option: string) {
    setDiagnosedConditions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6E7A46]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-2 text-[#777777] hover:text-[#2B2820]"
          onClick={() => router.push(`/patient-pipeline/patient-profile/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Button>
      </div>

      <div className="rounded-2xl border border-[#D6D2C8] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6E7A46]/10">
            <Phone className="h-5 w-5 text-[#6E7A46]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A0A0A]">Clinical Director Consult Questionnaire</h1>
            <p className="text-sm text-[#777777]">{patientName}</p>
            {consultScheduledAt && (
              <p className="text-xs text-[#6E7A46] mt-0.5">
                Consult scheduled: {new Date(consultScheduledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-[#777777] mb-6">
          Pre-consult questions to complete during or after the call with the Clinical Director. Answers are saved to the patient profile.
        </p>

        <div className="space-y-6">
          {FIELD_CONFIG.map(({ key, label, type }) => {
            if (key === 'arrival_time') return null
            if (key === 'psychedelics_which' && formValues.psychedelics_before !== true) return null
            if (key === 'previous_detox_rehab_times' && formValues.previous_detox_rehab !== true) return null
            if (key === 'arrival_date') {
              return (
                <div key="arrival_date_time" className="space-y-2">
                  <div className="flex flex-wrap items-end gap-6">
                    <div className="space-y-2 flex-1 min-w-[180px]">
                      <Label htmlFor="arrival_date" className="text-sm font-medium text-[#2B2820]">
                        Arrival date
                      </Label>
                      <Input
                        id="arrival_date"
                        type="date"
                        value={(formValues.arrival_date as string) ?? ''}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, arrival_date: e.target.value }))}
                        className="rounded-[10px] border-[#D6D2C8] bg-white text-sm text-[#2B2820] w-full max-w-[200px]"
                      />
                    </div>
                    <div className="space-y-2 flex-1 min-w-[140px]">
                      <Label htmlFor="arrival_time" className="text-sm font-medium text-[#2B2820]">
                        Arrival time
                      </Label>
                      <Input
                        id="arrival_time"
                        type="time"
                        value={(formValues.arrival_time as string) ?? ''}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, arrival_time: e.target.value }))}
                        className="rounded-[10px] border-[#D6D2C8] bg-white text-sm text-[#2B2820] w-full max-w-[140px]"
                      />
                    </div>
                  </div>
                </div>
              )
            }
            return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="text-sm font-medium text-[#2B2820]">
                {label}
              </Label>
              {type === 'boolean' && (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={key}
                      checked={formValues[key] === true}
                      onChange={() => setFormValues((prev) => ({ ...prev, [key]: true }))}
                      className="rounded-full border-[#D6D2C8] text-[#6E7A46]"
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={key}
                      checked={formValues[key] === false}
                      onChange={() => {
                        setFormValues((prev) => {
                          const next = { ...prev, [key]: false }
                          if (key === 'psychedelics_before') return { ...next, psychedelics_which: '' }
                          if (key === 'previous_detox_rehab') return { ...next, previous_detox_rehab_times: '' }
                          return next
                        })
                      }}
                      className="rounded-full border-[#D6D2C8] text-[#6E7A46]"
                    />
                    No
                  </label>
                </div>
              )}
              {type === 'long_text' && (
                <Textarea
                  id={key}
                  value={(formValues[key] as string) ?? ''}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="—"
                  rows={3}
                  className="resize-y min-h-[80px] rounded-[10px] border-[#D6D2C8] bg-white text-sm text-[#2B2820]"
                />
              )}
              {type === 'date' && (
                <Input
                  id={key}
                  type="date"
                  value={(formValues[key] as string) ?? ''}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="rounded-[10px] border-[#D6D2C8] bg-white text-sm text-[#2B2820] max-w-[200px]"
                />
              )}
              {type === 'time' && (
                <Input
                  id={key}
                  type="time"
                  value={(formValues[key] as string) ?? ''}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="rounded-[10px] border-[#D6D2C8] bg-white text-sm text-[#2B2820] max-w-[140px]"
                />
              )}
              {type === 'integer' && (
                <Input
                  id={key}
                  type="number"
                  min={0}
                  value={formValues[key] === '' || formValues[key] == null ? '' : (typeof formValues[key] === 'number' ? formValues[key] : String(formValues[key]))}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '') setFormValues((prev) => ({ ...prev, [key]: '' }))
                    else {
                      const n = parseInt(v, 10)
                      if (!Number.isNaN(n) && n >= 0) setFormValues((prev) => ({ ...prev, [key]: n }))
                    }
                  }}
                  placeholder="—"
                  className="rounded-[10px] border-[#D6D2C8] bg-white text-sm text-[#2B2820] max-w-[120px]"
                />
              )}
              {type === 'multi_select' && key === 'diagnosed_conditions' && (
                <div className="space-y-2 rounded-[10px] border border-[#D6D2C8] bg-white p-3">
                  {DIAGNOSED_CONDITIONS_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={diagnosedConditions.includes(option)}
                        onCheckedChange={() => toggleDiagnosedCondition(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            )
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            className="rounded-full bg-[#6E7A46] px-6 hover:bg-[#5c6840] text-white"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
