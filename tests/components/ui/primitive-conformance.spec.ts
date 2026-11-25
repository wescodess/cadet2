import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

import { Accordion, AccordionItem, AccordionTrigger } from '~/components/ui/accordion'
import { Checkbox } from '~/components/ui/checkbox'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '~/components/ui/navigation-menu'
import { NativeSelect } from '~/components/ui/native-select'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import ResizableHandle from '~/components/ui/resizable/ResizableHandle.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import Slider from '~/components/ui/slider/Slider.vue'
import { Spinner } from '~/components/ui/spinner'
import { Textarea } from '~/components/ui/textarea'
import SharedControlsSpecimen from '~/specimen/SharedControlsSpecimen.vue'
import SpecimenPanel from '~/specimen/SpecimenPanel.vue'

import { appBlocks, recordBlocks, repoPath } from '../../unit/design/css-source'

const interfaceIconStroke = '1.75'
const radioDotShare = 0.5
const lucideGrid = 24
const interfaceIconRange = { min: 15, max: 18 }
const approvedIconSize = 16
const invalidHalo = '0 0 0 3px color-mix(in srgb, var(--destructive) 18%, transparent)'
const checkRow = { client: '44px', representative: '24px' }
const tailwindSpacing = 4

const relay = readFileSync(repoPath('app/assets/css/relay.css'), 'utf8')
const darkPopover = { '--popover': '#23262D', '--popover-foreground': '#E8EAEE' }
const themeBlocks = [...appBlocks()].filter(([selector]) => !selector.startsWith('@'))

function utility(name: string) {
  const start = relay.indexOf(`@utility ${name} {`)
  if (start < 0) throw new Error(`Missing @utility ${name}`)
  const next = relay.indexOf('\n@utility ', start + 1)
  return relay.slice(start, next < 0 ? undefined : next)
}

const attachTo = document.body

const passthrough = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h('div', slots.default?.()),
})

const openSelect = defineComponent({
  setup: () => () =>
    h(Select, { modelValue: 'first', open: true }, () => [
      h(SelectTrigger, () => h(SelectValue)),
      h(SelectContent, () => h(SelectItem, { value: 'first' }, () => 'First option')),
    ]),
})

const checkedRadio = defineComponent({
  setup: () => () =>
    h(RadioGroup, { modelValue: 'first' }, () => h(RadioGroupItem, { value: 'first' })),
})

function rendered(selector: string) {
  const element = document.querySelector(selector)
  if (!element) throw new Error(`${selector} did not render`)
  return element
}

function block(rules: string, selector: string) {
  const start = rules.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`Missing ${selector}`)
  return rules.slice(start, rules.indexOf('}', start))
}

function spacing(element: Element, axis: 'h' | 'w') {
  for (const name of element.classList) {
    const match = new RegExp(`^(?:size|${axis})-(\\d+(?:\\.\\d+)?)$`).exec(name)
    if (match) return Number(match[1]) * tailwindSpacing
  }
  throw new Error(`${element.outerHTML} has no ${axis} size`)
}

function stubResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}

const openNavigationTrigger = defineComponent({
  setup: () => () =>
    h(NavigationMenu, () =>
      h(NavigationMenuList, () =>
        h(NavigationMenuItem, () => h(NavigationMenuTrigger, () => 'Cases')),
      ),
    ),
})

function expectInterfaceIcons(selector: string, count: number) {
  const icons = [...rendered(selector).querySelectorAll('svg')]
  expect(icons).toHaveLength(count)
  for (const icon of icons) {
    expect(icon.getAttribute('stroke-width')).toBe(interfaceIconStroke)
    expect(icon.getAttribute('aria-hidden')).toBe('true')
  }
}

function inheritedToken(element: Element, name: string) {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const current = node
    const declared = themeBlocks.filter(
      ([selector, declarations]) => declarations.has(name) && current.matches(selector),
    )
    const value = declared.at(-1)?.[1].get(name)
    if (value) return value
  }
  throw new Error(`${name} does not resolve on ${element.outerHTML}`)
}

