// @vitest-environment node
import { expect, it } from 'vitest'
import { createAdminOperation } from '../../app/lib/admin/createOperation'
import { changedSourceFields } from '../../app/lib/admin/sourceChanges'

it('keeps the operation key through a lost response and renews it for a new operation', () => {
  const operation = createAdminOperation()
  const first = operation.headers({ name: 'Official source' })
  expect(operation.headers({ name: 'Official source' })).toEqual(first)
  expect(operation.headers({ name: 'Changed source' })).not.toEqual(first)
  const changed = operation.headers({ name: 'Changed source' })
  operation.complete()
  expect(operation.headers({ name: 'Changed source' })).not.toEqual(changed)
})

it('omits unchanged oversized legacy fields while preserving explicit edits', () => {
  const initial = {
    name: 'Legacy',
    description: 'd'.repeat(600000),
    enabled: false,
    websiteConfig: {
      seedUrls: ['https://example.test/' + 'x'.repeat(20000)],
      allowedDomains: ['example.test'],
    },
  }
  const current = {
    ...initial,
    name: 'Edited',
    websiteConfig: {
      allowedDomains: ['example.test'],
      seedUrls: [...initial.websiteConfig.seedUrls],
    },
  }
  expect(changedSourceFields(current, initial)).toEqual({ name: 'Edited' })
  expect(
    changedSourceFields({ ...current, enabled: true, description: 'Replaced' }, initial),
  ).toEqual({ name: 'Edited', description: 'Replaced', enabled: true })
  expect(changedSourceFields(initial, initial)).toEqual({})
})
