import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { H3Event } from 'h3'
import { getHeader, getRequestURL } from 'h3'
import { ConvexHttpClient } from 'convex/browser'
import { createError } from '#imports'

function getConvexUrl() {
  const url = process.env.CONVEX_URL?.trim()
  if (!url) {
    throw createError({
      statusCode: 503,
      statusMessage: 'CONVEX_URL is not configured',
    })
  }

  return url
}

async function readLocalConvexAdminKey() {
  try {
    const configPath = join(process.cwd(), '.convex', 'local', 'default', 'config.json')
    const raw = await fs.readFile(configPath, 'utf8')
    const parsed = JSON.parse(raw) as { adminKey?: string }
    return typeof parsed.adminKey === 'string' && parsed.adminKey.trim()
      ? parsed.adminKey.trim()
      : null
  } catch {
    return null
  }
}

async function getConvexAdminKey() {
  const explicitKey = process.env.CONVEX_ADMIN_KEY?.trim() || process.env.CONVEX_DEPLOY_KEY?.trim()
  if (explicitKey) {
    return explicitKey
  }

  if ((process.env.CONVEX_DEPLOYMENT ?? '').startsWith('local:')) {
    const localKey = await readLocalConvexAdminKey()
    if (localKey) {
      return localKey
    }
  }

  throw createError({
    statusCode: 503,
    statusMessage: 'Convex admin key is not configured',
    data: {
      requiredEnvVars: ['CONVEX_ADMIN_KEY or CONVEX_DEPLOY_KEY'],
    },
  })
}

export async function createConvexAdminClient() {
  const client = new ConvexHttpClient(getConvexUrl(), { logger: false })
  client.setAdminAuth(await getConvexAdminKey())
  return client
}

export async function getConvexTokenForEvent(event: H3Event) {
  const origin = getRequestURL(event).origin
  const cookie = getHeader(event, 'cookie')

  const response = await fetch(new URL('/api/auth/convex/token', origin), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...(cookie ? { cookie } : {}),
    },
  })

  if (!response.ok) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Failed to mint Convex auth token for current user',
    })
  }

  const body = (await response.json()) as { token?: string }
  if (!body.token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Convex auth token response missing token',
    })
  }

  return body.token
}

export async function createConvexUserHttpClientForEvent(event: H3Event) {
  const client = new ConvexHttpClient(getConvexUrl(), { logger: false })
  client.setAuth(await getConvexTokenForEvent(event))
  return client
}