async function openMenu(trigger: Element) {
  trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await nextTick()
  await nextTick()
  return rendered('[data-slot="select-content"]')
}

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('shared primitives draw interface icons at the approved 1.75 stroke', () => {
  it('Spinner', () => {
    mount(Spinner, { attachTo, attrs: { 'aria-hidden': 'true' } })
    expectInterfaceIcons('body', 1)
  })

  it('NativeSelect chevron', () => {
    mount(NativeSelect, { attachTo, slots: { default: '<option>Choice</option>' } })
    expectInterfaceIcons('body', 1)
  })

  it('Checkbox tick', async () => {
    mount(Checkbox, { attachTo, props: { modelValue: true } })
    await nextTick()
    expectInterfaceIcons('body', 1)
  })

  it('SelectTrigger chevron', () => {
    mount(
      defineComponent({
        setup: () => () =>
          h(Select, { modelValue: 'first' }, () =>
            h(SelectTrigger, () => h(SelectValue, { placeholder: 'Choice' })),
          ),
      }),
      { attachTo },
    )
    expectInterfaceIcons('[data-slot="select-trigger"]', 1)
  })

  it('SelectItem tick', async () => {
    mount(openSelect, { attachTo })
    await nextTick()
    await nextTick()
    expectInterfaceIcons('[data-slot="select-item"]', 1)
  })

  it('SelectScrollUpButton and SelectScrollDownButton chevrons', () => {
    const stubs = { SelectScrollUpButton: passthrough, SelectScrollDownButton: passthrough }
    mount(SelectScrollUpButton, { attachTo, global: { stubs } })
    mount(SelectScrollDownButton, { attachTo, global: { stubs } })
    expectInterfaceIcons('body', 2)
  })

  it('AccordionTrigger chevron', () => {
    mount(
      defineComponent({
        setup: () => () =>
          h(Accordion, { type: 'single', collapsible: true }, () =>
            h(AccordionItem, { value: 'only' }, () => h(AccordionTrigger, () => 'Why we ask')),
          ),
      }),
      { attachTo },
    )
    expectInterfaceIcons('[data-slot="accordion-trigger"]', 1)
  })

  it('ResizableHandle grip', () => {
    mount(ResizableHandle, {
      attachTo,
      props: { withHandle: true },
      global: { stubs: { SplitterResizeHandle: passthrough } },
    })
    expectInterfaceIcons('body', 1)
  })

  it('NavigationMenuTrigger chevron', () => {
    stubResizeObserver()
    mount(openNavigationTrigger, { attachTo })
    expectInterfaceIcons('[data-slot="navigation-menu-trigger"]', 1)
  })
})

describe('shared primitives size interface icons inside the approved 15 to 18 px range', () => {
  it('draws the NavigationMenuTrigger chevron at 16 px', () => {
    stubResizeObserver()
    mount(openNavigationTrigger, { attachTo })
    const chevron = rendered('[data-slot="navigation-menu-trigger"] svg')
    for (const axis of ['w', 'h'] as const) {
      expect(spacing(chevron, axis)).toBe(approvedIconSize)
      expect(spacing(chevron, axis)).toBeGreaterThanOrEqual(interfaceIconRange.min)
      expect(spacing(chevron, axis)).toBeLessThanOrEqual(interfaceIconRange.max)
    }
  })

  it('draws the ResizableHandle grip at 16 px inside a centred well that holds it', () => {
    mount(ResizableHandle, {
      attachTo,
      props: { withHandle: true },
      global: { stubs: { SplitterResizeHandle: passthrough } },
    })
    const grip = rendered('svg')
    const well = grip.parentElement
    if (!well) throw new Error('The grip has no well')
    const border = well.classList.contains('border') ? 1 : 0
    for (const axis of ['w', 'h'] as const) {
      expect(spacing(grip, axis)).toBe(approvedIconSize)
      expect(spacing(well, axis) - 2 * border).toBeGreaterThanOrEqual(spacing(grip, axis))
    }
    expect([...well.classList]).toEqual(
      expect.arrayContaining(['flex', 'items-center', 'justify-center']),
    )
  })
})

