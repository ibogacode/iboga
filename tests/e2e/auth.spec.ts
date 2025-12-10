import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Iboga/)
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/email is required/i)).toBeVisible()
  })

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // After successful login, should redirect to role-based dashboard
    await expect(page).toHaveURL(/\/(owner|doctor|nurse|patient|manager|driver|psych)/)
  })
})

test.describe('Role-based Access', () => {
  test('should redirect unauthorized users', async ({ page }) => {
    // Try to access owner page without auth
    await page.goto('/owner')
    await expect(page).toHaveURL(/\/login/)
  })
})


