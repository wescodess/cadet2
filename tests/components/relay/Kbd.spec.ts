import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { Kbd } from '~/components/ui/kbd'

describe('Keyboard hint', () => {
  it('sets the hint at 12 px and 500 on a muted chip with a hairline, never dimmed', () => {
    const classes = mount(Kbd, { slots: { default: 'C' } }).classes()
    expect(classes).toEqual(
      expect.arrayContaining([
        'text-xs',
        'font-medium',
        'h-4.5',
        'min-w-4.5',
        'rounded-md',
        'border',
        'border-border',
        'bg-muted',
        'text-muted-foreground',
      ]),
    )
    expect(classes.some((name) => name.startsWith('opacity-'))).toBe(false)
  })

  it('takes the label colour inside the primary button', () => {
    expect(mount(Kbd, { slots: { default: '⌘' } }).classes()).toEqual(
      expect.arrayContaining([
        'on-primary:bg-transparent',
        'on-primary:text-current',
        'on-primary:border-primary-foreground/45',
      ]),
    )
  })
})
