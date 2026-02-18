import { test, expect } from '@playwright/test'
import { INTAKE_FORM_TEST_DATA } from '../fixtures/intake-form-test-data'

test.describe('Patient intake application form', () => {
  test('fills and submits application with test data', async ({ page }) => {
    await page.goto('/intake')
    await expect(page.getByRole('heading', { name: /client application form/i })).toBeVisible()

    // --- Step 1: Personal Information ---
    await page.getByRole('radio', { name: /i am filling this out myself/i }).check()
    await page.getByRole('radio', { name: /mental health/i }).check()

    await page.locator('#first_name').fill(INTAKE_FORM_TEST_DATA.first_name)
    await page.locator('#last_name').fill(INTAKE_FORM_TEST_DATA.last_name)
    await page.locator('#email').fill(INTAKE_FORM_TEST_DATA.email)
    await page.locator('#phone_number').fill(INTAKE_FORM_TEST_DATA.phone_number)
    await page.getByRole('radio', { name: /^male$/i }).check()

    await page.locator('#address_line_1').fill(INTAKE_FORM_TEST_DATA.address_line_1)
    await page.locator('#address_line_2').fill(INTAKE_FORM_TEST_DATA.address_line_2)
    await page.locator('#city').fill(INTAKE_FORM_TEST_DATA.city)
    await page.locator('#zip_code').fill(INTAKE_FORM_TEST_DATA.zip_code)
    await page.locator('#country').fill(INTAKE_FORM_TEST_DATA.country)

    await page.getByRole('button', { name: /next/i }).click()

    // --- Step 2: Emergency Contact ---
    await expect(page.getByRole('heading', { name: /emergency contact information/i })).toBeVisible()
    await page.locator('input[name="emergency_contact_first_name"]').fill(INTAKE_FORM_TEST_DATA.emergency_contact_first_name)
    await page.locator('input[name="emergency_contact_last_name"]').fill(INTAKE_FORM_TEST_DATA.emergency_contact_last_name)
    await page.locator('#emergency_contact_phone').fill(INTAKE_FORM_TEST_DATA.emergency_contact_phone)

    await page.getByRole('button', { name: /next/i }).click()

    // --- Step 3: Privacy Policy ---
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible()
    await page.getByRole('checkbox', { name: /i confirm that i have read and agree/i }).check()
    await page.getByRole('button', { name: /submit/i }).click()

    await expect(page.getByText(/thank you/i)).toBeVisible()
    await expect(page.getByText(/form has been submitted successfully/i)).toBeVisible()
  })
})
