import { z } from 'zod'
import { hasControlCharacters } from '../../../convex/lib/sourceText'

export const evidenceSourceStatusValues = [
  'pending_approval',
  'approved',
  'rejected',
  'paused',
] as const
export const evidenceSourceTypeValues = ['website', 'youtube_channel'] as const
export const evidenceSourceScheduleFrequencyValues = ['daily', 'manual', 'interval'] as const
export const evidenceSourceFreshnessValues = ['fresh', 'stale', 'unknown'] as const
export const evidenceSourceLifecycleValues = ['active', 'pending', 'paused', 'rejected'] as const

const nullableTrimmedStringSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}, z.string().max(4000).nullable())

const timestampSchema = z
  .number()
  .finite()
  .nonnegative()
  .transform((value) => Math.round(value))

function controlFreeString(schema: z.ZodString) {
  return z
    .string()
    .refine((value) => !hasControlCharacters(value), 'Control characters are not allowed')
    .pipe(schema)
}

function createTrimmedStringArraySchema(options?: {
  min?: number
  max?: number
  controlFree?: boolean
}) {
  const item = z.string().trim().min(1).max(120)
  let schema = z.array(options?.controlFree ? controlFreeString(item) : item)

  if (typeof options?.min === 'number') {
    schema = schema.min(options.min)
  }

  if (typeof options?.max === 'number') {
    schema = schema.max(options.max)
  }

  return schema.transform((values) => [...new Set(values)])
}

export const evidenceSourceStatusSchema = z.enum(evidenceSourceStatusValues)
export const evidenceSourceTypeSchema = z.enum(evidenceSourceTypeValues)
export const evidenceSourceFreshnessSchema = z.enum(evidenceSourceFreshnessValues)
export const evidenceSourceLifecycleSchema = z.enum(evidenceSourceLifecycleValues)

export const evidenceSourceScheduleSchema = z
  .object({
    frequency: z.enum(evidenceSourceScheduleFrequencyValues),
    intervalHours: z.number().int().min(1).max(168).optional(),
  })
  .strict()

export const evidenceWebsiteConfigSchema = z
  .object({
    seedUrls: createTrimmedStringArraySchema({ min: 1, controlFree: true }),
    allowedDomains: createTrimmedStringArraySchema({ min: 1, controlFree: true }),
    includePatterns: createTrimmedStringArraySchema({ controlFree: true }).default([]),
    excludePatterns: createTrimmedStringArraySchema({ controlFree: true }).default([]),
    maxDepth: z.number().int().min(0).max(10),
    maxPagesPerRun: z.number().int().min(1).max(5000),
    renderMode: z.enum(['static', 'rendered']),
    requestHeadersRef: controlFreeString(z.string().trim().min(1).max(255)).optional(),
    respectRobots: z.boolean(),
  })
  .strict()

export const evidenceYoutubeConfigSchema = z
  .object({
    channelId: controlFreeString(z.string().trim().min(1).max(255)),
    channelUrl: controlFreeString(z.string().trim().url()),
    maxVideosPerRun: z.number().int().min(1).max(200),
    includeShorts: z.boolean(),
    preferredLanguage: controlFreeString(z.string().trim().min(1).max(40)).optional(),
  })
  .strict()

const evidenceSourceEditableFieldsSchema = {
  name: controlFreeString(z.string().trim().min(1).max(255)).optional(),
  description: nullableTrimmedStringSchema.optional(),
  trustScore: z.number().int().min(0).max(100).optional(),
  tenantId: z.string().trim().min(1).max(120).optional(),
  linkedPathwayIds: createTrimmedStringArraySchema({ max: 16 }).optional(),
  tags: createTrimmedStringArraySchema({ max: 24 }).optional(),
  schedule: evidenceSourceScheduleSchema.optional(),
  enabled: z.boolean().optional(),
  websiteConfig: evidenceWebsiteConfigSchema.optional(),
  youtubeConfig: evidenceYoutubeConfigSchema.optional(),
}

