export type TestEnvironment = 'local' | 'staging' | 'production'

const DEFAULT_BASE_URL = 'http://127.0.0.1:3100'

export function getTestEnvironment(): TestEnvironment {
  const value = process.env.TEST_ENV

  if (value === 'staging' || value === 'production')
    return value

  return 'local'
}

export function getBaseUrl(): string {
  return process.env.BASE_URL || DEFAULT_BASE_URL
}

export function getApiUrl(): string {
  return process.env.API_URL || getBaseUrl()
}

export function getAuthCredentials(): { email: string, password: string } {
  return {
    email: process.env.TEST_USER_EMAIL || '',
    password: process.env.TEST_USER_PASSWORD || '',
  }
}
