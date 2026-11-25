// @vitest-environment node
import { expect, it } from 'vitest'
import { ConvexError } from 'convex/values'
import { throwSourceError } from '../../server/utils/admin/sourceError'

function mappedError(error: unknown) {
  try {
    throwSourceError(error)
  } catch (caught) {
    return caught
  }
}

it('maps the structured YouTube freeze to a stable recoverable conflict', () => {
  expect(
    mappedError(new ConvexError({ code: 'YOUTUBE_FROZEN', message: 'private detail' })),
  ).toMatchObject({
    statusCode: 409,
    statusMessage: 'YouTube source actions are frozen',
    data: { code: 'YOUTUBE_FROZEN' },
  })
})

it('preserves the existing create-receipt conflict', () => {
  expect(mappedError(new ConvexError({ code: 'IDEMPOTENCY_CONFLICT' }))).toMatchObject({
    statusCode: 409,
    statusMessage: 'Idempotency key was already used with a different payload',
  })
})

it('does not classify plain errors, forged objects or unrelated Convex errors as a freeze', () => {
  for (const error of [
    new Error('YOUTUBE_FROZEN'),
    { data: { code: 'YOUTUBE_FROZEN' } },
    new ConvexError('YOUTUBE_FROZEN'),
    new ConvexError({ code: 'OTHER' }),
    new ConvexError(null),
  ]) {
    expect(mappedError(error)).toBe(error)
  }
})
