import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

import { Accordion, AccordionItem, AccordionTrigger } from '~/components/ui/accordion'
import { Checkbox } from '~/components/ui/checkbox'
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

import { repoPath } from '../../unit/design/css-source'

const interfaceIconStroke = '1.75'
const radioDotShare = 0.5
const lucideGrid = 24

const relay = readFileSync(repoPath('app/assets/css/relay.css'), 'utf8')

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

function expectInterfaceIcons(selector: string, count: number) {
  const icons = [...rendered(selector).querySelectorAll('svg')]
  expect(icons).toHaveLength(count)
  for (const icon of icons) {
    expect(icon.getAttribute('stroke-width')).toBe(interfaceIconStroke)
    expect(icon.getAttribute('aria-hidden')).toBe('true')
  }
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    mount(Slider, { attachTo, props: { modelValue: [40] } })
    const thumb = [...rendered('[data-slot="slider-thumb"]').classList]
    expect(thumb.filter((name) => /(^|:)ring-/.test(name))).toEqual([])
  })
})
