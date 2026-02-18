/**
 * Test data for patient intake application form (e2e and manual testing).
 * Uses real-looking details for a single test user.
 */
export const INTAKE_FORM_TEST_DATA = {
  // Personal
  email: 'kolliparavamsikrishna80@gmail.com',
  first_name: 'Vamsi Krishna',
  last_name: 'Kollipara',
  phone_number: '(728) 806-8102',
  phone_digits: '7288068102',
  gender: 'male' as const,

  // Address
  address_line_1: '1101 spruce st',
  address_line_2: 'apt 101',
  city: 'terre haute',
  zip_code: '47807',
  country: 'United States',

  // Emergency contact
  emergency_contact_first_name: 'Vvaan',
  emergency_contact_last_name: 'Richards',
  emergency_contact_phone: '(630) 334-2253',
  emergency_contact_phone_digits: '6303342253',
} as const
