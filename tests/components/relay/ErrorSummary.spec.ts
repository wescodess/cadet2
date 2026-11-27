import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import ErrorSummary from '~/components/relay/ErrorSummary.vue'

import { expectAccessible, nth, readableText } from './accessibility'

const items = [
  { text: 'Enter the expiry date as day, month and year', target: 'expiry-day' },
  { text: 'Select whether you have a job offer in Canada', target: 'job-offer' },
]

describe('ErrorSummary', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<input id="expiry-day" aria-label="Day"><fieldset id="job-offer" tabindex="-1"></fieldset><div id="app"></div>'
  })

  function summary(props: Record<string, unknown> = {}) {
    return mount(ErrorSummary, { props: { items, ...props }, attachTo: '#app' })
  }

  it('is an alert that takes focus when it appears', async () => {
    const wrapper = summary()
    await nextTick()
    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.attributes('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(document.querySelector('[role="alert"]'))
    expectAccessible(wrapper)
  })

  it('can wait to take focus until the form asks for it', async () => {
    const wrapper = summary({ autofocus: false })
    await nextTick()
    expect(document.activeElement).toBe(document.body)
    ;(wrapper.vm as unknown as { focus: () => void }).focus()
    expect(document.activeElement).toBe(document.querySelector('[role="alert"]'))
  })

  it('titles the problem with an icon and lists a link to each item', () => {
    const wrapper = summary()
    expect(readableText(wrapper.get('h2'))).toBe('There is a problem')
    expect(wrapper.get('h2 svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.findAll('li a').map((link) => [link.text(), link.attributes('href')])).toEqual([
      [nth(items, 0).text, '#expiry-day'],
      [nth(items, 1).text, '#job-offer'],
    ])
  })

  it('names what is blocked on the desk', () => {
    expect(summary({ title: 'Version 3 can’t be signed yet' }).get('h2').text()).toBe(
      'Version 3 can’t be signed yet',
    )
  })

  it('moves focus to the field each link names', async () => {
    const wrapper = summary()
    await nth(wrapper.findAll('li a'), 1).trigger('click')
    expect(document.activeElement?.id).toBe('job-offer')
    await nth(wrapper.findAll('li a'), 0).trigger('click')
    expect(document.activeElement?.id).toBe('expiry-day')
  })

  it('draws a destructive border with a 3 px left edge', () => {
    expect(summary().classes()).toEqual(
      expect.arrayContaining([
        'border',
        'border-l-3',
        'border-destructive',
        'rounded-panel',
        'bg-card',
      ]),
    )
  })
})
