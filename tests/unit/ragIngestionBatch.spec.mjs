// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  prepareManualBatchAsNuxtAdmin,
  prepareScheduledBatch,
  runManualBatchAsNuxtAdmin,
  runScheduledBatch,
} from '../../convex/ragIngestionInternal'

const now = 1_800_000_000_000
const website = {
  _id: 'sources:website',
  _creationTime: now - 100,
  type: 'website',
  status: 'approved',
  enabled: true,
  tenantId: 'synthetic',
  nextRunAt: now - 1,
  schedule: { frequency: 'daily' },
}
const entries = [
  {
    name: 'manual prepare',
    registration: prepareManualBatchAsNuxtAdmin,
    trigger: 'manual',
    mode: 'prepare',
  },
  {
    name: 'scheduled prepare',
    registration: prepareScheduledBatch,
    trigger: 'scheduled',
    mode: 'prepare',
  },
  {
    name: 'manual process',
    registration: runManualBatchAsNuxtAdmin,
    trigger: 'manual',
    mode: 'process',
  },
  {
    name: 'scheduled process',
    registration: runScheduledBatch,
    trigger: 'scheduled',
    mode: 'process',
  },
]

function fixture({ sources = [website], batches = [], runs = [], hideResult = false, mode } = {}) {
  vi.spyOn(Date, 'now').mockReturnValue(now)
  const tables = {
    sources: globalThis.structuredClone(sources),
    ingestion_batches: globalThis.structuredClone(batches),
    source_runs: globalThis.structuredClone(runs),
  }
  let sequence = 0
  const lookup = (id) =>
    Object.values(tables)
      .flat()
      .find((row) => row._id === id)
  const db = {
    get: vi.fn(async (id) => {
      const row = lookup(id)
      if (
        hideResult &&
        id.startsWith('ingestion_batches:new:') &&
        (mode === 'prepare' || row?.finishedAt)
      )
        return null
      return globalThis.structuredClone(row ?? null)
    }),
    insert: vi.fn(async (table, value) => {
      const id = `${table}:new:${++sequence}`
      tables[table].push({
        ...globalThis.structuredClone(value),
        _id: id,
        _creationTime: now + sequence,
      })
      return id
    }),
    patch: vi.fn(async (id, value) => {
      Object.assign(lookup(id), globalThis.structuredClone(value))
    }),
    query: (table) => {
      const criteria = []
      const query = {
        eq: (field, value) => {
          criteria.push([field, value])
          return query
        },
      }
      const result = {
        withIndex: (_name, select) => {
          select(query)
          return result
        },
        collect: async () =>
          globalThis.structuredClone(
            tables[table].filter((row) => criteria.every(([field, value]) => row[field] === value)),
          ),
      }
      return result
    },
  }
  return { ctx: { db }, db, tables }
}

function argumentsFor(trigger, extra = {}) {
  return {
    idempotencyKey: '  synthetic-batch  ',
    scheduledFor: now - 20,
    ...(trigger === 'manual'
      ? { actorUserId: 'operator', actorEmail: ' OPERATOR@EXAMPLE.TEST ' }
      : {}),
    ...extra,
  }
}

function existing(status = 'queued', extra = {}) {
  return {
    _id: 'ingestion_batches:existing',
    _creationTime: now - 10,
    idempotencyKey: 'synthetic-batch',
    status,
    dueSourceIds: [website._id],
    sourceCount: 1,
    summary: {},
    ...extra,
  }
}

afterEach(() => vi.restoreAllMocks())

