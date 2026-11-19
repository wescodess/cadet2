// @vitest-environment node
import { expect, it } from 'vitest'
import { createAdminOperation } from '../../app/lib/admin/createOperation'

it('keeps the operation key through a lost response and renews it for a new operation', () => {
  const operation = createAdminOperation()
  const first = operation.headers({ name: 'Official source' })
  expect(operation.headers({ name: 'Official source' })).toEqual(first)
  expect(operation.headers({ name: 'Changed source' })).not.toEqual(first)
  const changed = operation.headers({ name: 'Changed source' })
  operation.complete()
  expect(operation.headers({ name: 'Changed source' })).not.toEqual(changed)
})
