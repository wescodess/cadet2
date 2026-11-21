import { convexToJson } from 'convex/values'

export const sourceSizeLimits = {
  name: 255,
  description: 4000,
  configBytes: 16384,
  inputBytes: 32768,
} as const
const encoder = new TextEncoder()

export function canonicalJson(value: unknown): string {
  if (value === undefined) return 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object' && !(value instanceof ArrayBuffer)) {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(convexToJson(value as Parameters<typeof convexToJson>[0]))
}

export function jsonBytes(value: unknown) {
  return encoder.encode(canonicalJson(value)).byteLength
}

export async function stateDigest(value: unknown) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalJson(value)))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function auditText(value: string, limit = 1024) {
  return Array.from(value.replaceAll('\0', '�').replace(/\p{Cs}/gu, '�'))
    .slice(0, limit)
    .join('')
}

async function boundedState(value: Record<string, unknown> | null) {
  if (!value) return { state: null, truncated: false }
  const state: Record<string, unknown> = {}
  let truncated = false
  let remaining = 8192
  for (const [key, item] of Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (item === undefined) continue
    if (key.length > 128 || Object.keys(state).length >= 64) {
      truncated = true
      continue
    }
    const size = jsonBytes({ [key]: item })
    if (size <= 1024 && size <= remaining) {
      state[key] = item
      remaining -= size
    } else {
      state[key] = { digest: await stateDigest(item), bytes: jsonBytes(item), truncated: true }
      truncated = true
    }
  }
  return { state, truncated }
}

export async function boundedChange(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  const [oldState, newState, beforeDigest, afterDigest] = await Promise.all([
    boundedState(before),
    boundedState(after),
    stateDigest(before),
    stateDigest(after),
  ])
  return {
    changeContext: { before: oldState.state, after: newState.state },
    stateDigests: { before: beforeDigest, after: afterDigest },
    truncated: oldState.truncated || newState.truncated,
  }
}

export function validateSourceSizes(input: {
  name?: string
  description?: string | null
  websiteConfig?: unknown
  youtubeConfig?: unknown
  schedule?: { intervalHours?: number }
  tags?: string[]
  linkedPathwayIds?: string[]
}) {
  if (
    input.name !== undefined &&
    (input.name.trim().length === 0 || input.name.length > sourceSizeLimits.name)
  )
    throw new Error('Source name must contain 1 to 255 characters')
  if (input.description && input.description.length > sourceSizeLimits.description)
    throw new Error('Source description exceeds the 4000 character limit')
  const interval = input.schedule?.intervalHours
  if (interval !== undefined && (!Number.isInteger(interval) || interval < 1 || interval > 168))
    throw new Error('Source intervalHours must be an integer from 1 to 168')
  for (const [field, values, limit] of [
    ['tags', input.tags, 24],
    ['linkedPathwayIds', input.linkedPathwayIds, 16],
  ] as const) {
    if (
      values &&
      (values.length > limit || values.some((value) => !value.trim() || value.trim().length > 120))
    )
      throw new Error(`Source ${field} exceeds its entry or 120 character limit`)
  }
  if (
    [input.websiteConfig, input.youtubeConfig].some(
      (value) => value !== undefined && jsonBytes(value) > sourceSizeLimits.configBytes,
    )
  )
    throw new Error('Source config exceeds the 16384 byte limit')
  if (jsonBytes(input) > sourceSizeLimits.inputBytes)
    throw new Error('Source input exceeds the 32768 byte limit')
}