describe.each(entries)('$name batch creation', ({ registration, trigger, mode }) => {
  it('preserves due-source selection, metadata and the queue or processing outcome', async () => {
    const future = { ...website, _id: 'sources:future', nextRunAt: now + 100 }
    const setup = fixture({
      sources: [
        website,
        future,
        { ...website, _id: 'sources:youtube', type: 'youtube_channel' },
        { ...website, _id: 'sources:disabled', enabled: false },
        { ...website, _id: 'sources:pending', status: 'pending' },
      ],
    })
    const result = await registration._handler(setup.ctx, argumentsFor(trigger))
    expect(result).toMatchObject({
      ok: true,
      reused: false,
      reuseReason: 'created',
      status: mode === 'prepare' ? 'queued' : 'failed',
      sourceCount: 1,
      idempotencyKey: 'synthetic-batch',
    })
    expect(setup.tables.ingestion_batches).toHaveLength(1)
    expect(setup.tables.ingestion_batches[0]).toMatchObject({
      trigger,
      scheduledFor: now - 20,
      dueSourceIds: [website._id],
      requestedByUserId: trigger === 'manual' ? 'operator' : undefined,
      requestedByEmail: trigger === 'manual' ? 'operator@example.test' : undefined,
    })
    expect(setup.tables.source_runs).toHaveLength(1)
    const run = setup.tables.source_runs[0]
    expect(run).toMatchObject({ sourceId: website._id, trigger, status: result.status })
    if (mode === 'process') {
      expect(run.errors).toEqual([
        {
          code: 'adapter_not_implemented',
          message: 'Adapter not implemented for source type "website" (Phase 2 scaffold)',
          retryable: false,
          timestamp: now,
        },
      ])
      expect(result.summary.sourcesFailed).toBe(1)
      expect(setup.tables.sources[0]).toMatchObject({ lastFailureAt: now, lastRunAt: now })
    } else {
      expect(run.errors).toEqual([])
      expect(setup.db.patch).not.toHaveBeenCalled()
    }
    expect(setup.tables.sources[1]).toEqual(future)
  })

  it('rejects a blank receipt key before any write', async () => {
    const setup = fixture()
    await expect(
      registration._handler(setup.ctx, argumentsFor(trigger, { idempotencyKey: '   ' })),
    ).rejects.toThrow('idempotencyKey is required')
    expect(setup.db.insert).not.toHaveBeenCalled()
    expect(setup.db.patch).not.toHaveBeenCalled()
  })

  it.each(['queued', 'completed'])('reuses the latest %s batch without writes', async (status) => {
    const latest = existing(status)
    const setup = fixture({
      batches: [
        existing('failed', { _id: 'ingestion_batches:older', _creationTime: now - 100 }),
        latest,
      ],
    })
    const result = await registration._handler(setup.ctx, argumentsFor(trigger))
    expect(result).toMatchObject({
      batchId: latest._id,
      status,
      reused: true,
      reuseReason: status === 'queued' ? 'active' : 'terminal',
    })
    expect(setup.db.insert).not.toHaveBeenCalled()
    expect(setup.db.patch).not.toHaveBeenCalled()
  })

  it('creates a new batch when force is set and the existing source remains allowed', async () => {
    const prior = existing()
    const setup = fixture({ batches: [prior] })
    const result = await registration._handler(setup.ctx, argumentsFor(trigger, { force: true }))
    expect(result).toMatchObject({ reused: false, reuseReason: 'created', sourceCount: 1 })
    expect(result.batchId).not.toBe(prior._id)
    expect(setup.tables.ingestion_batches[0]).toEqual(prior)
  })

  it.each([
    { name: 'missing', source: null, error: 'Source unavailable' },
    {
      name: 'YouTube',
      source: { ...website, type: 'youtube_channel' },
      error: 'YouTube ingestion is frozen',
    },
    {
      name: 'disabled',
      source: { ...website, enabled: false },
      error: 'Source is not approved and enabled',
    },
    {
      name: 'unapproved',
      source: { ...website, status: 'pending' },
      error: 'Source is not approved and enabled',
    },
  ])('rejects an existing batch with a $name source even with force', async ({ source, error }) => {
    const setup = fixture({ sources: source ? [source] : [], batches: [existing()] })
    await expect(
      registration._handler(setup.ctx, argumentsFor(trigger, { force: true })),
    ).rejects.toThrow(error)
    expect(setup.db.insert).not.toHaveBeenCalled()
    expect(setup.db.patch).not.toHaveBeenCalled()
  })

  it('checks sources recorded only by an existing run before reusing its batch', async () => {
    const setup = fixture({
      sources: [{ ...website, type: 'youtube_channel' }],
      batches: [existing('queued', { dueSourceIds: [] })],
      runs: [
        { _id: 'source_runs:old', batchId: 'ingestion_batches:existing', sourceId: website._id },
      ],
    })
    await expect(registration._handler(setup.ctx, argumentsFor(trigger))).rejects.toThrow(
      'YouTube ingestion is frozen',
    )
    expect(setup.db.insert).not.toHaveBeenCalled()
    expect(setup.db.patch).not.toHaveBeenCalled()
  })

  it('retains the empty-batch outcome when no source is due', async () => {
    const setup = fixture({ sources: [{ ...website, nextRunAt: now + 1 }] })
    const result = await registration._handler(setup.ctx, argumentsFor(trigger))
    expect(result).toMatchObject({
      reused: false,
      sourceCount: 0,
      status: mode === 'prepare' ? 'queued' : 'completed',
    })
    expect(setup.tables.source_runs).toEqual([])
  })

  it('preserves the distinct error when the final batch cannot be read', async () => {
    const setup = fixture({ hideResult: true, mode })
    await expect(registration._handler(setup.ctx, argumentsFor(trigger))).rejects.toThrow(
      `Failed to load ${mode === 'prepare' ? 'prepared' : 'processed'} batch`,
    )
  })
})

describe.each(entries.filter(({ trigger }) => trigger === 'manual'))(
  '$name source selection',
  ({ registration, trigger }) => {
    it('admits an explicitly selected future website without changing the due-date rule for implicit selection', async () => {
      const future = { ...website, nextRunAt: now + 100 }
      const setup = fixture({ sources: [future] })
      const result = await registration._handler(
        setup.ctx,
        argumentsFor(trigger, { sourceIds: [future._id] }),
      )
      expect(result).toMatchObject({ sourceCount: 1, reused: false })
    })

    it.each([
      { source: null, error: 'No approved + enabled sources matched the requested sourceIds' },
      {
        source: { ...website, enabled: false },
        error: 'No approved + enabled sources matched the requested sourceIds',
      },
      { source: { ...website, type: 'youtube_channel' }, error: 'YouTube ingestion is frozen' },
    ])('rejects unavailable explicit selection with $error', async ({ source, error }) => {
      const setup = fixture({ sources: source ? [source] : [] })
      await expect(
        registration._handler(setup.ctx, argumentsFor(trigger, { sourceIds: [website._id] })),
      ).rejects.toThrow(error)
      expect(setup.db.insert).not.toHaveBeenCalled()
      expect(setup.db.patch).not.toHaveBeenCalled()
    })
  },
)