describe('shared primitives follow the approved elevation, focus colour and radio geometry', () => {
  it('floats the Select menu on the one overlay shadow', async () => {
    mount(openSelect, { attachTo })
    await nextTick()
    await nextTick()
    const classes = [...rendered('[data-slot="select-content"]').classList]
    expect(classes).toContain('shadow-(--shadow-overlay)')
    expect(classes.filter((name) => /^shadow-(?!\(--shadow-overlay\))/.test(name))).toEqual([])
  })

  it('gives the checkbox and radio boxes no drop shadow inside the expressions', () => {
    mount(Checkbox, { attachTo })
    mount(checkedRadio, { attachTo })
    expect([...rendered('[data-slot="checkbox"]').classList]).toEqual(
      expect.arrayContaining(['client:relay-check', 'representative:relay-check']),
    )
    expect([...rendered('[data-slot="radio-group-item"]').classList]).toEqual(
      expect.arrayContaining(['client:relay-radio', 'representative:relay-radio']),
    )
    expect(utility('relay-check')).toMatch(/^\s*box-shadow: none;/m)
    expect(utility('relay-radio')).toMatch(/^\s*box-shadow: none;/m)
  })

  it('gives the textarea no drop shadow inside the expressions and keeps the invalid halo', () => {
    mount(Textarea, { attachTo, attrs: { 'aria-invalid': 'true' } })
    expect([...rendered('[data-slot="textarea"]').classList]).toEqual(
      expect.arrayContaining(['client:relay-textarea', 'representative:relay-textarea']),
    )
    const textarea = utility('relay-textarea')
    expect(textarea).toMatch(/^\s*box-shadow: none;/m)
    expect(block(textarea, "&[aria-invalid='true']")).toContain(`box-shadow: ${invalidHalo};`)
  })

  it('draws the checked radio dot as a filled disc half the box wide, with no outline', async () => {
    mount(checkedRadio, { attachTo })
    await nextTick()
    const radius = Number(
      rendered('[data-slot="radio-group-indicator"] svg circle').getAttribute('r'),
    )
    const dot = utility('relay-radio')
    const block = dot.slice(dot.indexOf("& [data-slot='radio-group-indicator'] > svg {"))
    const rule = block.slice(0, block.indexOf('}'))
    expect(rule).toContain('stroke: none;')
    const width = /width: (\d+)%;/.exec(rule)?.[1]
    expect(rule).toContain(`height: ${String(width)}%;`)
    expect((Number(width) / 100) * ((2 * radius) / lucideGrid)).toBeCloseTo(radioDotShare, 6)
  })

  it('keeps the ultramarine ring off the Slider thumb hover, since --ring means focus only', () => {
    stubResizeObserver()
    mount(Slider, { attachTo, props: { modelValue: [40] } })
    const thumb = [...rendered('[data-slot="slider-thumb"]').classList]
    expect(thumb.filter((name) => /(^|:)ring-/.test(name))).toEqual([])
  })
})

describe('the specimen opens each Select menu inside its own panel theme and expression', () => {
  it.each(['client', 'representative'] as const)(
    'resolves the dark popover tokens on the Choice menu of the %s dark panel',
    async (expression) => {
      mount(SpecimenPanel, { attachTo, props: { theme: 'dark', expression, tag: expression } })
      const panel = rendered(`[data-specimen-panel="${expression}-dark"]`)
      const menu = await openMenu(rendered(`#controls-${expression}-dark-select`))
      expect(panel.contains(menu)).toBe(true)
      expect(menu.closest('[data-expression]')?.getAttribute('data-expression')).toBe(expression)
      expect([...menu.classList]).toEqual(
        expect.arrayContaining(['bg-popover', 'text-popover-foreground']),
      )
      for (const [name, value] of Object.entries(darkPopover))
        expect(inheritedToken(menu, name)).toBe(value)
    },
  )

  it('still teleports a Select menu outside a specimen panel to the document body', async () => {
    mount(SharedControlsSpecimen, { attachTo, props: { idPrefix: 'portal' } })
    const menu = await openMenu(rendered('#portal-select'))
    expect(menu.closest('[data-specimen-controls]')).toBeNull()
    expect(inheritedToken(menu, '--popover')).toBe('#FFFFFF')
  })
})