export const createEvidenceSourceSchema = z
  .object({
    type: evidenceSourceTypeSchema,
    name: controlFreeString(z.string().trim().min(1).max(255)),
    description: nullableTrimmedStringSchema.optional(),
    trustScore: z.number().int().min(0).max(100).default(72),
    linkedPathwayIds: createTrimmedStringArraySchema({ max: 16 }).default([]),
    tenantId: z.string().trim().min(1).max(120).default('default'),
    tags: createTrimmedStringArraySchema({ max: 24 }).default([]),
    schedule: evidenceSourceScheduleSchema,
    websiteConfig: evidenceWebsiteConfigSchema.optional(),
    youtubeConfig: evidenceYoutubeConfigSchema.optional(),
    enabled: z.boolean().default(true),
  })
  .strict()

export const updateEvidenceSourceSchema = z
  .object(evidenceSourceEditableFieldsSchema)
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one editable field is required.',
  })

const optionalNoteSchema = z
  .object({
    note: z.string().trim().min(1).max(500).optional(),
  })
  .strict()

export const approveEvidenceSourceActionSchema = z
  .object({
    enabled: z.boolean().optional(),
    schedule: evidenceSourceScheduleSchema.optional(),
    note: z.string().trim().min(1).max(500).optional(),
  })
  .strict()

export const pauseEvidenceSourceActionSchema = optionalNoteSchema
export const resumeEvidenceSourceActionSchema = optionalNoteSchema

export const rejectEvidenceSourceActionSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict()

export const evidenceSourceListQuerySchema = z
  .object({
    showOnlyMine: z
      .union([z.literal('0'), z.literal('1'), z.literal('true'), z.literal('false')])
      .optional(),
    status: evidenceSourceStatusSchema.optional(),
    type: evidenceSourceTypeSchema.optional(),
    tenantId: z.string().trim().min(1).max(120).optional(),
  })
  .strict()

export const evidenceSourceAuditRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    action: z.enum(['submit', 'approve', 'reject', 'pause', 'resume', 'edit']),
    timestamp: timestampSchema,
    actorUserId: z.string().trim().min(1),
    actorEmail: z.string().trim().email().nullable(),
    reason: z.string().trim().min(1).nullable(),
    note: z.string().trim().min(1).nullable(),
    diffSummary: z.string().trim().min(1).nullable(),
  })
  .strict()

export const evidenceSourceRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    createdAt: timestampSchema,
    type: evidenceSourceTypeSchema,
    status: evidenceSourceStatusSchema,
    lifecycleStatus: evidenceSourceLifecycleSchema,
    freshness: evidenceSourceFreshnessSchema,
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).nullable(),
    tenantId: z.string().trim().min(1),
    tags: createTrimmedStringArraySchema(),
    linkedPathwayIds: createTrimmedStringArraySchema(),
    trustScore: z.number().int().min(0).max(100),
    createdByUserId: z.string().trim().min(1),
    createdByEmail: z.string().trim().email().nullable(),
    approvedAt: timestampSchema.nullable(),
    rejectedAt: timestampSchema.nullable(),
    rejectionReason: z.string().trim().min(1).nullable(),
    enabled: z.boolean(),
    schedule: evidenceSourceScheduleSchema,
    crawlConfig: z.record(z.string(), z.unknown()),
    lastRunAt: timestampSchema.nullable(),
    lastSuccessAt: timestampSchema.nullable(),
    lastFailureAt: timestampSchema.nullable(),
    lastFailureReason: z.string().trim().min(1).nullable(),
    nextRunAt: timestampSchema.nullable(),
  })
  .strict()

export const evidenceSourceDetailSchema = z
  .object({
    currentUserIsAdmin: z.boolean(),
    source: evidenceSourceRecordSchema,
    audit: z.array(evidenceSourceAuditRecordSchema),
  })
  .strict()

type RawEvidenceSource = {
  _id: string
  _creationTime: number
  type: 'website' | 'youtube_channel'
  status: 'pending_approval' | 'approved' | 'rejected' | 'paused'
  name: string
  description?: string | null
  tenantId: string
  tags: string[]
  linkedPathwayIds?: string[]
  trustScore?: number
  createdByUserId: string
  createdByEmail?: string
  approvedAt?: number
  rejectedAt?: number
  rejectionReason?: string
  enabled: boolean
  schedule: { frequency: 'daily' | 'manual' | 'interval'; intervalHours?: number }
  crawlConfig: Record<string, unknown>
  lastRunAt?: number
  lastSuccessAt?: number
  lastFailureAt?: number
  lastFailureReason?: string
  nextRunAt?: number
}

