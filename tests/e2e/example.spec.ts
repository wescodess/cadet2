import { test, expect } from '../support/fixtures'
import { mockJsonResponse } from '../support/helpers/network'

test.describe('Landing page smoke checks', () => {
  test('guest can reach the primary entrypoints', async ({ page, userFactory, appBaseUrl }) => {
    const demoUser = userFactory.create({ role: 'admin' })

    await test.step('Given a deterministic API probe', async () => {
      await mockJsonResponse(page, '**/api/test-bootstrap', {
        actor: demoUser.email,
        ready: true,
      })
    })

    await test.step('When the guest opens the landing page', async () => {
      await page.goto(appBaseUrl)
    })

    await test.step('Then the intercepted API and stable selectors are available', async () => {
      const bootstrapPayload = await page.evaluate(async () => {
        const response = await fetch('/api/test-bootstrap')
        return response.json()
      })

      expect(bootstrapPayload).toEqual({
        actor: demoUser.email,
        ready: true,
      })
      await expect(page.getByTestId('home-hero')).toBeVisible()
      await expect(page.getByTestId('home-open-auth-link')).toBeVisible()
      await expect(page.getByTestId('home-open-workspace-link')).toBeVisible()
      await expect(page.getByTestId('home-open-legacy-tasks-link')).toBeVisible()
      await expect(page.getByTestId('home-open-ai-search-link')).toBeVisible()
    })
  })
})
