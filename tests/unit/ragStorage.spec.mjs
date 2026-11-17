// @vitest-environment node
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { getRagStorageMode, putRagObject } from '../../server/utils/rag-storage'

it('reports unavailable without approved hosted storage and never writes a local success', async () => {
  const keys = ['ACCOUNT_ID', 'BUCKET', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'ENDPOINT'].map(
    (key) => `NUXT_CLOUDFLARE_R2_${key}`,
  )
  const previous = keys.map((key) => process.env[key])
  try {
    for (const key of keys) delete process.env[key]
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
    await rm(join(process.cwd(), '.data/rag-r2/containment'), { recursive: true, force: true })
  }
})
