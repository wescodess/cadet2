import { describe, expect, it } from 'vitest'
import {
  createEvidenceSourceSchema,
  updateEvidenceSourceSchema,
} from '../../server/utils/admin/evidenceSourceSchema'

const website = {
  seedUrls: ['https://www.canada.ca/en.html'],
  allowedDomains: ['www.canada.ca'],
  includePatterns: [],
  excludePatterns: [],
  maxDepth: 1,
  maxPagesPerRun: 10,
  renderMode: 'static',
  respectRobots: true,
}

const submission = {
  type: 'website',
  name: 'Source boundary',
  description: 'Description',
  trustScore: 72,
  tenantId: 'default',
  enabled: true,
  tags: [],
  linkedPathwayIds: [],
  schedule: { frequency: 'manual' },
  websiteConfig: website,
}

function maximumSubmission() {
  const linkedPathwayIds: string[] = []
  const body = {
    ...submission,
    description: '甲'.repeat(4000),
    tags: Array.from({ length: 12 }, (_, index) => `${String(index)}${'甲'.repeat(118)}`),
    linkedPathwayIds,
    websiteConfig: {
      ...website,
      seedUrls: Array.from(
        { length: 130 },
        (_, index) => `https://www.canada.ca/${String(index).padStart(3, '0')}/${'p'.repeat(90)}`,
      ),
    },
  }
  while (Buffer.byteLength(JSON.stringify(body)) < 32768) {
    const remaining = 32768 - Buffer.byteLength(JSON.stringify(body))
    const overhead = body.linkedPathwayIds.length ? 3 : 2
    if (remaining < overhead + 1) {
      body.name += 'x'.repeat(remaining)
      break
    }
    const length = Math.min(120, remaining - overhead)
    body.linkedPathwayIds.push(String(body.linkedPathwayIds.length).padStart(length, 'p'))
  }
  return body
}

describe('submitted source limits', () => {
  it('rejects a duplicate-heavy config before create or update deduplicates it', () => {
    const websiteConfig = { ...website, seedUrls: Array(700).fill(website.seedUrls[0]) }
    const body = { ...submission, websiteConfig }
    expect(Buffer.byteLength(JSON.stringify(websiteConfig))).toBeGreaterThan(16384)
    expect(Buffer.byteLength(JSON.stringify(body))).toBeLessThan(32768)
    expect(createEvidenceSourceSchema.safeParse(body).success).toBe(false)
    expect(updateEvidenceSourceSchema.safeParse({ websiteConfig }).success).toBe(false)
  })

  it('checks the complete raw payload before duplicate tags and pathways disappear', () => {
    const maximum = maximumSubmission()
    const changes = {
      description: maximum.description,
      websiteConfig: maximum.websiteConfig,
      tags: Array(24).fill('甲'.repeat(120)),
      linkedPathwayIds: Array(16).fill('p'.repeat(120)),
    }
    expect(Buffer.byteLength(JSON.stringify(changes.websiteConfig))).toBeLessThan(16384)
    expect(Buffer.byteLength(JSON.stringify(changes))).toBeGreaterThan(32768)
    expect(createEvidenceSourceSchema.safeParse({ ...submission, ...changes }).success).toBe(false)
    expect(updateEvidenceSourceSchema.safeParse(changes).success).toBe(false)
  })

  it.each([
    { label: 'name', changes: { name: `${' '.repeat(256)}Source` } },
    { label: 'description', changes: { description: `${' '.repeat(4000)}x` } },
  ])('checks submitted $label limits before trimming', ({ changes }) => {
    expect(createEvidenceSourceSchema.safeParse({ ...submission, ...changes }).success).toBe(false)
    expect(updateEvidenceSourceSchema.safeParse(changes).success).toBe(false)
  })

  it('still normalizes allowed input', () => {
    const body = {
      ...submission,
      name: '  Source boundary  ',
      description: '  Description  ',
      websiteConfig: { ...website, seedUrls: [website.seedUrls[0], website.seedUrls[0]] },
    }
    const parsed = createEvidenceSourceSchema.parse(body)
    expect(parsed.name).toBe('Source boundary')
    expect(parsed.description).toBe('Description')
    expect(parsed.websiteConfig?.seedUrls).toEqual(website.seedUrls)
  })

  it('retains strict rejection of unknown fields', () => {
    expect(createEvidenceSourceSchema.safeParse({ ...submission, unknown: true }).success).toBe(
      false,
    )
    expect(updateEvidenceSourceSchema.safeParse({ name: 'Source', unknown: true }).success).toBe(
      false,
    )
  })

  it('accepts the exact complete-payload maximum and rejects the next byte', () => {
    const body = maximumSubmission()
    expect(Buffer.byteLength(JSON.stringify(body))).toBe(32768)
    expect(body.linkedPathwayIds.length).toBeLessThanOrEqual(16)
    expect(createEvidenceSourceSchema.safeParse(body).success).toBe(true)
    expect(createEvidenceSourceSchema.safeParse({ ...body, name: `${body.name}x` }).success).toBe(
      false,
    )
  })
})
