import { defineNuxtModule, extendPages } from 'nuxt/kit'
import { fileURLToPath } from 'node:url'

export default defineNuxtModule({
  meta: { name: 'relay-specimen' },
  setup(_options, nuxt) {
    if (!nuxt.options.dev) return
    extendPages((pages) => {
      pages.push({
        name: 'relay-specimen',
        path: '/dev/relay',
        file: fileURLToPath(new URL('../app/specimen/RelaySpecimen.vue', import.meta.url)),
      })
    })
  },
})
