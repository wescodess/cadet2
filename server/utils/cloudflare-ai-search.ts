type CloudflareAiSearchMode = 'search' | 'ai-search'

export interface CloudflareAiSearchQueryInput {
  query: string
  mode?: CloudflareAiSearchMode
  rewriteQuery?: boolean
  maxNumResults?: number
  scoreThreshold?: number
  filters?: Record<string, unknown>
  reranking?: Record<string, unknown>
  model?: string
  systemPrompt?: string
  stream?: boolean
}

export interface CloudflareAiSearchConfig {
  accountId: string
  apiToken: string
  instanceName?: string
  instanceId?: string
}

type CloudflareApiEnvelope = {
  success?: boolean
  result?: unknown
  errors?: Array<{ code?: number, message?: string }>
  messages?: Array<{ code?: number, message?: string }>
}

function getErrorMessage(body: unknown, fallback: string) {
  if (typeof body === 'string' && body.trim()) {
    return body
  }

  if (!body || typeof body !== 'object') {
    return fallback
  }

  const maybeBody = body as {
    errors?: Array<{ message?: string }>
    message?: string
  }

  const firstError = maybeBody.errors?.find(error => typeof error?.message === 'string')?.message
  if (firstError) {
    return firstError
  }

  if (typeof maybeBody.message === 'string' && maybeBody.message.trim()) {
    return maybeBody.message
  }

  return fallback
}

function buildRequestBody(input: CloudflareAiSearchQueryInput) {
  const mode: CloudflareAiSearchMode = input.mode === 'ai-search' ? 'ai-search' : 'search'
  const payload: Record<string, unknown> = {
    query: input.query,
  }

  if (typeof input.rewriteQuery === 'boolean') {
    payload.rewrite_query = input.rewriteQuery
  }

  if (typeof input.maxNumResults === 'number') {
    payload.max_num_results = input.maxNumResults
  }

  if (typeof input.scoreThreshold === 'number') {
    payload.ranking_options = {
      score_threshold: input.scoreThreshold,
    }
  }

  if (input.filters && typeof input.filters === 'object') {
    payload.filters = input.filters
  }

  if (input.reranking && typeof input.reranking === 'object') {
    payload.reranking = input.reranking
  }

  if (mode === 'ai-search') {
    if (typeof input.model === 'string' && input.model.trim()) {
      payload.model = input.model.trim()
    }

    if (typeof input.systemPrompt === 'string' && input.systemPrompt.trim()) {
      payload.system_prompt = input.systemPrompt.trim()
    }

    if (typeof input.stream === 'boolean') {
      payload.stream = input.stream
    }
  }

  return { mode, payload }
}

function getErrorCodes(body: unknown) {
  if (!body || typeof body !== 'object') {
    return []
  }

  const maybeBody = body as CloudflareApiEnvelope
  return (maybeBody.errors ?? [])
    .map(error => error.code)
    .filter((code): code is number => typeof code === 'number')
}

function isNotFoundIdentifierError(status: number, body: unknown) {
  if (status !== 404) {
    return false
  }

  const codes = getErrorCodes(body)
  return codes.includes(7002) || codes.includes(7003)
}

function buildLegacyEndpoint(config: CloudflareAiSearchConfig, mode: CloudflareAiSearchMode) {
  if (!config.instanceName) {
    return null
  }

  return {
    endpointStyle: 'legacy-rags' as const,
    url: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/autorag/rags/${encodeURIComponent(config.instanceName)}/${mode}`,
  }
}

function buildInstancesEndpoint(config: CloudflareAiSearchConfig, mode: CloudflareAiSearchMode) {
  const instanceIdentifier = config.instanceId || config.instanceName

  if (!instanceIdentifier) {
    return null
  }

  const operation = mode === 'search' ? 'search' : 'chat/completions'
  return {
    endpointStyle: 'instances-api' as const,
    url: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai-search/instances/${encodeURIComponent(instanceIdentifier)}/${operation}`,
  }
}

async function callCloudflareEndpoint(url: string, apiToken: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const rawText = await response.text()
  let parsed: unknown = rawText

  if (rawText) {
    try {
      parsed = JSON.parse(rawText)
    }
    catch {
      parsed = rawText
    }
  }

  return {
    response,
    parsed,
  }
}

export async function queryCloudflareAiSearch(
  config: CloudflareAiSearchConfig,
  input: CloudflareAiSearchQueryInput,
) {
  const { mode, payload } = buildRequestBody(input)
  const endpointCandidates = [
    buildLegacyEndpoint(config, mode),
    buildInstancesEndpoint(config, mode),
  ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))

  if (!endpointCandidates.length) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Cloudflare AI Search instance identifier is not configured',
    })
  }

  let lastFailure: { status: number, parsed: unknown } | null = null
  let endpointUsed = endpointCandidates[0]!.endpointStyle

  for (const candidate of endpointCandidates) {
    endpointUsed = candidate.endpointStyle
    const { response, parsed } = await callCloudflareEndpoint(candidate.url, config.apiToken, payload)

    if (response.ok) {
      const maybeEnvelope = (parsed && typeof parsed === 'object')
        ? parsed as CloudflareApiEnvelope
        : null

      return {
        mode,
        endpointStyle: endpointUsed,
        result: maybeEnvelope && 'result' in maybeEnvelope ? maybeEnvelope.result : parsed,
        raw: maybeEnvelope && 'result' in maybeEnvelope ? undefined : parsed,
      }
    }

    lastFailure = { status: response.status, parsed }

    // If the identifier/path style is wrong, try the alternate endpoint shape.
    if (isNotFoundIdentifierError(response.status, parsed)) {
      continue
    }

    throw createError({
      statusCode: response.status,
      statusMessage: getErrorMessage(parsed, 'Cloudflare AI Search request failed'),
      data: typeof parsed === 'object' && parsed !== null ? parsed : undefined,
    })
  }

  throw createError({
    statusCode: lastFailure?.status ?? 404,
    statusMessage: getErrorMessage(lastFailure?.parsed, 'Cloudflare AI Search instance not found'),
    data: typeof lastFailure?.parsed === 'object' && lastFailure.parsed !== null ? lastFailure.parsed : undefined,
  })
}
