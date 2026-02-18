/**
 * Program brochure PDF URLs (by program type). Used in confirmation emails and thank-you page.
 * ?download forces browser to download instead of opening in tab.
 */
export const PROGRAM_BROCHURE_URLS: Record<
  'mental_health' | 'neurological' | 'addiction',
  string
> = {
  mental_health:
    'https://ujbclldpvqhtkuoetkep.supabase.co/storage/v1/object/public/Applicationpdf/Mental%20Health%20Program%20by%20The%20Iboga%20Wellness%20Institute.pdf?download',
  neurological:
    'https://ujbclldpvqhtkuoetkep.supabase.co/storage/v1/object/public/Applicationpdf/Medical%20Conditions%20Program%20by%20The%20Iboga%20Wellness%20Institute.pdf?download',
  addiction:
    'https://ujbclldpvqhtkuoetkep.supabase.co/storage/v1/object/public/Applicationpdf/Detoxification%20Program%20by%20The%20Iboga%20Wellness%20Institute.pdf?download',
}

export type ProgramType = keyof typeof PROGRAM_BROCHURE_URLS
