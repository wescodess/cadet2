import { createHmac, createHash } from 'node:crypto'
import { createError } from 'h3'

type PutRagObjectInput = {
  key: string
  body: string
  contentType: string
}

type RagStorageMode = 'cloudflare-r2' | 'unavailable'

type CloudflareR2Config = {
  accountId: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  endpoint: string
}

function toSafeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function sha256Hex(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

function hmacSha256(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest()
}

function getCloudflareR2Config(): CloudflareR2Config | null {
  const accountId = toSafeString(process.env.NUXT_CLOUDFLARE_R2_ACCOUNT_ID)
  const bucket = toSafeString(process.env.NUXT_CLOUDFLARE_R2_BUCKET)
  const accessKeyId = toSafeString(process.env.NUXT_CLOUDFLARE_R2_ACCESS_KEY_ID)
  const secretAccessKey = toSafeString(process.env.NUXT_CLOUDFLARE_R2_SECRET_ACCESS_KEY)
  const endpoint =
    toSafeString(process.env.NUXT_CLOUDFLARE_R2_ENDPOINT) ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !endpoint) {
    return null
  }

  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint: endpoint.replace(/\/+$/, ''),
  }
}

function encodeR2KeyPath(key: string) {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function buildSignedR2PutRequest(input: {
  config: CloudflareR2Config
  key: string
  body: string
  contentType: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '') // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8)
  const region = 'auto'
  const service = 's3'

  const endpoint = new URL(input.config.endpoint)
  const host = endpoint.host
  const path = `/${encodeURIComponent(input.config.bucket)}/${encodeR2KeyPath(input.key)}`
  const payloadHash = sha256Hex(input.body)

  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n')
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    'PUT',
    path,
    '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const kDate = hmacSha256(`AWS4${input.config.secretAccessKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, service)
  const kSigning = hmacSha256(kService, 'aws4_request')
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${input.config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ')

  const url = `${input.config.endpoint}${path}`
  const headers = {
    'content-type': input.contentType,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    authorization,
  } satisfies Record<string, string>

  return { url, headers }
}

async function putObjectToCloudflareR2(input: PutRagObjectInput, config: CloudflareR2Config) {
  const { url, headers } = buildSignedR2PutRequest({
    config,
    key: input.key,
    body: input.body,
    contentType: input.contentType,
  })

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: input.body,
  })

  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    throw createError({
      statusCode: response.status,
      statusMessage: `Cloudflare R2 write failed for ${input.key}`,
      data: raw ? { body: raw.slice(0, 2000) } : undefined,
    })
  }
}

export function getRagStorageMode(): RagStorageMode {
  return getCloudflareR2Config() ? 'cloudflare-r2' : 'unavailable'
}

export async function putRagObject(input: PutRagObjectInput) {
  const r2 = getCloudflareR2Config()
  if (!r2)
    throw createError({ statusCode: 503, statusMessage: 'Approved RAG storage is unavailable' })

  await putObjectToCloudflareR2(input, r2)
  return {
    mode: 'cloudflare-r2' as const,
    key: input.key,
    bucket: r2.bucket,
  }
}
