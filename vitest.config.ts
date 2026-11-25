import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      h3: createRequire(import.meta.resolve('nuxt/package.json')).resolve('h3'),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '~~': fileURLToPath(new URL('.', import.meta.url)),
      '@@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'tests/components/**/*.spec.ts',
      'tests/unit/**/*.spec.ts',
      'tests/unit/**/*.spec.mjs',
    ],
  },
})
