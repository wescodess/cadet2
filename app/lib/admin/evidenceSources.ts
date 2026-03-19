export type EvidenceSourceStatus = 'pending_approval' | 'approved' | 'rejected' | 'paused'
export type EvidenceSourceType = 'website' | 'youtube_channel'
export type EvidenceSourceFreshness = 'fresh' | 'stale' | 'unknown'
export type EvidenceSourceLifecycle = 'active' | 'pending' | 'paused' | 'rejected'
export type EvidenceSourceScheduleFrequency = 'daily' | 'manual' | 'interval'

export type EvidenceSourceSchedule = {
  frequency: EvidenceSourceScheduleFrequency
  intervalHours?: number
}

export type EvidenceWebsiteConfig = {
  seedUrls: string[]
  allowedDomains: string[]
  includePatterns: string[]
  excludePatterns: string[]
  maxDepth: number
  maxPagesPerRun: number
  renderMode: 'static' | 'rendered'
  requestHeadersRef?: string
  respectRobots: boolean
}

export type EvidenceYoutubeConfig = {
  channelId: string
  channelUrl: string
  maxVideosPerRun: number
  includeShorts: boolean
  preferredLanguage?: string
}

export type EvidenceSourceRecord = {
  id: string
  createdAt: number
  type: EvidenceSourceType
  status: EvidenceSourceStatus
  lifecycleStatus: EvidenceSourceLifecycle
  freshness: EvidenceSourceFreshness
  name: string
  description: string | null
  tenantId: string
  tags: string[]
  linkedPathwayIds: string[]
  trustScore: number
  createdByUserId: string
  createdByEmail: string | null
  approvedAt: number | null
  rejectedAt: number | null
  rejectionReason: string | null
  enabled: boolean
  schedule: EvidenceSourceSchedule
  crawlConfig: Record<string, unknown>
  lastRunAt: number | null
  lastSuccessAt: number | null
  lastFailureAt: number | null
  lastFailureReason: string | null
  nextRunAt: number | null
}

export type EvidenceSourceAuditRecord = {
  id: string
  action: 'submit' | 'approve' | 'reject' | 'pause' | 'resume' | 'edit'
  timestamp: number
  actorUserId: string
  actorEmail: string | null
  reason: string | null
  note: string | null
  diffSummary: string | null
}

export type EvidenceSourceDetailRecord = {
  currentUserIsAdmin: boolean
  source: EvidenceSourceRecord
  audit: EvidenceSourceAuditRecord[]
}

export type EvidenceSourceDraft = {
  type: EvidenceSourceType
  name: string
  description: string
  trustScore: number
  linkedPathwayIds: string[]
  tenantId: string
  tagsText: string
  frequency: EvidenceSourceScheduleFrequency
  intervalHours: number
  enabled: boolean
  websiteSeedUrls: string
  websiteAllowedDomains: string
  websiteIncludePatterns: string
  websiteExcludePatterns: string
  websiteMaxDepth: number
  websiteMaxPagesPerRun: number
  websiteRenderMode: 'static' | 'rendered'
  websiteRequestHeadersRef: string
  websiteRespectRobots: boolean
  youtubeChannelId: string
  youtubeChannelUrl: string
  youtubeMaxVideosPerRun: number
  youtubeIncludeShorts: boolean
  youtubePreferredLanguage: string
}

export const evidenceSourceTestIds = {
  list: 'admin-evidence-source-list',
  detail: 'admin-evidence-source-detail',
  addButton: 'admin-evidence-source-add-button',
  pauseButton: 'admin-evidence-source-pause-button',
} as const

export function createEmptyEvidenceSourceDraft(): EvidenceSourceDraft {
  return {
    type: 'website',
    name: '',
    description: '',
    trustScore: 72,
    linkedPathwayIds: [],
    tenantId: 'default',
    tagsText: '',
    frequency: 'daily',
    intervalHours: 24,
    enabled: true,
    websiteSeedUrls: 'https://example.com/docs',
    websiteAllowedDomains: 'example.com',
    websiteIncludePatterns: '**/docs/**',
    websiteExcludePatterns: '',
    websiteMaxDepth: 3,
    websiteMaxPagesPerRun: 200,
    websiteRenderMode: 'static',
    websiteRequestHeadersRef: '',
    websiteRespectRobots: true,
    youtubeChannelId: '',
    youtubeChannelUrl: '',
    youtubeMaxVideosPerRun: 24,
    youtubeIncludeShorts: false,
    youtubePreferredLanguage: '',
  }
}

export function createEvidenceSourceDraftFromRecord(source: EvidenceSourceRecord): EvidenceSourceDraft {
  const crawlConfig = source.crawlConfig || {}

  return {
    type: source.type,
    name: source.name,
    description: source.description || '',
    trustScore: source.trustScore,
    linkedPathwayIds: [...source.linkedPathwayIds],
    tenantId: source.tenantId,
    tagsText: source.tags.join(', '),
    frequency: source.schedule.frequency,
    intervalHours: source.schedule.intervalHours ?? 24,
    enabled: source.enabled,
    websiteSeedUrls: Array.isArray(crawlConfig.seedUrls) ? crawlConfig.seedUrls.join(', ') : '',
    websiteAllowedDomains: Array.isArray(crawlConfig.allowedDomains) ? crawlConfig.allowedDomains.join(', ') : '',
    websiteIncludePatterns: Array.isArray(crawlConfig.includePatterns) ? crawlConfig.includePatterns.join(', ') : '',
    websiteExcludePatterns: Array.isArray(crawlConfig.excludePatterns) ? crawlConfig.excludePatterns.join(', ') : '',
    websiteMaxDepth: typeof crawlConfig.maxDepth === 'number' ? crawlConfig.maxDepth : 3,
    websiteMaxPagesPerRun: typeof crawlConfig.maxPagesPerRun === 'number' ? crawlConfig.maxPagesPerRun : 200,
    websiteRenderMode: crawlConfig.renderMode === 'rendered' ? 'rendered' : 'static',
    websiteRequestHeadersRef: typeof crawlConfig.requestHeadersRef === 'string' ? crawlConfig.requestHeadersRef : '',
    websiteRespectRobots: crawlConfig.respectRobots !== false,
    youtubeChannelId: typeof crawlConfig.channelId === 'string' ? crawlConfig.channelId : '',
    youtubeChannelUrl: typeof crawlConfig.channelUrl === 'string' ? crawlConfig.channelUrl : '',
    youtubeMaxVideosPerRun: typeof crawlConfig.maxVideosPerRun === 'number' ? crawlConfig.maxVideosPerRun : 24,
    youtubeIncludeShorts: crawlConfig.includeShorts === true,
    youtubePreferredLanguage: typeof crawlConfig.preferredLanguage === 'string' ? crawlConfig.preferredLanguage : '',
  }
}

export function formatEvidenceStatus(status: EvidenceSourceLifecycle | EvidenceSourceStatus | EvidenceSourceFreshness) {
  if (status === 'approved') {
    return 'Approved'
  }

  if (status === 'pending_approval') {
    return 'Pending'
  }

  return status
    .split('_')
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}
