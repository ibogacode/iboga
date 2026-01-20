# Data Migration Plan for Existing Patient Intake Forms

## Overview
This document outlines the plan for migrating existing patient intake form data from the old address structure to the new global address format.

## Current Structure (Old)
- `address` (TEXT) - Single address field
- `city` (TEXT) - City name
- `state` (TEXT) - State/Province (with dropdown restrictions)
- `zip_code` (TEXT) - Zip/Postal code
- `country` (TEXT) - Country (with CHECK constraint: 'United States' or 'Canada')

## New Structure (Global)
- `address_line_1` (TEXT) - Required street address
- `address_line_2` (TEXT) - Optional (apartment, suite, etc.)
- `city` (TEXT) - City name (free text)
- `zip_code` (TEXT) - Zip/Postal code (free text, no format restrictions)
- `country` (TEXT) - Country name (free text, no restrictions)
- `state` (TEXT) - **DEPRECATED** (kept for backward compatibility, not used in forms)

## Migration Strategy

### Step 1: Data Migration (Automatic)
The migration `20250116000005_globalize_address_fields.sql` automatically:
- Creates `address_line_1` and `address_line_2` columns
- Migrates existing `address` → `address_line_1`
- Removes country constraints (allows any country name)
- Keeps `state` field for backward compatibility (won't be deleted)

### Step 2: Existing Data Handling

#### For Records with Existing Address Data:
- ✅ `address` → `address_line_1` (automatic migration)
- ✅ `city` → `city` (no change)
- ✅ `zip_code` → `zip_code` (no change)
- ✅ `country` → `country` (constraint removed, value preserved)
- ⚠️ `state` → kept in database but not used in new forms

#### For Records with NULL/Empty Address:
- `address_line_1` will be NULL (users will need to fill it)
- `address_line_2` will be NULL (optional)
- Other fields remain as-is

### Step 3: Backward Compatibility
- Old `address` field is **NOT deleted** (preserved for data integrity)
- Old `state` field is **NOT deleted** (preserved for data integrity)
- Both fields remain in database but are not used in new forms
- Existing queries that reference `address` will still work (data is duplicated in `address_line_1`)

## Verification Queries

### Check Migration Success:
```sql
-- Verify address_line_1 was populated from address
SELECT 
  COUNT(*) as total_records,
  COUNT(address_line_1) as migrated_addresses,
  COUNT(address) as old_addresses
FROM public.patient_intake_forms;

-- Check for any records where migration might have failed
SELECT id, address, address_line_1, city, country
FROM public.patient_intake_forms
WHERE address IS NOT NULL AND address_line_1 IS NULL;
```

### Check Country Data:
```sql
-- See all unique countries (should now accept any value)
SELECT country, COUNT(*) as count
FROM public.patient_intake_forms
GROUP BY country
ORDER BY count DESC;
```

## Rollback Plan (if needed)
If you need to rollback:
1. Data in `address` field is preserved (not deleted)
2. You can restore the old structure by:
   - Re-adding country constraints
   - Using `address` field instead of `address_line_1`
   - Re-enabling state dropdown

## Notes
- **No data loss**: All existing data is preserved
- **Gradual transition**: Old fields remain in database
- **Future cleanup**: After confirming everything works, you can optionally:
  - Drop the `state` column (if not needed)
  - Drop the old `address` column (if not needed)
  - But this is NOT recommended until you're 100% sure
