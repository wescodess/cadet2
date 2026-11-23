import { describe, expect, it } from 'vitest'

import { relaySpecimenPage } from '~~/modules/relay-specimen'

describe('the development Relay specimen route', () => {
  it('forces the light page theme, so a stored or system dark theme cannot reach the light panels', () => {
    expect(relaySpecimenPage).toMatchObject({
      path: '/dev/relay',
      meta: { colorMode: 'light' },
    })
  })
})
