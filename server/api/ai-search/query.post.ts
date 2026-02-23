import { queryCloudflareAiSearch } from '../../utils/cloudflare-ai-search'

type QueryRequestBody = {
  query?: unknown
  mode?: unknown
  rewriteQuery?: unknown
  maxNumResults?: unknown
  scoreThreshold?: unknown
  filters?: unknown
  reranking?: unknown
  model?: unknown
  systemPrompt?: unknown
  stream?: unknown
}

function toOptionalBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function toOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export default defineEventHandler(async (event) => {
  const body = await readBody<QueryRequestBody>(event)
  const query = typeof body?.query === 'string' ? body.query.trim() : ''

  if (!query) {
    throw createError({
      statusCode: 400,
      statusMessage: '`query` is required',
    })
  }

  const runtimeConfig = useRuntimeConfig(event)
  const cloudflareConfig = runtimeConfig.cloudflareAiSearch as {
    accountId?: string
    apiToken?: string
    instanceName?: string
    instanceId?: string
  }

  if (!cloudflareConfig?.accountId || !cloudflareConfig?.apiToken || (!cloudflareConfig?.instanceName && !cloudflareConfig?.instanceId)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Cloudflare AI Search is not configured on the server',
      data: {
        requiredEnvVars: [
          'NUXT_CLOUDFLARE_AI_SEARCH_ACCOUNT_ID',
          'NUXT_CLOUDFLARE_AI_SEARCH_API_TOKEN',
        ],
        oneOfInstanceVars: [
          'NUXT_CLOUDFLARE_AI_SEARCH_INSTANCE_NAME',
          'NUXT_CLOUDFLARE_AI_SEARCH_INSTANCE_ID',
        ],
      },
    })
  }

  const mode = body.mode === 'ai-search' ? 'ai-search' : 'search'
  const maxNumResults = toOptionalNumber(body.maxNumResults)
  const scoreThreshold = toOptionalNumber(body.scoreThreshold)

  if (typeof maxNumResults === 'number' && (maxNumResults < 1 || maxNumResults > 50)) {
    throw createError({
      statusCode: 400,
      statusMessage: '`maxNumResults` must be between 1 and 50',
    })
  }

  if (typeof scoreThreshold === 'number' && (scoreThreshold < 0 || scoreThreshold > 1)) {
    throw createError({
      statusCode: 400,
      statusMessage: '`scoreThreshold` must be between 0 and 1',
    })
  }

  const response = await queryCloudflareAiSearch({
    accountId: cloudflareConfig.accountId,
    apiToken: cloudflareConfig.apiToken,
    instanceName: cloudflareConfig.instanceName,
    instanceId: cloudflareConfig.instanceId,
  }, {
    query,
    mode,
    rewriteQuery: toOptionalBoolean(body.rewriteQuery),
    maxNumResults,
    scoreThreshold,
    filters: body.filters && typeof body.filters === 'object' ? body.filters as Record<string, unknown> : undefined,
    reranking: body.reranking && typeof body.reranking === 'object' ? body.reranking as Record<string, unknown> : undefined,
    model: typeof body.model === 'string' ? body.model : undefined,
    systemPrompt: typeof body.systemPrompt === 'string' ? body.systemPrompt : undefined,
    stream: toOptionalBoolean(body.stream),
  })

  return {
    ok: true,
    ...response,
  }
})
