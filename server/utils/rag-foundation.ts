import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

type ReadinessSection = {
  ready: boolean
  missingEnvVars: string[]
  notes?: string[]
}

type RagPhase0Readiness = {
  overallReady: boolean
  checkedAt: string
  configSummary: {
    defaultTenantId: string
    aiSearch: {
      accountIdConfigured: boolean
      apiTokenConfigured: boolean
      instanceNameConfigured: boolean
      instanceIdConfigured: boolean
    }
    aiGateway: {
      accountIdConfigured: boolean
      gatewayIdConfigured: boolean
      baseUrlConfigured: boolean
      apiTokenConfigured: boolean
      resolvedBaseUrl: string | null
    }
    openRouter: {
      apiKeyConfigured: boolean
      defaultModelConfigured: boolean
      appNameConfigured: boolean
      appUrlConfigured: boolean
    }
    adminAuth: {
      adminUserIdsCount: number
      adminEmailsCount: number
    }
  }
  sections: {
    aiSearch: ReadinessSection
    aiGateway: ReadinessSection
    openRouter: ReadinessSection
    adminAuthorization: ReadinessSection
    schedulerSecret: ReadinessSection
  }
}

function hasValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
}

function toOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function getRagFoundationConfig(event: H3Event) {
  const runtimeConfig = useRuntimeConfig(event) as {
    cloudflareAiSearch?: Record<string, unknown>
    cloudflareAiGateway?: Record<string, unknown>
    openRouter?: Record<string, unknown>
    rag?: Record<string, unknown>
  }

  const aiSearch = runtimeConfig.cloudflareAiSearch ?? {}
  const aiGateway = runtimeConfig.cloudflareAiGateway ?? {}
  const openRouter = runtimeConfig.openRouter ?? {}
  const rag = runtimeConfig.rag ?? {}

  const gatewayAccountId = toOptionalString(aiGateway.accountId)
  const gatewayId = toOptionalString(aiGateway.gatewayId)
  const gatewayBaseUrlOverride = toOptionalString(aiGateway.baseUrl)
  const resolvedGatewayBaseUrl =
    gatewayBaseUrlOverride ||
    (gatewayAccountId && gatewayId
      ? `https://gateway.ai.cloudflare.com/v1/${gatewayAccountId}/${gatewayId}`
      : '')

  return {
    aiSearch: {
      accountId: toOptionalString(aiSearch.accountId),
      apiToken: toOptionalString(aiSearch.apiToken),
      instanceName: toOptionalString(aiSearch.instanceName),
      instanceId: toOptionalString(aiSearch.instanceId),
    },
    aiGateway: {
      accountId: gatewayAccountId,
      gatewayId,
      baseUrl: gatewayBaseUrlOverride,
      apiToken: toOptionalString(aiGateway.apiToken),
      resolvedBaseUrl: resolvedGatewayBaseUrl,
    },
    openRouter: {
      apiKey: toOptionalString(openRouter.apiKey),
      defaultModel: toOptionalString(openRouter.defaultModel),
      appName: toOptionalString(openRouter.appName),
      appUrl: toOptionalString(openRouter.appUrl),
    },
    rag: {
      defaultTenantId: toOptionalString(rag.defaultTenantId) || 'default',
      schedulerSecret: toOptionalString(rag.schedulerSecret),
    },
  }
}