type RawEvidenceAudit = {
  _id: string
  action: 'submit' | 'approve' | 'reject' | 'pause' | 'resume' | 'edit'
  timestamp: number
  actorUserId: string
  actorEmail?: string
  reason?: string
  note?: string
  diffSummary?: string
}

export function deriveEvidenceFreshness(source: RawEvidenceSource) {
  if (typeof source.lastSuccessAt === 'number') {
    const ageMs = Date.now() - source.lastSuccessAt
    return ageMs > 1000 * 60 * 60 * 24 * 14 ? 'stale' : 'fresh'
  }

  if (source.status === 'approved') {
    const ageMs = Date.now() - source._creationTime
    return ageMs > 1000 * 60 * 60 * 24 * 7 ? 'stale' : 'unknown'
  }

  return 'unknown'
}

export function deriveEvidenceLifecycleStatus(source: RawEvidenceSource) {
  if (source.status === 'approved') {
    return 'active'
  }

  if (source.status === 'pending_approval') {
    return 'pending'
  }

  if (source.status === 'paused') {
    return 'paused'
  }

  return 'rejected'
}

export function toEvidenceSourceRecord(source: RawEvidenceSource) {
  return evidenceSourceRecordSchema.parse({
    id: source._id,
    createdAt: source._creationTime,
    type: source.type,
    status: source.status,
    lifecycleStatus: deriveEvidenceLifecycleStatus(source),
    freshness: deriveEvidenceFreshness(source),
    name: source.name,
    description:
      typeof source.description === 'string' && source.description.trim().length > 0
        ? source.description.trim()
        : null,
    tenantId: source.tenantId,
    tags: source.tags || [],
    linkedPathwayIds: source.linkedPathwayIds || [],
    trustScore:
      typeof source.trustScore === 'number' && Number.isFinite(source.trustScore)
        ? Math.max(0, Math.min(100, Math.round(source.trustScore)))
        : 72,
    createdByUserId: source.createdByUserId,
    createdByEmail: source.createdByEmail || null,
    approvedAt: source.approvedAt ?? null,
    rejectedAt: source.rejectedAt ?? null,
    rejectionReason: source.rejectionReason || null,
    enabled: source.enabled,
    schedule: source.schedule,
    crawlConfig: source.crawlConfig || {},
    lastRunAt: source.lastRunAt ?? null,
    lastSuccessAt: source.lastSuccessAt ?? null,
    lastFailureAt: source.lastFailureAt ?? null,
    lastFailureReason: source.lastFailureReason || null,
    nextRunAt: source.nextRunAt ?? null,
  })
}

export function toEvidenceAuditRecord(audit: RawEvidenceAudit) {
  return evidenceSourceAuditRecordSchema.parse({
    id: audit._id,
    action: audit.action,
    timestamp: audit.timestamp,
    actorUserId: audit.actorUserId,
    actorEmail: audit.actorEmail || null,
    reason: audit.reason || null,
    note: audit.note || null,
    diffSummary: audit.diffSummary || null,
  })
}

export type EvidenceSourceRecord = z.infer<typeof evidenceSourceRecordSchema>
export type EvidenceSourceDetailRecord = z.infer<typeof evidenceSourceDetailSchema>
export type CreateEvidenceSourceInput = z.infer<typeof createEvidenceSourceSchema>
export type UpdateEvidenceSourceInput = z.infer<typeof updateEvidenceSourceSchema>
export type ApproveEvidenceSourceActionInput = z.infer<typeof approveEvidenceSourceActionSchema>
export type PauseEvidenceSourceActionInput = z.infer<typeof pauseEvidenceSourceActionSchema>
export type ResumeEvidenceSourceActionInput = z.infer<typeof resumeEvidenceSourceActionSchema>
export type RejectEvidenceSourceActionInput = z.infer<typeof rejectEvidenceSourceActionSchema>
