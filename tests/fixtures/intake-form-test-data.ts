/**
 * Test data for patient intake application form (e2e and manual testing).
 * Uses real-looking details for a single test user.
 */
export const INTAKE_FORM_TEST_DATA = {
  // Personal
  email: 'xx',
  first_name: 'xx',
  last_name: 'xxa',
  phone_number: 'xx',
  phone_digits: 'x',
  gender: 'male' as const,

  // Address
  address_line_1: 'xx',
  address_line_2: 'xx',
  city: 'txx',
  zip_code: 'xx',
  country: 'xx',

  // Emergency contact
  emergency_contact_first_name: 'Vvaan',
  emergency_contact_last_name: 'Richards',
  emergency_contact_phone: 'xx',
  emergency_contact_phone_digits: 'xx',
} as const
