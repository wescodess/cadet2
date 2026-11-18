import type { APIRequestContext } from '@playwright/test'
import { test, expect } from '../support/fixtures'
import { createRecommendationReviewRouteProbe } from '../support/fixtures/factories/recommendation-review-factory'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail(label: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-${label}-${seed}@example.com`
}

async function describeAuthFailure(response: Awaited<ReturnType<APIRequestContext['post']>>) {
  const text = (await response.text()).trim().replace(/\s+/g, ' ')
  return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
}

async function ensureSession(
  request: APIRequestContext,
  appBaseUrl: string,
  input: { email: string; name: string },
) {
  const password = 'PlaywrightPass123!'

  const signInResponse = await request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
    headers: {
      origin: appBaseUrl,
    },
    data: {
      email: input.email,
      password,
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (signInResponse.ok()) {
    return
  }

  const signUpResponse = await request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    headers: {
      origin: appBaseUrl,
    },
    data: {
      email: input.email,
      password,
      name: input.name,
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const [signInFailure, signUpFailure] = await Promise.all([
      describeAuthFailure(signInResponse),
      describeAuthFailure(signUpResponse),
    ])

    throw new Error(
      `Could not establish authenticated session for Story 5.3 recommendation review API red-phase tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

async function ensureNonAdminRequest(
  request: APIRequestContext,
  appBaseUrl: string,
  label: string,
) {
  await ensureSession(request, appBaseUrl, {
    email: uniqueAuthEmail(label),
    name: 'Non Admin Recommendation Review User',
  })
}

test.describe('Admin recommendation review admission', () => {
  test('[P0][AC1] recommendation review endpoints reject unauthenticated and non-admin callers', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)

    const unauthenticatedList = await request.get(routeProbe.listPath, { failOnStatusCode: false })
    expect(unauthenticatedList.status()).toBe(401)

    await ensureNonAdminRequest(request, appBaseUrl, 'admin-recommendation-review-non-admin-red')

    const nonAdminList = await request.get(routeProbe.listPath, { failOnStatusCode: false })
    expect(nonAdminList.status()).toBe(403)

    const nonAdminDetail = await request.get(routeProbe.detailPath('run-redacted-1'), {
      failOnStatusCode: false,
    })
    expect(nonAdminDetail.status()).toBe(403)
  })
})
