import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SignOutButton from '~/components/auth/SignOutButton.vue'

const loggedIn = ref(false)
const signOut = vi.fn()
const assign = vi.fn()

beforeEach(() => {
  loggedIn.value = false
  signOut.mockReset()
  assign.mockReset()
  vi.stubGlobal('useUserSession', () => ({
    client: { signOut },
    loggedIn: computed(() => loggedIn.value),
  }))
  vi.stubGlobal('location', { assign })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SignOutButton', () => {
  it('is absent for a signed-out visitor', () => {
    const wrapper = mount(SignOutButton)

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Sign out')
  })

  it('offers a native Sign out button to a signed-in user', () => {
    loggedIn.value = true
    const wrapper = mount(SignOutButton)
    const button = wrapper.get('button')

    expect(button.text()).toBe('Sign out')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('ends the session through the auth client and returns to the landing page', async () => {
    loggedIn.value = true
    signOut.mockResolvedValue({ data: { success: true }, error: null })
    const wrapper = mount(SignOutButton)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith('/')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('keeps the user signed in and reports an error when the server rejects sign-out', async () => {
    loggedIn.value = true
    signOut.mockResolvedValue({ data: null, error: { status: 500, message: 'Internal' } })
    const wrapper = mount(SignOutButton)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(assign).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('still signed in')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('keeps the user signed in and reports an error when the request cannot be sent', async () => {
    loggedIn.value = true
    signOut.mockRejectedValue(new TypeError('Failed to fetch'))
    const wrapper = mount(SignOutButton)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(assign).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('still signed in')
  })
})
