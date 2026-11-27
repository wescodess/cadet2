import { describe, expect, it } from 'vitest'
import { cn } from '~/lib/utils'

describe('cn with the Relay theme', () => {
  it('keeps a Relay type style beside a text colour', () => {
    expect(cn('text-small text-muted-foreground')).toBe('text-small text-muted-foreground')
    expect(cn('text-chip text-role-ink')).toBe('text-chip text-role-ink')
  })

  it('lets a Relay type style replace a stock size', () => {
    expect(cn('text-xs', 'text-label')).toBe('text-label')
  })

  it('lets Relay radii, heights and padding replace stock ones', () => {
    expect(cn('rounded-full', 'rounded-chip')).toBe('rounded-chip')
    expect(cn('rounded-md', 'rounded-panel')).toBe('rounded-panel')
    expect(cn('h-9', 'h-control')).toBe('h-control')
    expect(cn('p-2', 'p-pad')).toBe('p-pad')
  })

  it('lets a later leading, row height or spinner replace a Relay one', () => {
    expect(cn('leading-small', 'leading-6')).toBe('leading-6')
    expect(cn('leading-normal', 'leading-small')).toBe('leading-small')
    expect(cn('min-h-12', 'min-h-check-row')).toBe('min-h-check-row')
    expect(cn('min-h-check-row', 'min-h-12')).toBe('min-h-12')
    expect(cn('animate-spin', 'animate-spin-busy')).toBe('animate-spin-busy')
    expect(cn('animate-spin-save', 'animate-spin-busy')).toBe('animate-spin-busy')
  })
})
