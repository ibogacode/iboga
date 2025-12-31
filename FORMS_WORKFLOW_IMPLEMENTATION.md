# Complete Forms Workflow Implementation

## Summary

This implementation provides a complete, production-ready forms workflow with:
- Draft forms with nullable fields
- Database-enforced validation when forms are activated
- Race-safe duplicate prevention using `dedupe_key` generated column
- Proper security with SECURITY DEFINER functions
- Frontend validation using database functions

## SQL Migration

**File:** `supabase/migrations/20250104000006_complete_forms_workflow.sql`

This single migration file contains:
1. Makes all required fields nullable for draft forms
2. Creates `form_defaults` table with RLS policies
3. Adds `dedupe_key` generated column for race-safe duplicate prevention
4. Adds unique constraints using `dedupe_key` + `intake_form_id` (handles NULLs with COALESCE)
5. Adds CHECK constraints to enforce required fields when `is_activated = true`
6. Creates trigger function with proper security (`SET search_path`)
7. Creates validation helper functions (admin fields only for pre-activation checks)

**Key Features:**
- `dedupe_key`: Generated column that uses `patient_id` when available, else `email`
- Unique constraint handles both `patient_id` and `email` cases seamlessly
- CHECK constraints use `IS NOT TRUE` and `btrim()` for proper validation
- Trigger uses `ON CONFLICT ON CONSTRAINT` for race-safe inserts

**To apply:** Run this file in Supabase SQL editor.

## Frontend Code Changes

### 1. `src/actions/patient-profile.action.ts`

**Changes:**
- Updated `activateServiceAgreement` to use database function `check_service_agreement_admin_fields_complete`
- Updated `activateIbogaineConsent` to use database function `check_ibogaine_consent_admin_fields_complete`
- Both functions now validate empty strings (not just nulls) before activation

**Key updates:**
```typescript
// Before: Manual field checking
if (requiredFields.some(field => field === null || field === undefined || field === '')) {
  return { success: false, error: '...' }
}

// After: Database function validation
const { data: isValid, error: checkError } = await adminClient
  .rpc('check_service_agreement_admin_fields_complete', {
    form_id: parsedInput.formId
  })
```

### 2. `src/actions/service-agreement.action.ts`

**Changes:**
- Updated `submitServiceAgreement` to check for existing activated forms
- If activated form exists, updates it instead of creating duplicate
- If no form exists or form is draft, creates new form
- Handles both patient and admin/owner submissions

**Key updates:**
- Added check for existing form before insert
- Uses UPDATE when form exists and is activated
- Uses INSERT when form doesn't exist or is draft

### 3. `src/actions/ibogaine-consent.action.ts`

**Changes:**
- Updated `submitIbogaineConsentForm` to check for existing activated forms
- If activated form exists, updates patient consent fields only
- If no form exists, creates new form
- Preserves admin fields when updating

**Key updates:**
- Added check for existing form before insert
- Uses UPDATE when form exists and is activated (updates only patient fields)
- Uses INSERT when form doesn't exist

## Database Features

### Unique Constraints
- `service_agreements`: Unique by `(dedupe_key, COALESCE(intake_form_id, '00000000-0000-0000-0000-000000000000'))`
  - `dedupe_key` is generated: `'pid:' || patient_id` when patient_id exists, else `'email:' || lower(patient_email)`
  - Handles both patient_id and email cases in a single constraint
  - Uses COALESCE to normalize NULL intake_form_id values
- `ibogaine_consent_forms`: Same approach as service_agreements

### CHECK Constraints
- `service_agreements_activated_fields_check`: Enforces all admin AND patient signature fields when `is_activated = true`
  - Uses `IS NOT TRUE` instead of `= false` for better NULL handling
  - Uses `btrim()` instead of `TRIM()` for PostgreSQL compatibility
  - Requires: admin fields (fees, payment, provider signature) AND patient signature fields
- `ibogaine_consent_forms_activated_fields_check`: Enforces all admin AND patient signature fields when `is_activated = true`
  - Requires: treatment_date, facilitator_doctor_name, date_of_birth, address, AND signature fields

### Security
- Trigger function uses `SECURITY DEFINER` with `SET search_path = public, pg_temp`
- Only `service_role` has execute permission on trigger function
- Validation functions use `SECURITY DEFINER` with proper search_path
- `authenticated` users can call validation functions

## Workflow

1. **Medical History Submitted** → Trigger creates draft forms (`is_activated = false`)
2. **Admin Fills Fields** → Admin edits forms via `/admin/service-agreement/[id]/edit` or `/admin/ibogaine-consent/[id]/edit`
3. **Admin Activates** → Validation runs, CHECK constraint enforces required fields
4. **Patient Completes** → Patient fills their fields, form is updated (not duplicated)

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Submit medical history form → Verify draft forms are created
- [ ] Try to activate form with missing fields → Should fail with clear error
- [ ] Fill all admin fields → Should activate successfully
- [ ] Patient submits form → Should update existing form, not create duplicate
- [ ] Try to create duplicate form → Should be prevented by unique constraints
- [ ] Verify CHECK constraints prevent activation with empty strings

## Notes

- All previous migration files (20250104000004, 20250104000005) can be skipped if running this consolidated migration
- The migration is idempotent (can be run multiple times safely)
- TypeScript types may need regeneration after migration: `npx supabase gen types typescript --local > src/types/supabase.ts`