describe('the shared-controls specimen gives checkbox and radio rows the approved row height', () => {
  it('sizes each row to --check-row, 44 px on the client and 24 px on the desk', () => {
    mount(SharedControlsSpecimen, { attachTo, props: { idPrefix: 'rows' } })
    const controls = [
      ...document.querySelectorAll(
        '[data-specimen-controls] [data-slot="checkbox"], [data-specimen-controls] [data-slot="radio-group-item"]',
      ),
    ]
    expect(controls).toHaveLength(3)
    for (const control of controls) {
      const row = control.closest('.min-h-check-row')
      if (!row) throw new Error('The control has no row')
      expect(row.tagName).toBe('LABEL')
      expect(row.getAttribute('for')).toBe(control.id)
      expect([...row.classList].some((name) => /^(?:h|max-h)-/.test(name))).toBe(false)
    }
    expect(relay).toContain(`--spacing-check-row: var(--check-row, ${checkRow.client});`)
    const tokens = recordBlocks()
    expect(tokens.get('[data-expression="client"]')?.get('--check-row')).toBeUndefined()
    expect(tokens.get('[data-expression="representative"]')?.get('--check-row')).toBe(
      checkRow.representative,
    )
  })
})

describe('the shared-controls specimen activates each checkbox and radio from its whole row', () => {
  it.each(['client', 'representative'] as const)(
    'changes each control exactly once per click on the row surface outside its text, in the %s expression',
    async (expression) => {
      mount(SpecimenPanel, { attachTo, props: { theme: 'light', expression, tag: expression } })
      const rows = [
        ...document.querySelectorAll<HTMLElement>(
          `[data-expression="${expression}"] [data-specimen-controls] .min-h-check-row`,
        ),
      ]
      expect(rows).toHaveLength(3)
      const controls = rows.map((row) => {
        const control = row.querySelector<HTMLElement>('[role="checkbox"], [role="radio"]')
        if (!control) throw new Error(`${row.outerHTML} has no control`)
        return control
      })
      const clicks = controls.map(() => 0)
      for (const [index, control] of controls.entries())
        control.addEventListener('click', () => {
          clicks[index] = (clicks[index] ?? 0) + 1
        })
      const states = () => controls.map((control) => control.getAttribute('aria-checked'))
      const press = async (target: HTMLElement) => {
        target.click()
        await nextTick()
      }
      const [checkboxRow, firstRow, secondRow] = rows
      if (!checkboxRow || !firstRow || !secondRow) throw new Error('Missing rows')

      expect(states()).toEqual(['false', 'true', 'false'])
      await press(checkboxRow)
      expect(states()).toEqual(['true', 'true', 'false'])
      expect(clicks).toEqual([1, 0, 0])
      await press(secondRow)
      expect(states()).toEqual(['true', 'false', 'true'])
      expect(clicks).toEqual([1, 0, 1])
      await press(firstRow)
      expect(states()).toEqual(['true', 'true', 'false'])
      expect(clicks).toEqual([1, 1, 1])
      await press(checkboxRow)
      expect(states()).toEqual(['false', 'true', 'false'])
      expect(clicks).toEqual([2, 1, 1])
      await press(controls[0] as HTMLElement)
      expect(states()).toEqual(['true', 'true', 'false'])
      expect(clicks).toEqual([3, 1, 1])
    },
  )
})