export function getRagPhase0Readiness(event: H3Event): RagPhase0Readiness {
  const config = getRagFoundationConfig(event)

  const aiSearchMissing = [
    !hasValue(config.aiSearch.accountId) ? 'NUXT_CLOUDFLARE_AI_SEARCH_ACCOUNT_ID' : null,
    !hasValue(config.aiSearch.apiToken) ? 'NUXT_CLOUDFLARE_AI_SEARCH_API_TOKEN' : null,
    !hasValue(config.aiSearch.instanceName) && !hasValue(config.aiSearch.instanceId)
      ? 'NUXT_CLOUDFLARE_AI_SEARCH_INSTANCE_NAME or NUXT_CLOUDFLARE_AI_SEARCH_INSTANCE_ID'
      : null,
  ].filter((value): value is string => Boolean(value))

  const aiGatewayMissing = [
    !hasValue(config.aiGateway.accountId) ? 'NUXT_CLOUDFLARE_AI_GATEWAY_ACCOUNT_ID' : null,
    !hasValue(config.aiGateway.gatewayId) && !hasValue(config.aiGateway.baseUrl)
      ? 'NUXT_CLOUDFLARE_AI_GATEWAY_GATEWAY_ID or NUXT_CLOUDFLARE_AI_GATEWAY_BASE_URL'
      : null,
  ].filter((value): value is string => Boolean(value))

  const openRouterMissing = [
    !hasValue(config.openRouter.apiKey) ? 'NUXT_OPENROUTER_API_KEY' : null,
    !hasValue(config.openRouter.defaultModel) ? 'NUXT_OPENROUTER_DEFAULT_MODEL' : null,
  ].filter((value): value is string => Boolean(value))

  const schedulerMissing = [
    !hasValue(config.rag.schedulerSecret) ? 'NUXT_RAG_SCHEDULER_SECRET' : null,
  ].filter((value): value is string => Boolean(value))

  const sections = {
    aiSearch: {
      ready: aiSearchMissing.length === 0,
      missingEnvVars: aiSearchMissing,
      notes: [
        'Configuration presence only. AI Search remains disabled pending provider and corpus approval.',
      ],
    },
    aiGateway: {
      ready: aiGatewayMissing.length === 0,
      missingEnvVars: aiGatewayMissing,
      notes: [
        'Set account ID + gateway ID, or provide a full base URL override.',
        'Phase 0 only checks presence. Endpoint route shape is verified in later phases.',
      ],
    },
    openRouter: {
      ready: openRouterMissing.length === 0,
      missingEnvVars: openRouterMissing,
      notes: [
        'OpenRouter credentials are used through Cloudflare AI Gateway in the answer pipeline.',
      ],
    },
    adminAuthorization: {
      ready: true,
      missingEnvVars: [],
      notes: ['Access requires the authenticated subject and a current stored admin grant.'],
    },
    schedulerSecret: {
      ready: schedulerMissing.length === 0,
      missingEnvVars: schedulerMissing,
      notes: ['Reserved for internal scheduler/cron endpoints in Phase 2.'],
    },
  } satisfies RagPhase0Readiness['sections']

  return {
    overallReady: false,
    checkedAt: new Date().toISOString(),
    configSummary: {
      defaultTenantId: config.rag.defaultTenantId,
      aiSearch: {
        accountIdConfigured: hasValue(config.aiSearch.accountId),
        apiTokenConfigured: hasValue(config.aiSearch.apiToken),
        instanceNameConfigured: hasValue(config.aiSearch.instanceName),
        instanceIdConfigured: hasValue(config.aiSearch.instanceId),
      },
      aiGateway: {
        accountIdConfigured: hasValue(config.aiGateway.accountId),
        gatewayIdConfigured: hasValue(config.aiGateway.gatewayId),
        baseUrlConfigured: hasValue(config.aiGateway.baseUrl),
        apiTokenConfigured: hasValue(config.aiGateway.apiToken),
        resolvedBaseUrl: null,
      },
      openRouter: {
        apiKeyConfigured: hasValue(config.openRouter.apiKey),
        defaultModelConfigured: hasValue(config.openRouter.defaultModel),
        appNameConfigured: hasValue(config.openRouter.appName),
        appUrlConfigured: hasValue(config.openRouter.appUrl),
      },
      adminAuth: {
        adminUserIdsCount: 0,
        adminEmailsCount: 0,
      },
    },
    sections,
  }
}
