import { anyApi } from 'convex/server'
import { createError } from '#imports'

type ConvexAdminClientLike = {
  query: (fnRef: any, args?: Record<string, unknown>) => Promise<any>
  mutation: (fnRef: any, args?: Record<string, unknown>) => Promise<any>
}

type CloudflareAiSearchOpsConfig = {
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

type SyncJobStatus = 'submitted' | 'running' | 'succeeded' | 'failed' | 'timeout'

function toSafeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getErrorMessage(body: unknown, fallback: string) {
  if (typeof body === 'string' && body.trim()) {
    return body
  }

  if (!body || typeof body !== 'object') {
    return fallback
  }

  const maybe = body as { errors?: Array<{ message?: string }>, message?: string }
  const first = maybe.errors?.find(error => typeof error?.message === 'string')?.message
  if (first) {
    return first
  }
  if (typeof maybe.message === 'string' && maybe.message.trim()) {
    return maybe.message
  }
  return fallback
}

function buildJobsBaseUrl(config: CloudflareAiSearchOpsConfig) {
  const instanceIdentifier = toSafeString(config.instanceId) || toSafeString(config.instanceName)
  if (!config.accountId || !config.apiToken || !instanceIdentifier) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Cloudflare AI Search sync is not configured',
      data: {
        requiredEnvVars: [
          'NUXT_CLOUDFLARE_AI_SEARCH_ACCOUNT_ID',
          'NUXT_CLOUDFLARE_AI_SEARCH_API_TOKEN',
          'NUXT_CLOUDFLARE_AI_SEARCH_INSTANCE_ID or NUXT_CLOUDFLARE_AI_SEARCH_INSTANCE_NAME',
        ],
      },
    })
  }

  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai-search/instances/${encodeURIComponent(instanceIdentifier)}/jobs`
}

async function cloudflareApiRequest(config: CloudflareAiSearchOpsConfig, url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      ...(init.method && init.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
    },
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

  return { response, parsed }
}

function unwrapCloudflareResult(parsed: unknown) {
  if (parsed && typeof parsed === 'object' && 'result' in (parsed as any)) {
    return (parsed as CloudflareApiEnvelope).result
  }
  return parsed
}

function extractCloudflareJobId(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }
  const row = payload as Record<string, unknown>
  return toSafeString(row.id) || toSafeString(row.job_id) || toSafeString(row.jobId)
}

function normalizeSyncJobStatus(payload: unknown): { status: SyncJobStatus, error?: string } {
  const row = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {}
  const rawStatus = toSafeString(row.status || row.state || row.lifecycle_state).toLowerCase()

  const statusMap: Record<string, SyncJobStatus> = {
    queued: 'submitted',
    pending: 'submitted',
    submitted: 'submitted',
    running: 'running',
    processing: 'running',
    active: 'running',
    succeeded: 'succeeded',
    success: 'succeeded',
    completed: 'succeeded',
    done: 'succeeded',
    failed: 'failed',
    error: 'failed',
    cancelled: 'failed',
    canceled: 'failed',
    timeout: 'timeout',
    timed_out: 'timeout',
  }

  if (rawStatus && statusMap[rawStatus]) {
    return { status: statusMap[rawStatus] }
  }

  const endedAt = toSafeString(row.ended_at || row.endedAt || row.finished_at || row.finishedAt)
  if (!endedAt) {
    return { status: 'running' }
  }

  const endReason = toSafeString(row.end_reason || row.endReason || row.result_reason || row.resultReason).toLowerCase()
  if (endReason.includes('timeout')) {
    return { status: 'timeout', error: endReason }
  }
  if (endReason.includes('fail') || endReason.includes('error') || endReason.includes('cancel')) {
    return { status: 'failed', error: endReason }
  }

  return { status: 'succeeded' }
}

function summarizeSyncLogs(payload: unknown) {
  const unwrapped = unwrapCloudflareResult(payload)
  const candidates: unknown[] = Array.isArray(unwrapped)
    ? unwrapped
    : (unwrapped && typeof unwrapped === 'object'
        ? [
            ...(Array.isArray((unwrapped as any).logs) ? (unwrapped as any).logs : []),
            ...(Array.isArray((unwrapped as any).entries) ? (unwrapped as any).entries : []),
            ...(Array.isArray((unwrapped as any).data) ? (unwrapped as any).data : []),
          ]
        : [])

  const lines: string[] = []
  for (const entry of candidates) {
    if (typeof entry === 'string' && entry.trim()) {
      lines.push(entry.trim())
      continue
    }
    if (entry && typeof entry === 'object') {
      const row = entry as Record<string, unknown>
      const level = toSafeString(row.level).toLowerCase()
      const message = toSafeString(row.message || row.msg || row.text)
      const ts = toSafeString(row.timestamp || row.time || row.created_at)
      const line = [ts, level && `[${level}]`, message].filter(Boolean).join(' ')
      if (line) {
        lines.push(line)
      }
    }
    if (lines.length >= 20) {
      break
    }
  }

  return lines.slice(0, 20)
}

async function sleep(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchSyncJobLogs(config: CloudflareAiSearchOpsConfig, jobsBaseUrl: string, cloudflareJobId: string) {
  const { parsed } = await cloudflareApiRequest(config, `${jobsBaseUrl}/${encodeURIComponent(cloudflareJobId)}/logs`)
  return summarizeSyncLogs(parsed)
}

async function submitSyncJob(config: CloudflareAiSearchOpsConfig, jobsBaseUrl: string) {
  const { response, parsed } = await cloudflareApiRequest(config, jobsBaseUrl, {
    method: 'POST',
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: getErrorMessage(parsed, 'Cloudflare AI Search sync job creation failed'),
      data: typeof parsed === 'object' && parsed !== null ? parsed : undefined,
    })
  }

  const result = unwrapCloudflareResult(parsed)
  const cloudflareJobId = extractCloudflareJobId(result)
  if (!cloudflareJobId) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Cloudflare AI Search sync job response missing job id',
      data: typeof parsed === 'object' && parsed !== null ? parsed : undefined,
    })
  }

  return {
    cloudflareJobId,
    rawResult: result,
  }
}

async function getSyncJob(config: CloudflareAiSearchOpsConfig, jobsBaseUrl: string, cloudflareJobId: string) {
  const { response, parsed } = await cloudflareApiRequest(config, `${jobsBaseUrl}/${encodeURIComponent(cloudflareJobId)}`)
  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: getErrorMessage(parsed, 'Cloudflare AI Search sync job poll failed'),
      data: typeof parsed === 'object' && parsed !== null ? parsed : undefined,
    })
  }
  return unwrapCloudflareResult(parsed)
}

export async function maybeRunAiSearchSyncForBatch(convex: ConvexAdminClientLike, input: {
  batchId: string
  cloudflareAiSearch: CloudflareAiSearchOpsConfig
}) {
  const batchDetail = await convex.query((anyApi as any).ragIngestionInternal.getBatchDetailAsNuxtAdmin, {
    batchId: input.batchId,
  }) as {
    batch?: { status?: string, summary?: unknown } | null
    syncJob?: { _id: string, status?: string, cloudflareJobId?: string } | null
  } | null

  if (!batchDetail?.batch) {
    throw new Error('Batch not found for sync')
  }

  if (batchDetail.batch.status !== 'sync_pending') {
    return {
      attempted: false,
      skipped: true,
      reason: `batch_status_${batchDetail.batch.status ?? 'unknown'}`,
      batchStatus: batchDetail.batch.status ?? null,
      summary: batchDetail.batch.summary ?? null,
      syncJob: batchDetail.syncJob ?? null,
    }
  }

  const createOrReuse = await convex.mutation((anyApi as any).ragIngestionInternal.createOrReuseAiSearchSyncJobForBatchFromNuxt, {
    batchId: input.batchId,
  }) as {
    syncJobId: string
    syncJob?: { _id: string, status?: string, cloudflareJobId?: string, logSummary?: string[] } | null
    reused?: boolean
  }

  const syncJobId = createOrReuse.syncJobId
  const existingStatus = toSafeString(createOrReuse.syncJob?.status).toLowerCase()
  if (['succeeded', 'failed', 'timeout'].includes(existingStatus)) {
    return {
      attempted: false,
      skipped: true,
      reason: 'sync_job_already_terminal',
      syncJobId,
      syncStatus: existingStatus,
      batchStatus: existingStatus === 'succeeded' ? 'completed' : 'failed',
    }
  }

  const jobsBaseUrl = buildJobsBaseUrl(input.cloudflareAiSearch)

  try {
    const { cloudflareJobId } = await submitSyncJob(input.cloudflareAiSearch, jobsBaseUrl)
    await convex.mutation((anyApi as any).ragIngestionInternal.markAiSearchSyncJobSubmittedFromNuxt, {
      syncJobId,
      cloudflareJobId,
      submittedAt: Date.now(),
    })

    const timeoutAt = Date.now() + 90_000
    let pollDelayMs = 1_500

    while (Date.now() < timeoutAt) {
      const job = await getSyncJob(input.cloudflareAiSearch, jobsBaseUrl, cloudflareJobId)
      const normalized = normalizeSyncJobStatus(job)

      if (normalized.status === 'submitted' || normalized.status === 'running') {
        await convex.mutation((anyApi as any).ragIngestionInternal.updateAiSearchSyncJobFromNuxt, {
          syncJobId,
          status: normalized.status === 'submitted' ? 'running' : normalized.status,
          cloudflareJobId,
          lastPolledAt: Date.now(),
        })
        await sleep(pollDelayMs)
        pollDelayMs = Math.min(4_000, Math.floor(pollDelayMs * 1.3))
        continue
      }

      const logs = await fetchSyncJobLogs(input.cloudflareAiSearch, jobsBaseUrl, cloudflareJobId).catch(() => [] as string[])
      const terminal = await convex.mutation((anyApi as any).ragIngestionInternal.updateAiSearchSyncJobFromNuxt, {
        syncJobId,
        status: normalized.status,
        cloudflareJobId,
        lastPolledAt: Date.now(),
        finishedAt: Date.now(),
        error: normalized.error,
        logSummary: logs,
      }) as { batchStatus?: string }

      return {
        attempted: true,
        skipped: false,
        syncJobId,
        cloudflareJobId,
        syncStatus: normalized.status,
        batchStatus: terminal.batchStatus ?? (normalized.status === 'succeeded' ? 'completed' : 'failed'),
      }
    }

    const timeoutLogs = cloudflareJobId
      ? await fetchSyncJobLogs(input.cloudflareAiSearch, jobsBaseUrl, cloudflareJobId).catch(() => [] as string[])
      : []

    await convex.mutation((anyApi as any).ragIngestionInternal.updateAiSearchSyncJobFromNuxt, {
      syncJobId,
      status: 'timeout',
      cloudflareJobId,
      lastPolledAt: Date.now(),
      finishedAt: Date.now(),
      error: 'Cloudflare AI Search sync polling timed out',
      logSummary: timeoutLogs,
    })

    return {
      attempted: true,
      skipped: false,
      syncJobId,
      syncStatus: 'timeout' as const,
      batchStatus: 'failed' as const,
    }
  }
  catch (error) {
    await convex.mutation((anyApi as any).ragIngestionInternal.updateAiSearchSyncJobFromNuxt, {
      syncJobId,
      status: 'failed',
      lastPolledAt: Date.now(),
      finishedAt: Date.now(),
      error: toErrorMessage(error),
    })

    return {
      attempted: true,
      skipped: false,
      syncJobId,
      syncStatus: 'failed' as const,
      batchStatus: 'failed' as const,
      error: toErrorMessage(error),
    }
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return typeof error === 'string' && error.trim() ? error.trim() : 'Unknown error'
}
