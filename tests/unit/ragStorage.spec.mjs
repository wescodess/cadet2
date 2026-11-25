// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { getRagStorageMode, putRagObject } from '../../server/utils/rag-storage'

it('reports unavailable without approved hosted storage and never writes a local success', async () => {
  const keys = ['ACCOUNT_ID', 'BUCKET', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'ENDPOINT'].map(
    (key) => `NUXT_CLOUDFLARE_R2_${key}`,
  )
  const previous = keys.map((key) => process.env[key])
  const previousLocalDirectory = process.env.NUXT_RAG_LOCAL_R2_DIR
  const directory = await mkdtemp(join(tmpdir(), 'cadet2-storage-'))
  try {
    for (const key of keys) delete process.env[key]
    process.env.NUXT_RAG_LOCAL_R2_DIR = directory
    await expect(
      putRagObject({
        key: 'containment/synthetic.md',
        body: 'Synthetic public information',
        contentType: 'text/markdown',
      }),
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(getRagStorageMode()).toBe('unavailable')
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key]
      else process.env[key] = previous[index]
    })
    if (previousLocalDirectory === undefined) delete process.env.NUXT_RAG_LOCAL_R2_DIR
    else process.env.NUXT_RAG_LOCAL_R2_DIR = previousLocalDirectory
    await rm(directory, { recursive: true, force: true })
  }
})
