import { readFile } from 'node:fs/promises'

import type { APIRequestContext } from '@playwright/test'
import {
  authStorageInit,
  getStorageStatePath,
  saveStorageState,
  type AuthOptions,
  type AuthProvider,
  type PlaywrightStorageState,
} from '@seontechnologies/playwright-utils/auth-session'

import { getAuthCredentials, getBaseUrl as getConfiguredBaseUrl, getTestEnvironment } from './env'

const EMPTY_STORAGE_STATE: PlaywrightStorageState = {
  cookies: [],
  origins: [],
}

function toStorageState(value: unknown): PlaywrightStorageState | null {
  if (!value || typeof value !== 'object')
    return null

  const storageState = value as Partial<PlaywrightStorageState>

  if (!Array.isArray(storageState.cookies) || !Array.isArray(storageState.origins))
    return null

  return storageState as PlaywrightStorageState
}

function resolveAuthBaseUrl(options: Partial<AuthOptions> = {}): string {
  return options.authBaseUrl || options.baseUrl || getConfiguredBaseUrl()
}

function getStoredToken(value: unknown): string | null {
  const storageState = toStorageState(value)

  if (!storageState)
    return null

  const cookieToken = storageState.cookies.find((cookie) =>
    cookie.name === 'better-auth.session_token' || cookie.name === 'auth_token',
  )

  if (cookieToken)
    return cookieToken.value

  const originState = storageState.origins.flatMap((origin) => origin.localStorage || [])
  const localStorageToken = originState.find((entry) =>
    entry.name === 'better-auth.session_token' || entry.name === 'auth_token',
  )

  return localStorageToken?.value || null
}

async function readStoredStorageState(storageStatePath: string): Promise<PlaywrightStorageState | null> {
  try {
    const rawState = await readFile(storageStatePath, 'utf8')
    return toStorageState(JSON.parse(rawState))
  }
  catch {
    return null
  }
}

function inferAccountName(userIdentifier: string): string {
  const [localPart] = userIdentifier.split('@')
  const trimmed = localPart?.trim()

  if (!trimmed)
    return 'Playwright Test User'

  return trimmed
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function describeFailure(response: Awaited<ReturnType<APIRequestContext['post']>>): Promise<string> {
  const responseBody = await response.text()
  const compactBody = responseBody.trim().replace(/\s+/g, ' ')

  if (!compactBody)
    return `HTTP ${response.status()}`

  return `HTTP ${response.status()}: ${compactBody.slice(0, 240)}`
}

const authProvider: AuthProvider = {
  getEnvironment: (options = {}) => options.environment || getTestEnvironment(),
  getUserIdentifier: (options = {}) => options.userIdentifier || getAuthCredentials().email || 'default-user',
  getBaseUrl: (options = {}) => options.baseUrl || getConfiguredBaseUrl(),
  extractToken: (storageState) => getStoredToken(storageState),
  extractCookies: (storageState) => toStorageState(storageState)?.cookies || [],
  isTokenExpired: () => false,
  async manageAuthToken(request, options = {}) {
    const { email: defaultEmail, password: defaultPassword } = getAuthCredentials()
    const environment = authProvider.getEnvironment(options)
    const userIdentifier = options.userIdentifier || defaultEmail
    const userPassword = options.userPassword || defaultPassword
    const authBaseUrl = resolveAuthBaseUrl(options)

    if (!userIdentifier) {
      throw new Error(
        'Set TEST_USER_EMAIL (or pass authOptions.userIdentifier) before enabling authSession fixtures.',
      )
    }

    authStorageInit({ environment, userIdentifier })

    const storageStatePath = getStorageStatePath({ environment, userIdentifier })
    const cachedStorageState = await readStoredStorageState(storageStatePath)
    const cachedToken = cachedStorageState ? authProvider.extractToken(cachedStorageState) : null

    if (!userPassword) {
      if (cachedStorageState && cachedToken)
        return cachedStorageState

      throw new Error(
        'Set TEST_USER_PASSWORD (or pass authOptions.userPassword) before enabling authSession fixtures.',
      )
    }

    const signInResponse = await request.post(new URL('/api/auth/sign-in/email', authBaseUrl).toString(), {
      data: {
        email: userIdentifier,
        password: userPassword,
        rememberMe: true,
      },
      failOnStatusCode: false,
    })

    if (!signInResponse.ok()) {
      const signUpResponse = await request.post(new URL('/api/auth/sign-up/email', authBaseUrl).toString(), {
        data: {
          name: inferAccountName(userIdentifier),
          email: userIdentifier,
          password: userPassword,
          rememberMe: true,
        },
        failOnStatusCode: false,
      })

      if (!signUpResponse.ok()) {
        const signInFailure = await describeFailure(signInResponse)
        const signUpFailure = await describeFailure(signUpResponse)

        throw new Error(
          `Better Auth sign-in failed for "${userIdentifier}" (${signInFailure}). Sign-up fallback also failed (${signUpFailure}).`,
        )
      }
    }

    const storageState = (await request.storageState()) as PlaywrightStorageState
    const authToken = authProvider.extractToken(storageState)

    if (!authToken) {
      throw new Error(
        `Better Auth completed for "${userIdentifier}" but no session cookie was stored. Confirm /api/auth is reachable at ${authBaseUrl}.`,
      )
    }

    saveStorageState(storageStatePath, storageState)

    return storageState
  },
  clearToken(options = {}) {
    const environment = authProvider.getEnvironment(options)
    const userIdentifier = authProvider.getUserIdentifier(options)

    authStorageInit({ environment, userIdentifier })
    saveStorageState(getStorageStatePath({ environment, userIdentifier }), EMPTY_STORAGE_STATE)
  },
}

export default authProvider
