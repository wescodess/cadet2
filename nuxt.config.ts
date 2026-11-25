import { fileURLToPath } from 'node:url'
// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

const localHubDbDataDir = process.env.NUXT_HUB_DB_DATA_DIR || '.data/db/pglite-dev'

export default defineNuxtConfig({
  hooks: {
    'nitro:config'(config) {
      const handlers = config.errorHandler
      if (typeof handlers !== 'string') throw new Error('Expected the Nuxt error renderer')
      config.alias = { ...config.alias, '#admin-error-renderer': handlers }
      config.errorHandler = [
        fileURLToPath(new URL('./server/error-handlers/private-admin.ts', import.meta.url)),
        handlers,
      ]
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  typescript: {
    strict: true,
    tsConfig: { compilerOptions: { noUncheckedIndexedAccess: true } },
  },

  css: ['~/assets/css/tailwind.css'],

  modules: ['@nuxthub/core', 'nuxt-convex', '@onmax/nuxt-better-auth', 'shadcn-nuxt'],

  runtimeConfig: {
    cloudflareAiSearch: {
      accountId: '',
      apiToken: '',
      instanceName: '',
      instanceId: '',
    },
    cloudflareAiGateway: {
      accountId: '',
      gatewayId: '',
      baseUrl: '',
      apiToken: '',
    },
    openRouter: {
      apiKey: '',
      defaultModel: '',
      appName: '',
      appUrl: '',
    },
    rag: {
      defaultTenantId: 'default',
      schedulerSecret: '',
    },
  },

  hub: {
    dir: process.env.NUXT_HUB_DIR || '.data',
    db: {
      dialect: 'postgresql',
      connection: {
        // Keep local dev on an isolated PGlite store so legacy `pglite-main`
        // corruption does not block `pnpm dev`. Override when you need a
        // specific local database snapshot.
        dataDir: localHubDbDataDir,
      },
      // Avoid opening PGlite during both Nitro build and dev runtime startup.
      // In practice this can abort the local WASM engine before auth/session queries run.
      applyMigrationsDuringBuild: Boolean(
        process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRESQL_URL,
      ),
    },
  },

  convex: {
    // Keep disabled unless you need file uploads right now.
    storage: false,
  },

  shadcn: {
    /**
     * Prefix for all the imported components
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui',
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
