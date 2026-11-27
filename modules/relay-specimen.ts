import { defineNuxtModule, extendPages } from 'nuxt/kit'
import type { NuxtPage } from 'nuxt/schema'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const relaySpecimenPage: NuxtPage = {
  name: 'relay-specimen',
  path: '/dev/relay',
  file: resolve(dirname(fileURLToPath(import.meta.url)), '../app/specimen/RelaySpecimen.vue'),
  meta: { colorMode: 'light' },
}

export default defineNuxtModule({
  meta: { name: 'relay-specimen' },
  setup(_options, nuxt) {
    if (!nuxt.options.dev) return
    extendPages((pages) => {
      pages.push(relaySpecimenPage)
    })
  },
})
