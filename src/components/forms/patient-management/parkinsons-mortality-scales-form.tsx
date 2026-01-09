'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  submitParkinsonsMortalityScales,
  updateParkinsonsMortalityScales
} from '@/actions/patient-management.action'
import { 
  parkinsonsMortalityScalesSchema, 
  type ParkinsonsMortalityScalesInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Upload } from 'lucide-react'

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
      hoehn_yahr_stage: initialData?.hoehn_yahr_stage || '',
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
      dementia: initialData?.dementia || '',
      falls_past_6_12_months: initialData?.falls_past_6_12_months || '',
      mds_updrs_part_iii_motor_score: convertNumber(initialData?.mds_updrs_part_iii_motor_score),
      risk_classification: initialData?.risk_classification || '',
      // Frailty
      weight_loss: convertNumber(initialData?.weight_loss),
      fatigue_frailty: convertNumber(initialData?.fatigue_frailty),
      physical_activity: convertNumber(initialData?.physical_activity),
      strength_gait_speed: convertNumber(initialData?.strength_gait_speed),
      comorbidities_assistance: convertNumber(initialData?.comorbidities_assistance),
      mds_pd_frailty_total_score: convertNumber(initialData?.mds_pd_frailty_total_score) || 0,
      // File upload
      scanned_mds_updrs_form_url: initialData?.scanned_mds_updrs_form_url || '',
    },
  })

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


  if (isCompleted && !initialData) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-emerald-900 mb-2">Form Completed</h3>
        <p className="text-emerald-700">This Parkinson's mortality scales form has been completed.</p>
      </div>
    )
  }

  // Helper to render number input field
  const renderNumberField = (fieldName: keyof ParkinsonsMortalityScalesInput, label: string) => {
    return (
      <div>
        <Label htmlFor={fieldName} className="text-base">{label}</Label>
        <Input
          id={fieldName}
          type="number"
          min={0}
          max={4}
          {...form.register(fieldName, { valueAsNumber: true })}
          className="mt-2 h-12"
        />
        {(form.formState.errors[fieldName] as any) && (
          <p className="text-sm text-red-500 mt-1">{(form.formState.errors[fieldName] as any)?.message}</p>
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

      if (isCompleted) {
        const result = await updateParkinsonsMortalityScales({
          management_id: managementId,
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
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">1. MDS–UPDRS Part I – Non-motor Experiences of Daily Living</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderNumberField('cognitive_impairment', 'Cognitive impairment')}
          {renderNumberField('hallucinations_psychosis', 'Hallucinations and psychosis')}
          {renderNumberField('depressed_mood', 'Depressed mood')}
          {renderNumberField('anxious_mood', 'Anxious mood')}
          {renderNumberField('apathy', 'Apathy')}
          {renderNumberField('dopaminergic_dysregulation', 'Dopaminergic dysregulation syndrome')}
          {renderNumberField('sleep_problems', 'Sleep problems')}
          {renderNumberField('daytime_sleepiness', 'Daytime sleepiness')}
          {renderNumberField('pain_sensory_complaints', 'Pain and sensory complaints')}
          {renderNumberField('urinary_problems', 'Urinary problems')}
          {renderNumberField('constipation', 'Constipation')}
          {renderNumberField('lightheadedness', 'Lightheadedness')}
          {renderNumberField('fatigue', 'Fatigue')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of Part I</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.partITotal}</p>
        </div>
      </div>

      {/* MDS-UPDRS Part II */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Part II – Motor Experiences of Daily Living</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderNumberField('speech_part2', 'Speech')}
          {renderNumberField('saliva_drooling', 'Saliva/drooling')}
          {renderNumberField('chewing_swallowing', 'Chewing/swallowing')}
          {renderNumberField('eating_tasks', 'Eating tasks')}
          {renderNumberField('dressing', 'Dressing')}
          {renderNumberField('hygiene', 'Hygiene')}
          {renderNumberField('handwriting', 'Handwriting')}
          {renderNumberField('hobbies_activities', 'Hobbies/activities')}
          {renderNumberField('turning_in_bed', 'Turning in bed')}
          {renderNumberField('tremor_daily_impact', 'Tremor (daily impact)')}
          {renderNumberField('getting_out_of_bed', 'Getting out of bed/car/chair')}
          {renderNumberField('walking_balance', 'Walking/balance')}
          {renderNumberField('freezing_of_gait_part2', 'Freezing of gait')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of Part II</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.partIITotal}</p>
        </div>
      </div>

      {/* MDS-UPDRS Part III */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Part III – Motor Examination</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderNumberField('speech_part3', 'Speech')}
          {renderNumberField('facial_expression', 'Facial expression')}
          {renderNumberField('rigidity_neck', 'Rigidity – neck')}
          {renderNumberField('rigidity_right_upper_limb', 'Rigidity – right upper limb')}
          {renderNumberField('rigidity_left_upper_limb', 'Rigidity – left upper limb')}
          {renderNumberField('rigidity_right_lower_limb', 'Rigidity – right lower limb')}
          {renderNumberField('rigidity_left_lower_limb', 'Rigidity – left lower limb')}
          {renderNumberField('finger_tapping_right', 'Finger tapping – right hand')}
          {renderNumberField('finger_tapping_left', 'Finger tapping – left hand')}
          {renderNumberField('hand_movements_right', 'Hand movements – right hand')}
          {renderNumberField('hand_movements_left', 'Hand movements – left hand')}
          {renderNumberField('pronation_supination_right', 'Pronation-supination – right hand')}
          {renderNumberField('pronation_supination_left', 'Pronation-supination – left hand')}
          {renderNumberField('toe_tapping_right', 'Toe tapping – right foot')}
          {renderNumberField('toe_tapping_left', 'Toe tapping – left foot')}
          {renderNumberField('leg_agility_right', 'Leg agility – right leg')}
          {renderNumberField('leg_agility_left', 'Leg agility – left leg')}
          {renderNumberField('arising_from_chair', 'Arising from chair')}
          {renderNumberField('gait', 'Gait')}
          {renderNumberField('freezing_of_gait_part3', 'Freezing of gait')}
          {renderNumberField('postural_stability', 'Postural stability')}
          {renderNumberField('posture', 'Posture')}
          {renderNumberField('global_bradykinesia', 'Global bradykinesia')}
          {renderNumberField('postural_tremor_right', 'Postural tremor – right hand')}
          {renderNumberField('postural_tremor_left', 'Postural tremor – left hand')}
          {renderNumberField('kinetic_tremor_right', 'Kinetic tremor – right hand')}
          {renderNumberField('kinetic_tremor_left', 'Kinetic tremor – left hand')}
          {renderNumberField('rest_tremor_right_upper', 'Rest tremor – right upper limb')}
          {renderNumberField('rest_tremor_left_upper', 'Rest tremor – left upper limb')}
          {renderNumberField('rest_tremor_right_lower', 'Rest tremor – right lower limb')}
          {renderNumberField('rest_tremor_left_lower', 'Rest tremor – left lower limb')}
          {renderNumberField('rest_tremor_lip_jaw', 'Rest tremor – lip/jaw')}
          {renderNumberField('constancy_of_rest_tremor', 'Constancy of rest tremor')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of Part III</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.partIIITotal}</p>
        </div>
      </div>

      {/* MDS-UPDRS Part IV */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Part IV – Motor Complications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderNumberField('time_with_dyskinesias', 'Time with dyskinesias')}
          {renderNumberField('impact_of_dyskinesias', 'Impact of dyskinesias')}
          {renderNumberField('time_in_off_state', 'Time in \'off\' state')}
          {renderNumberField('impact_of_fluctuations', 'Impact of fluctuations')}
          {renderNumberField('complexity_of_fluctuations', 'Complexity of fluctuations')}
          {renderNumberField('painful_off_state_dystonia', 'Painful off-state dystonia')}
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
            className="mt-2 h-12"
          />
        </div>
        <div>
          <Label htmlFor="mds_updrs_notes" className="text-base">Notes for MDS–UPDRS</Label>
          <Textarea
            id="mds_updrs_notes"
            {...form.register('mds_updrs_notes')}
            rows={3}
            className="mt-2 h-12 min-h-[80px]"
          />
        </div>
      </div>

      {/* 2. Hoehn & Yahr Staging */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">2. Hoehn & Yahr Staging</h2>
        <div>
          <Label htmlFor="hoehn_yahr_stage" className="text-base">Stage</Label>
          <Select
            value={hoehnYahrStage}
            onValueChange={(value) => {
              setHoehnYahrStage(value)
              form.setValue('hoehn_yahr_stage', value, { shouldValidate: true, shouldDirty: true })
            }}
          >
            <SelectTrigger className="mt-2 h-12">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Stage 1">Stage 1 - Unilateral involvement only</SelectItem>
              <SelectItem value="Stage 1.5">Stage 1.5 - Unilateral and axial involvement</SelectItem>
              <SelectItem value="Stage 2">Stage 2 - Bilateral involvement without impairment of balance</SelectItem>
              <SelectItem value="Stage 2.5">Stage 2.5 - Mild bilateral disease with recovery on pull test</SelectItem>
              <SelectItem value="Stage 3">Stage 3 - Mild to moderate bilateral disease; some postural instability</SelectItem>
              <SelectItem value="Stage 4">Stage 4 - Severe disability; still able to walk or stand unassisted</SelectItem>
              <SelectItem value="Stage 5">Stage 5 - Wheelchair-bound or bedridden unless aided</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Schwab & England */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">3. Schwab & England Activities of Daily Living</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderNumberField('dressing_score', 'Dressing')}
          {renderNumberField('feeding_score', 'Feeding')}
          {renderNumberField('ambulation_transfers_score', 'Ambulation/transfers')}
          {renderNumberField('household_tasks_score', 'Household tasks')}
          {renderNumberField('use_of_appliances_communication_score', 'Use of Appliances / communication')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of Schwab & England Activities of Daily Living</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.schwabTotal}</p>
        </div>
      </div>

      {/* 4. PDCMI */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">4. Parkinson's Disease Composite Mortality Index (PDCMI)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="age_years" className="text-base">Age (years)</Label>
            <Input
              id="age_years"
              type="number"
              {...form.register('age_years', { valueAsNumber: true })}
              className="mt-2 h-12"
            />
          </div>
          <div>
            <Label htmlFor="disease_duration_years" className="text-base">Disease duration (years)</Label>
            <Input
              id="disease_duration_years"
              type="number"
              {...form.register('disease_duration_years', { valueAsNumber: true })}
              className="mt-2 h-12"
            />
          </div>
          <div>
            <Label htmlFor="dementia" className="text-base">Dementia</Label>
            <Input
              id="dementia"
              {...form.register('dementia')}
              className="mt-2 h-12"
            />
          </div>
          <div>
            <Label htmlFor="falls_past_6_12_months" className="text-base">Falls (past 6–12 months)</Label>
            <Input
              id="falls_past_6_12_months"
              {...form.register('falls_past_6_12_months')}
              className="mt-2 h-12"
            />
          </div>
          <div>
            <Label htmlFor="mds_updrs_part_iii_motor_score" className="text-base">MDS-UPDRS Part III motor score</Label>
            <Input
              id="mds_updrs_part_iii_motor_score"
              type="number"
              {...form.register('mds_updrs_part_iii_motor_score', { valueAsNumber: true })}
              className="mt-2 h-12"
            />
          </div>
          <div>
            <Label htmlFor="risk_classification" className="text-base">Risk classification</Label>
            <Input
              id="risk_classification"
              {...form.register('risk_classification')}
              className="mt-2 h-12"
            />
          </div>
        </div>
      </div>

      {/* 5. Frailty Scale */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">5. MDS-PD Clinical Frailty Rating Scale</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderNumberField('weight_loss', 'Weight loss')}
          {renderNumberField('fatigue_frailty', 'Fatigue')}
          {renderNumberField('physical_activity', 'Physical activity')}
          {renderNumberField('strength_gait_speed', 'Strength & gait speed')}
          {renderNumberField('comorbidities_assistance', 'Comorbidities/assistance')}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-semibold">Total Score of MDS-PD Clinical Frailty</Label>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totals.frailtyTotal}</p>
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Upload Scanned MDS–UPDRS Form</h2>
        <div>
          <Label htmlFor="scanned_mds_updrs_form_url" className="text-base">File URL</Label>
          <Input
            id="scanned_mds_updrs_form_url"
            {...form.register('scanned_mds_updrs_form_url')}
            placeholder="Enter file URL or upload link"
            className="mt-2 h-12"
          />
          <p className="text-sm text-gray-500 mt-1">Note: File upload functionality can be integrated here</p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          type="submit"
          disabled={isSubmitting || isCompleted}
          className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isCompleted ? 'Updating...' : 'Submitting...'}
            </>
          ) : isCompleted ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Update Report
            </>
          ) : (
            'Submit Report'
          )}
        </Button>
      </div>
    </form>
  )
}
