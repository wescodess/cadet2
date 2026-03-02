import type { Page, Response } from '@playwright/test'

export async function mockJsonResponse<T>(
  page: Page,
  urlPattern: string,
  payload: T,
  status = 200,
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

export async function waitForOkResponse(page: Page, urlFragment: string): Promise<Response> {
  return page.waitForResponse((response) =>
    response.ok() && response.url().includes(urlFragment),
  )
}
