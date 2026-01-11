'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  submitParkinsonsMortalityScales,
  updateParkinsonsMortalityScales,
  getCurrentStaffMemberName
} from '@/actions/patient-management.action'
import { 
  parkinsonsMortalityScalesSchema, 
  type ParkinsonsMortalityScalesInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Upload, Info } from 'lucide-react'
import { MultiFileUpload } from '@/components/forms/multi-file-upload'
import { uploadDocumentClient } from '@/lib/supabase/client-storage'

interface ParkinsonsMortalityScalesFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  initialData?: Partial<ParkinsonsMortalityScalesInput>
  isCompleted?: boolean
  onSuccess?: () => void
}

// Helper to convert DB value to number
const convertNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const num = typeof value === 'string' ? Number(value) : value
  return isNaN(num) ? undefined : num
}

export function ParkinsonsMortalityScalesForm({ 
  managementId, 
  patientFirstName,
  patientLastName,
  initialData, 
  isCompleted,
  onSuccess 
}: ParkinsonsMortalityScalesFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Check both prop and initialData for completion status
  const formIsCompleted = isCompleted || (initialData as any)?.is_completed === true
  const [hoehnYahrStage, setHoehnYahrStage] = useState<string>(initialData?.hoehn_yahr_stage || '')

  const form = useForm<ParkinsonsMortalityScalesInput>({
    resolver: zodResolver(parkinsonsMortalityScalesSchema) as any,
    mode: 'onChange',
    defaultValues: {
      management_id: managementId,
      patient_first_name: patientFirstName,
      patient_last_name: patientLastName,
      // Part I
      cognitive_impairment: convertNumber(initialData?.cognitive_impairment),
      hallucinations_psychosis: convertNumber(initialData?.hallucinations_psychosis),
      depressed_mood: convertNumber(initialData?.depressed_mood),
      anxious_mood: convertNumber(initialData?.anxious_mood),
      apathy: convertNumber(initialData?.apathy),
      dopaminergic_dysregulation: convertNumber(initialData?.dopaminergic_dysregulation),
      sleep_problems: convertNumber(initialData?.sleep_problems),
      daytime_sleepiness: convertNumber(initialData?.daytime_sleepiness),
      pain_sensory_complaints: convertNumber(initialData?.pain_sensory_complaints),
      urinary_problems: convertNumber(initialData?.urinary_problems),
      constipation: convertNumber(initialData?.constipation),
      lightheadedness: convertNumber(initialData?.lightheadedness),
      fatigue: convertNumber(initialData?.fatigue),
      part_i_total_score: convertNumber(initialData?.part_i_total_score) || 0,
      // Part II
      speech_part2: convertNumber(initialData?.speech_part2),
      saliva_drooling: convertNumber(initialData?.saliva_drooling),
      chewing_swallowing: convertNumber(initialData?.chewing_swallowing),
      eating_tasks: convertNumber(initialData?.eating_tasks),
      dressing: convertNumber(initialData?.dressing),
      hygiene: convertNumber(initialData?.hygiene),
      handwriting: convertNumber(initialData?.handwriting),
      hobbies_activities: convertNumber(initialData?.hobbies_activities),
      turning_in_bed: convertNumber(initialData?.turning_in_bed),
      tremor_daily_impact: convertNumber(initialData?.tremor_daily_impact),
      getting_out_of_bed: convertNumber(initialData?.getting_out_of_bed),
      walking_balance: convertNumber(initialData?.walking_balance),
      freezing_of_gait_part2: convertNumber(initialData?.freezing_of_gait_part2),
      part_ii_total_score: convertNumber(initialData?.part_ii_total_score) || 0,
      // Part III
      speech_part3: convertNumber(initialData?.speech_part3),
      facial_expression: convertNumber(initialData?.facial_expression),
      rigidity_neck: convertNumber(initialData?.rigidity_neck),
      rigidity_right_upper_limb: convertNumber(initialData?.rigidity_right_upper_limb),
      rigidity_left_upper_limb: convertNumber(initialData?.rigidity_left_upper_limb),
      rigidity_right_lower_limb: convertNumber(initialData?.rigidity_right_lower_limb),
      rigidity_left_lower_limb: convertNumber(initialData?.rigidity_left_lower_limb),
      finger_tapping_right: convertNumber(initialData?.finger_tapping_right),
      finger_tapping_left: convertNumber(initialData?.finger_tapping_left),
      hand_movements_right: convertNumber(initialData?.hand_movements_right),
      hand_movements_left: convertNumber(initialData?.hand_movements_left),
      pronation_supination_right: convertNumber(initialData?.pronation_supination_right),
      pronation_supination_left: convertNumber(initialData?.pronation_supination_left),
      toe_tapping_right: convertNumber(initialData?.toe_tapping_right),
      toe_tapping_left: convertNumber(initialData?.toe_tapping_left),
      leg_agility_right: convertNumber(initialData?.leg_agility_right),
      leg_agility_left: convertNumber(initialData?.leg_agility_left),
      arising_from_chair: convertNumber(initialData?.arising_from_chair),
      gait: convertNumber(initialData?.gait),
      freezing_of_gait_part3: convertNumber(initialData?.freezing_of_gait_part3),
      postural_stability: convertNumber(initialData?.postural_stability),
      posture: convertNumber(initialData?.posture),
      global_bradykinesia: convertNumber(initialData?.global_bradykinesia),
      postural_tremor_right: convertNumber(initialData?.postural_tremor_right),
      postural_tremor_left: convertNumber(initialData?.postural_tremor_left),
      kinetic_tremor_right: convertNumber(initialData?.kinetic_tremor_right),
      kinetic_tremor_left: convertNumber(initialData?.kinetic_tremor_left),
      rest_tremor_right_upper: convertNumber(initialData?.rest_tremor_right_upper),
      rest_tremor_left_upper: convertNumber(initialData?.rest_tremor_left_upper),
      rest_tremor_right_lower: convertNumber(initialData?.rest_tremor_right_lower),
      rest_tremor_left_lower: convertNumber(initialData?.rest_tremor_left_lower),
      rest_tremor_lip_jaw: convertNumber(initialData?.rest_tremor_lip_jaw),
      constancy_of_rest_tremor: convertNumber(initialData?.constancy_of_rest_tremor),
      part_iii_total_score: convertNumber(initialData?.part_iii_total_score) || 0,
      // Part IV
      time_with_dyskinesias: convertNumber(initialData?.time_with_dyskinesias),
      impact_of_dyskinesias: convertNumber(initialData?.impact_of_dyskinesias),
      time_in_off_state: convertNumber(initialData?.time_in_off_state),
      impact_of_fluctuations: convertNumber(initialData?.impact_of_fluctuations),
      complexity_of_fluctuations: convertNumber(initialData?.complexity_of_fluctuations),
      painful_off_state_dystonia: convertNumber(initialData?.painful_off_state_dystonia),
      part_iv_total_score: convertNumber(initialData?.part_iv_total_score) || 0,
      // Overall
      mds_updrs_total_score: convertNumber(initialData?.mds_updrs_total_score) || 0,
      administered_by: initialData?.administered_by || '',
      mds_updrs_notes: initialData?.mds_updrs_notes || '',
      // Hoehn & Yahr
      hoehn_yahr_stage: initialData?.hoehn_yahr_stage || null,
      // Schwab & England
      dressing_score: convertNumber(initialData?.dressing_score),
      feeding_score: convertNumber(initialData?.feeding_score),
      ambulation_transfers_score: convertNumber(initialData?.ambulation_transfers_score),
      household_tasks_score: convertNumber(initialData?.household_tasks_score),
      use_of_appliances_communication_score: convertNumber(initialData?.use_of_appliances_communication_score),
      schwab_england_total_score: convertNumber(initialData?.schwab_england_total_score) || 0,
      // PDCMI
      age_years: convertNumber(initialData?.age_years),
      disease_duration_years: convertNumber(initialData?.disease_duration_years),
      dementia: initialData?.dementia || null,
      falls_past_6_12_months: initialData?.falls_past_6_12_months || null,
      mds_updrs_part_iii_motor_score: convertNumber(initialData?.mds_updrs_part_iii_motor_score),
      risk_classification: initialData?.risk_classification || null,
      // Frailty
      weight_loss: convertNumber(initialData?.weight_loss),
      fatigue_frailty: convertNumber(initialData?.fatigue_frailty),
      physical_activity: convertNumber(initialData?.physical_activity),
      strength_gait_speed: convertNumber(initialData?.strength_gait_speed),
      comorbidities_assistance: convertNumber(initialData?.comorbidities_assistance),
      mds_pd_frailty_total_score: convertNumber(initialData?.mds_pd_frailty_total_score) || 0,
      // File upload
      scanned_mds_updrs_forms: initialData?.scanned_mds_updrs_forms || null,
      scanned_mds_updrs_form_url: initialData?.scanned_mds_updrs_form_url || '', // Keep for backward compatibility
    },
  })

  // Autofill staff member name for administered_by
  useEffect(() => {
    async function loadStaffMemberName() {
      if (!isCompleted && !form.getValues('administered_by')?.trim()) {
        try {
          const result = await getCurrentStaffMemberName({})
          if (result?.data?.success && result.data.data?.fullName) {
            form.setValue('administered_by', result.data.data.fullName, { shouldValidate: false, shouldDirty: false })
          }
        } catch (error) {
          console.error('Error loading staff member name:', error)
          // Silently fail - don't show error to user, just leave field empty
        }
      }
    }
    loadStaffMemberName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted])

  // Inject slider styles for MDS-UPDRS Part III motor score
  useEffect(() => {
    const styleId = 'mds-updrs-motor-score-slider-styles'
    if (document.getElementById(styleId)) return // Styles already injected

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* MDS-UPDRS Part III Motor Score Slider */
      .mds-updrs-motor-score-slider::-webkit-slider-thumb {
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(16, 185, 129);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        transition: all 0.2s ease;
      }
      .mds-updrs-motor-score-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
      }
      .mds-updrs-motor-score-slider::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(16, 185, 129);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        transition: all 0.2s ease;
      }
      .mds-updrs-motor-score-slider::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
      }
      .mds-updrs-motor-score-slider:disabled::-webkit-slider-thumb {
        background: rgb(156, 163, 175);
        cursor: not-allowed;
      }
      .mds-updrs-motor-score-slider:disabled::-moz-range-thumb {
        background: rgb(156, 163, 175);
        cursor: not-allowed;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  // Calculate totals function - pure function that doesn't mutate state
  const getNumValue = (val: any) => (typeof val === 'number' && !isNaN(val) && val !== null ? val : 0)
  
  const calculateTotals = (values: any) => {
    // Part I Total
    const partITotal = getNumValue(values.cognitive_impairment) +
      getNumValue(values.hallucinations_psychosis) + getNumValue(values.depressed_mood) +
      getNumValue(values.anxious_mood) + getNumValue(values.apathy) +
      getNumValue(values.dopaminergic_dysregulation) + getNumValue(values.sleep_problems) +
      getNumValue(values.daytime_sleepiness) + getNumValue(values.pain_sensory_complaints) +
      getNumValue(values.urinary_problems) + getNumValue(values.constipation) +
      getNumValue(values.lightheadedness) + getNumValue(values.fatigue)

    // Part II Total
    const partIITotal = getNumValue(values.speech_part2) + getNumValue(values.saliva_drooling) +
      getNumValue(values.chewing_swallowing) + getNumValue(values.eating_tasks) +
      getNumValue(values.dressing) + getNumValue(values.hygiene) +
      getNumValue(values.handwriting) + getNumValue(values.hobbies_activities) +
      getNumValue(values.turning_in_bed) + getNumValue(values.tremor_daily_impact) +
      getNumValue(values.getting_out_of_bed) + getNumValue(values.walking_balance) +
      getNumValue(values.freezing_of_gait_part2)

    // Part III Total
    const partIIITotal = getNumValue(values.speech_part3) + getNumValue(values.facial_expression) +
      getNumValue(values.rigidity_neck) + getNumValue(values.rigidity_right_upper_limb) +
      getNumValue(values.rigidity_left_upper_limb) + getNumValue(values.rigidity_right_lower_limb) +
      getNumValue(values.rigidity_left_lower_limb) + getNumValue(values.finger_tapping_right) +
      getNumValue(values.finger_tapping_left) + getNumValue(values.hand_movements_right) +
      getNumValue(values.hand_movements_left) + getNumValue(values.pronation_supination_right) +
      getNumValue(values.pronation_supination_left) + getNumValue(values.toe_tapping_right) +
      getNumValue(values.toe_tapping_left) + getNumValue(values.leg_agility_right) +
      getNumValue(values.leg_agility_left) + getNumValue(values.arising_from_chair) +
      getNumValue(values.gait) + getNumValue(values.freezing_of_gait_part3) +
      getNumValue(values.postural_stability) + getNumValue(values.posture) +
      getNumValue(values.global_bradykinesia) + getNumValue(values.postural_tremor_right) +
      getNumValue(values.postural_tremor_left) + getNumValue(values.kinetic_tremor_right) +
      getNumValue(values.kinetic_tremor_left) + getNumValue(values.rest_tremor_right_upper) +
      getNumValue(values.rest_tremor_left_upper) + getNumValue(values.rest_tremor_right_lower) +
      getNumValue(values.rest_tremor_left_lower) + getNumValue(values.rest_tremor_lip_jaw) +
      getNumValue(values.constancy_of_rest_tremor)

    // Part IV Total
    const partIVTotal = getNumValue(values.time_with_dyskinesias) +
      getNumValue(values.impact_of_dyskinesias) + getNumValue(values.time_in_off_state) +
      getNumValue(values.impact_of_fluctuations) + getNumValue(values.complexity_of_fluctuations) +
      getNumValue(values.painful_off_state_dystonia)

    // MDS-UPDRS Total
    const mdsTotal = partITotal + partIITotal + partIIITotal + partIVTotal

    // Schwab & England Total
    const schwabTotal = getNumValue(values.dressing_score) + getNumValue(values.feeding_score) +
      getNumValue(values.ambulation_transfers_score) + getNumValue(values.household_tasks_score) +
      getNumValue(values.use_of_appliances_communication_score)

    // Frailty Total
    const frailtyTotal = getNumValue(values.weight_loss) + getNumValue(values.fatigue_frailty) +
      getNumValue(values.physical_activity) + getNumValue(values.strength_gait_speed) +
      getNumValue(values.comorbidities_assistance)

    return {
      partITotal,
      partIITotal,
      partIIITotal,
      partIVTotal,
      mdsTotal,
      schwabTotal,
      frailtyTotal,
    }
  }

  // Calculate totals from current form values
  // With mode: 'onChange', registered inputs will trigger re-renders automatically
  const totals = calculateTotals(form.getValues())

  // Helper to check if a field has a value (for visual completion indicator)
  const isFieldFilled = (fieldName: keyof ParkinsonsMortalityScalesInput): boolean => {
    const value = form.watch(fieldName)
    if (value === null || value === undefined) return false
    if (typeof value === 'string' && value.trim() === '') return false
    if (typeof value === 'number') {
      // 0 is a valid value for number fields, so only check for NaN
      if (isNaN(value)) return false
      // For motor score, 0 might be default, so check if it was explicitly set
      // But for now, if it's a number (including 0), consider it filled
      return true
    }
    if (Array.isArray(value)) {
      // For file arrays, check if array has items
      return value.length > 0
    }
    return true
  }

  if (isCompleted && !initialData) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-emerald-900 mb-2">Form Completed</h3>
        <p className="text-emerald-700">This Parkinson's mortality scales form has been completed.</p>
      </div>
    )
  }

  // Helper to render number input field (for fields that aren't 0-4 scale)
  const renderNumberField = (fieldName: keyof ParkinsonsMortalityScalesInput, label: string) => {
    const isFilled = isFieldFilled(fieldName)
    return (
      <div>
        <Label htmlFor={fieldName} className="text-base">{label}</Label>
        <Input
          id={fieldName}
          type="number"
          min={0}
          max={4}
          {...form.register(fieldName, { valueAsNumber: true })}
          className={`mt-2 h-12 ${isCompleted ? 'bg-gray-50' : isFilled ? 'bg-emerald-50 border-emerald-200' : ''}`}
          disabled={isCompleted}
        />
        {(form.formState.errors[fieldName] as any) && (
          <p className="text-sm text-red-500 mt-1">{(form.formState.errors[fieldName] as any)?.message}</p>
        )}
      </div>
    )
  }

  // Helper to render radio button field (0-4 scale)
  const renderRadioField = (fieldName: keyof ParkinsonsMortalityScalesInput, label: string) => {
    const value = form.watch(fieldName)
    const stringValue = value !== null && value !== undefined ? String(value) : ''
    const hasError = !!(form.formState.errors[fieldName] as any)
    const isFilled = isFieldFilled(fieldName)
    
    return (
      <div className={`py-3 px-4 border-b border-gray-200 last:border-b-0 ${isCompleted ? 'bg-gray-50' : isFilled ? 'bg-emerald-50' : ''}`}>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor={fieldName} className="text-base font-normal flex-1 cursor-pointer">
            {label}
          </Label>
          <RadioGroup
            value={stringValue}
            onValueChange={(val) => {
              form.setValue(fieldName, val === '' ? undefined : Number(val), { shouldValidate: true })
            }}
            disabled={formIsCompleted}
            className="flex items-center gap-3 border border-gray-300 rounded-md px-3 py-2"
          >
            {[0, 1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center">
                <RadioGroupItem 
                  value={String(num)} 
                  id={`${fieldName}-${num}`}
                  disabled={formIsCompleted}
                />
                <Label htmlFor={`${fieldName}-${num}`} className="ml-1 text-sm font-normal cursor-pointer">
                  {num}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        {hasError && (
          <p className="text-sm text-red-500 mt-1 ml-0">{(form.formState.errors[fieldName] as any)?.message}</p>
        )}
      </div>
    )
  }

  // Helper to render text radio button field (for categorical options)
  const renderTextRadioField = (
    fieldName: keyof ParkinsonsMortalityScalesInput, 
    label: string, 
    options: string[]
  ) => {
    const value = form.watch(fieldName)
    const stringValue = value !== null && value !== undefined ? String(value) : ''
    const hasError = !!(form.formState.errors[fieldName] as any)
    const isFilled = isFieldFilled(fieldName)
    
    return (
      <div className={`py-3 px-4 border-b border-gray-200 last:border-b-0 ${isCompleted ? 'bg-gray-50' : isFilled ? 'bg-emerald-50' : ''}`}>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor={fieldName} className="text-base font-normal flex-1 cursor-pointer">
            {label}
          </Label>
          <RadioGroup
            value={stringValue}
            onValueChange={(val) => {
              form.setValue(fieldName, val === '' ? undefined : val, { shouldValidate: true })
            }}
            disabled={formIsCompleted}
            className="flex items-center gap-3 border border-gray-300 rounded-md px-3 py-2"
          >
            {options.map((option) => (
              <div key={option} className="flex items-center">
                <RadioGroupItem 
                  value={option} 
                  id={`${fieldName}-${option}`}
                  disabled={formIsCompleted}
                />
                <Label htmlFor={`${fieldName}-${option}`} className="ml-1 text-sm font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        {hasError && (
          <p className="text-sm text-red-500 mt-1 ml-0">{(form.formState.errors[fieldName] as any)?.message}</p>
        )}
      </div>
    )
  }

  // Update totals in form before submit
  async function onSubmit(data: ParkinsonsMortalityScalesInput) {
    setIsSubmitting(true)
    try {
      // Calculate and set totals before submitting
      const finalTotals = calculateTotals(data)
      const submitData = {
        ...data,
        part_i_total_score: finalTotals.partITotal,
        part_ii_total_score: finalTotals.partIITotal,
        part_iii_total_score: finalTotals.partIIITotal,
        part_iv_total_score: finalTotals.partIVTotal,
        mds_updrs_total_score: finalTotals.mdsTotal,
        schwab_england_total_score: finalTotals.schwabTotal,
        mds_pd_frailty_total_score: finalTotals.frailtyTotal,
      }

      if (formIsCompleted) {
        const result = await updateParkinsonsMortalityScales({
          ...submitData,
          is_completed: true,
        } as any)
        
        if (result?.data?.success) {
          toast.success('Parkinson\'s mortality scales updated successfully')
          onSuccess?.()
        } else {
          toast.error(result?.data?.error || 'Failed to update form')
        }
      } else {
        const result = await submitParkinsonsMortalityScales(submitData as any)
        if (result?.data?.success) {
          toast.success('Parkinson\'s mortality scales submitted successfully')
          onSuccess?.()
        } else {
          toast.error(result?.data?.error || 'Failed to submit form')
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('An error occurred while submitting the form')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
      {/* Patient Info */}
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-base">Patient Name</Label>
            <p className="text-sm font-medium text-gray-900 mt-2">
              {patientFirstName} {patientLastName}
            </p>
          </div>
        </div>
      </div>

      {/* 1. MDS-UPDRS Part I */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Part I – Non-motor Experiences of Daily Living</h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {renderRadioField('cognitive_impairment', 'Cognitive impairment')}
          {renderRadioField('hallucinations_psychosis', 'Hallucinations and psychosis')}
          {renderRadioField('depressed_mood', 'Depressed mood')}
          {renderRadioField('anxious_mood', 'Anxious mood')}
          {renderRadioField('apathy', 'Apathy')}
          {renderRadioField('dopaminergic_dysregulation', 'Dopaminergic dysregulation syndrome')}
          {renderRadioField('sleep_problems', 'Sleep problems')}
          {renderRadioField('daytime_sleepiness', 'Daytime sleepiness')}
          {renderRadioField('pain_sensory_complaints', 'Pain and sensory complaints')}
          {renderRadioField('urinary_problems', 'Urinary problems')}
          {renderRadioField('constipation', 'Constipation')}
          {renderRadioField('lightheadedness', 'Lightheadedness')}
          {renderRadioField('fatigue', 'Fatigue')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of Part I</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.partITotal}</p>
        </div>
      </div>

      {/* MDS-UPDRS Part II */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Part II – Motor Experiences of Daily Living</h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {renderRadioField('speech_part2', 'Speech')}
          {renderRadioField('saliva_drooling', 'Saliva/drooling')}
          {renderRadioField('chewing_swallowing', 'Chewing/swallowing')}
          {renderRadioField('eating_tasks', 'Eating tasks')}
          {renderRadioField('dressing', 'Dressing')}
          {renderRadioField('hygiene', 'Hygiene')}
          {renderRadioField('handwriting', 'Handwriting')}
          {renderRadioField('hobbies_activities', 'Hobbies/activities')}
          {renderRadioField('turning_in_bed', 'Turning in bed')}
          {renderRadioField('tremor_daily_impact', 'Tremor (daily impact)')}
          {renderRadioField('getting_out_of_bed', 'Getting out of bed/car/chair')}
          {renderRadioField('walking_balance', 'Walking/balance')}
          {renderRadioField('freezing_of_gait_part2', 'Freezing of gait')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of Part II</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.partIITotal}</p>
        </div>
      </div>

      {/* MDS-UPDRS Part III */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Part III – Motor Examination</h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {renderRadioField('speech_part3', 'Speech')}
          {renderRadioField('facial_expression', 'Facial expression')}
          {renderRadioField('rigidity_neck', 'Rigidity – neck')}
          {renderRadioField('rigidity_right_upper_limb', 'Rigidity – right upper limb')}
          {renderRadioField('rigidity_left_upper_limb', 'Rigidity – left upper limb')}
          {renderRadioField('rigidity_right_lower_limb', 'Rigidity – right lower limb')}
          {renderRadioField('rigidity_left_lower_limb', 'Rigidity – left lower limb')}
          {renderRadioField('finger_tapping_right', 'Finger tapping – right hand')}
          {renderRadioField('finger_tapping_left', 'Finger tapping – left hand')}
          {renderRadioField('hand_movements_right', 'Hand movements – right hand')}
          {renderRadioField('hand_movements_left', 'Hand movements – left hand')}
          {renderRadioField('pronation_supination_right', 'Pronation-supination – right hand')}
          {renderRadioField('pronation_supination_left', 'Pronation-supination – left hand')}
          {renderRadioField('toe_tapping_right', 'Toe tapping – right foot')}
          {renderRadioField('toe_tapping_left', 'Toe tapping – left foot')}
          {renderRadioField('leg_agility_right', 'Leg agility – right leg')}
          {renderRadioField('leg_agility_left', 'Leg agility – left leg')}
          {renderRadioField('arising_from_chair', 'Arising from chair')}
          {renderRadioField('gait', 'Gait')}
          {renderRadioField('freezing_of_gait_part3', 'Freezing of gait')}
          {renderRadioField('postural_stability', 'Postural stability')}
          {renderRadioField('posture', 'Posture')}
          {renderRadioField('global_bradykinesia', 'Global bradykinesia')}
          {renderRadioField('postural_tremor_right', 'Postural tremor – right hand')}
          {renderRadioField('postural_tremor_left', 'Postural tremor – left hand')}
          {renderRadioField('kinetic_tremor_right', 'Kinetic tremor – right hand')}
          {renderRadioField('kinetic_tremor_left', 'Kinetic tremor – left hand')}
          {renderRadioField('rest_tremor_right_upper', 'Rest tremor – right upper limb')}
          {renderRadioField('rest_tremor_left_upper', 'Rest tremor – left upper limb')}
          {renderRadioField('rest_tremor_right_lower', 'Rest tremor – right lower limb')}
          {renderRadioField('rest_tremor_left_lower', 'Rest tremor – left lower limb')}
          {renderRadioField('rest_tremor_lip_jaw', 'Rest tremor – lip/jaw')}
          {renderRadioField('constancy_of_rest_tremor', 'Constancy of rest tremor')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of Part III</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.partIIITotal}</p>
        </div>
      </div>

      {/* MDS-UPDRS Part IV */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Part IV – Motor Complications</h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {renderRadioField('time_with_dyskinesias', 'Time with dyskinesias')}
          {renderRadioField('impact_of_dyskinesias', 'Impact of dyskinesias')}
          {renderRadioField('time_in_off_state', 'Time in \'off\' state')}
          {renderRadioField('impact_of_fluctuations', 'Impact of fluctuations')}
          {renderRadioField('complexity_of_fluctuations', 'Complexity of fluctuations')}
          {renderRadioField('painful_off_state_dystonia', 'Painful off-state dystonia')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of Part IV</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.partIVTotal}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <Label className="text-base font-semibold">Overall Summary for MDS–UPDRS</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">Total Score (Parts 1–4): {totals.mdsTotal}</p>
        </div>
        <div>
          <Label htmlFor="administered_by" className="text-base">Administered By <span className="text-red-500">*</span></Label>
          <Input
            id="administered_by"
            {...form.register('administered_by')}
            placeholder="Auto-filled with your name"
            className={`mt-2 h-12 ${isCompleted ? 'bg-gray-50' : isFieldFilled('administered_by') ? 'bg-emerald-50 border-emerald-200' : ''}`}
            disabled={formIsCompleted}
          />
          <p className="text-xs text-gray-500 mt-1">
            Your name will be automatically filled in
          </p>
        </div>
        <div>
          <Label htmlFor="mds_updrs_notes" className="text-base">Notes for MDS–UPDRS</Label>
          <Textarea
            id="mds_updrs_notes"
            {...form.register('mds_updrs_notes')}
            rows={3}
            className={`mt-2 h-12 min-h-[80px] ${isCompleted ? 'bg-gray-50' : isFieldFilled('mds_updrs_notes') ? 'bg-emerald-50 border-emerald-200' : ''}`}
            disabled={formIsCompleted}
          />
        </div>
      </div>

      {/* 2. Hoehn & Yahr Staging */}
      <div className="space-y-4 md:space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">2. Hoehn & Yahr Staging</h2>
          <p className="text-sm text-gray-600 mt-1">
            The Hoehn & Yahr scale is a standardized system used to describe the progression of Parkinson's disease symptoms and functional disability.
          </p>
        </div>

        {/* Stages Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Functional Impact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Stage 1</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Unilateral involvement only (one side of the body)</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Minimal or no functional impairment; tremor, rigidity, or bradykinesia present on one side.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Stage 1.5</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Unilateral and axial involvement (neck or trunk affected)</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Slight impact on posture or axial muscles.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Stage 2</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Bilateral involvement without impairment of balance</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Early bilateral symptoms; patient still independent and balanced.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Stage 2.5</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Mild bilateral disease with recovery on pull test</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Slight postural instability, but patient can recover balance independently.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Stage 3</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Mild to moderate bilateral disease; some postural instability; physically independent</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Increased risk of falls; still able to live independently and perform ADLs (Activities of Daily Living).</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Stage 4</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Severe disability; still able to walk or stand unassisted</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Marked impairment; may need help with some activities; mobility limited but possible without full assistance.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Stage 5</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Wheelchair-bound or bedridden unless aided</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Fully dependent; unable to stand or walk without assistance.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Stage Selection */}
        <div className={`space-y-3 p-4 rounded-lg ${isCompleted ? 'bg-gray-50' : isFieldFilled('hoehn_yahr_stage') ? 'bg-emerald-50' : ''}`}>
          <Label htmlFor="hoehn_yahr_stage" className="text-base font-semibold">
            Select Patient's Current Stage <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={hoehnYahrStage || ''}
            onValueChange={(value) => {
              setHoehnYahrStage(value)
              form.setValue('hoehn_yahr_stage', (value || null) as 'Stage 1' | 'Stage 1.5' | 'Stage 2' | 'Stage 2.5' | 'Stage 3' | 'Stage 4' | 'Stage 5' | null, { shouldValidate: true, shouldDirty: true })
            }}
            disabled={formIsCompleted}
            className="space-y-2"
          >
            {[
              { value: 'Stage 1', label: 'Stage 1', desc: 'Unilateral involvement only' },
              { value: 'Stage 1.5', label: 'Stage 1.5', desc: 'Unilateral and axial involvement' },
              { value: 'Stage 2', label: 'Stage 2', desc: 'Bilateral involvement without impairment of balance' },
              { value: 'Stage 2.5', label: 'Stage 2.5', desc: 'Mild bilateral disease with recovery on pull test' },
              { value: 'Stage 3', label: 'Stage 3', desc: 'Mild to moderate bilateral disease; some postural instability' },
              { value: 'Stage 4', label: 'Stage 4', desc: 'Severe disability; still able to walk or stand unassisted' },
              { value: 'Stage 5', label: 'Stage 5', desc: 'Wheelchair-bound or bedridden unless aided' },
            ].map((stage) => (
              <div
                key={stage.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                  hoehnYahrStage === stage.value
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${isCompleted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => {
                  if (!isCompleted) {
                    setHoehnYahrStage(stage.value)
                    form.setValue('hoehn_yahr_stage', stage.value as 'Stage 1' | 'Stage 1.5' | 'Stage 2' | 'Stage 2.5' | 'Stage 3' | 'Stage 4' | 'Stage 5', { shouldValidate: true, shouldDirty: true })
                  }
                }}
              >
                <RadioGroupItem
                  value={stage.value}
                  id={`hoehn_yahr_${stage.value}`}
                  disabled={formIsCompleted}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`hoehn_yahr_${stage.value}`}
                    className={`text-sm font-semibold cursor-pointer ${
                      hoehnYahrStage === stage.value ? 'text-emerald-900' : 'text-gray-900'
                    }`}
                  >
                    {stage.label}
                  </Label>
                  <p className={`text-xs mt-0.5 ${
                    hoehnYahrStage === stage.value ? 'text-emerald-700' : 'text-gray-600'
                  }`}>
                    {stage.desc}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
          {form.formState.errors.hoehn_yahr_stage && (
            <p className="text-sm text-red-500 mt-1">
              {(form.formState.errors.hoehn_yahr_stage as any)?.message}
            </p>
          )}
        </div>
      </div>

      {/* 3. Schwab & England */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">3. Schwab & England Activities of Daily Living</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {renderRadioField('dressing_score', 'Dressing')}
          {renderRadioField('feeding_score', 'Feeding')}
          {renderRadioField('ambulation_transfers_score', 'Ambulation/transfers')}
          {renderRadioField('household_tasks_score', 'Household tasks')}
          {renderRadioField('use_of_appliances_communication_score', 'Use of Appliances / communication')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of Schwab & England Activities of Daily Living</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.schwabTotal}</p>
        </div>
      </div>

      {/* 4. PDCMI */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">4. Parkinson's Disease Composite Mortality Index (PDCMI)</h2>
        <p className="text-sm text-gray-600">Record variables:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="age_years" className="text-base">Age (years)</Label>
            <Input
              id="age_years"
              type="number"
              {...form.register('age_years', { valueAsNumber: true })}
              className={`mt-2 h-12 ${isCompleted ? 'bg-gray-50' : isFieldFilled('age_years') ? 'bg-emerald-50 border-emerald-200' : ''}`}
              disabled={formIsCompleted}
            />
          </div>
          <div>
            <Label htmlFor="disease_duration_years" className="text-base">Disease duration (years)</Label>
            <Input
              id="disease_duration_years"
              type="number"
              {...form.register('disease_duration_years', { valueAsNumber: true })}
              className={`mt-2 h-12 ${isCompleted ? 'bg-gray-50' : isFieldFilled('disease_duration_years') ? 'bg-emerald-50 border-emerald-200' : ''}`}
              disabled={formIsCompleted}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="mds_updrs_part_iii_motor_score" className="text-base">MDS-UPDRS Part III motor score</Label>
            {(() => {
              const motorScoreValue = form.watch('mds_updrs_part_iii_motor_score')
              const score = motorScoreValue !== null && motorScoreValue !== undefined ? Number(motorScoreValue) : 0
              const progressPercent = (score / 100) * 100
              const isFilled = isFieldFilled('mds_updrs_part_iii_motor_score')
              
              return (
                <div className={`mt-2 space-y-3 p-3 rounded-lg ${isCompleted ? 'bg-gray-50' : isFilled ? 'bg-emerald-50' : ''}`}>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm text-gray-500 font-medium">0</span>
                    <div className="flex items-baseline gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-2xl font-bold text-gray-900 min-w-[3.5rem] text-center">
                        {score}
                      </span>
                      <span className="text-sm text-gray-500">/ 100</span>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">100</span>
                  </div>
                  <div className="relative px-1">
                    <input
                      id="mds_updrs_part_iii_motor_score"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      {...form.register('mds_updrs_part_iii_motor_score', { 
                        valueAsNumber: true
                      })}
                      disabled={formIsCompleted}
                      className="mds-updrs-motor-score-slider w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgb(16, 185, 129) 0%, rgb(16, 185, 129) ${progressPercent}%, rgb(229, 231, 235) ${progressPercent}%, rgb(229, 231, 235) 100%)`,
                        opacity: isCompleted ? 0.5 : 1
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 px-1">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
              )
            })()}
            {(form.formState.errors.mds_updrs_part_iii_motor_score as any) && (
              <p className="text-sm text-red-500 mt-1">
                {(form.formState.errors.mds_updrs_part_iii_motor_score as any)?.message}
              </p>
            )}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {renderTextRadioField('dementia', 'Dementia', ['No', 'Possible', 'Confirmed'])}
          {renderTextRadioField('falls_past_6_12_months', 'Falls (past 6–12 months)', ['None', '1–2', '≥3 / recurrent'])}
          {renderTextRadioField('risk_classification', 'Risk classification', ['Low', 'Moderate', 'High'])}
        </div>
      </div>

      {/* 5. Frailty Scale */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">5. MDS-PD Clinical Frailty Rating Scale</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {renderRadioField('weight_loss', 'Weight loss')}
          {renderRadioField('fatigue_frailty', 'Fatigue')}
          {renderRadioField('physical_activity', 'Physical activity')}
          {renderRadioField('strength_gait_speed', 'Strength & gait speed')}
          {renderRadioField('comorbidities_assistance', 'Comorbidities/assistance')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of MDS-PD Clinical Frailty</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.frailtyTotal}</p>
        </div>
      </div>

      {/* File Upload - Only show if form is not completed */}
      {!formIsCompleted && (
        <div className="space-y-4 md:space-y-6">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Upload Scanned MDS–UPDRS Form</h2>
          <div>
            <MultiFileUpload
              label="Scanned MDS–UPDRS Form Documents"
              value={form.watch('scanned_mds_updrs_forms') || []}
              onChange={(files) => form.setValue('scanned_mds_updrs_forms', files)}
              onUpload={async (file) => {
                const result = await uploadDocumentClient('medical-history-documents', file, 'mds-updrs-forms')
                return { url: result.url, fileName: file.name }
              }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              maxSizeMB={10}
              maxFiles={10}
            />
            <p className="text-sm text-gray-500 mt-2">
              Upload scanned or digital copies of the completed MDS–UPDRS form. Multiple files are supported.
            </p>
          </div>
        </div>
      )}

      {/* Show uploaded files if form is completed */}
      {formIsCompleted && form.watch('scanned_mds_updrs_forms') && (form.watch('scanned_mds_updrs_forms') as any[]).length > 0 && (
        <div className="space-y-4 md:space-y-6">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Uploaded MDS–UPDRS Forms</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(form.watch('scanned_mds_updrs_forms') as any[]).map((file: any, index: number) => (
              <div
                key={index}
                className="relative border border-gray-200 rounded-lg overflow-hidden bg-white p-2"
              >
                <div className="text-xs text-gray-600 truncate" title={file.fileName}>
                  {file.fileName}
                </div>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:text-emerald-700 mt-1 block"
                >
                  View File
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button - Only show if form is not completed */}
      {!formIsCompleted && (
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </div>
      )}

      {/* Completion Message - Show if form is completed */}
      {formIsCompleted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-emerald-900">Form Completed</h3>
              <p className="text-sm text-emerald-700 mt-1">
                This Parkinson's mortality scales form has been submitted and completed.
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
