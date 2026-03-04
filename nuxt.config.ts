// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

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
      adminUserIds: '',
      adminEmails: '',
      schedulerSecret: '',
    },
  },

  hub: {
    dir: process.env.NUXT_HUB_DIR || '.data',
    db: {
      dialect: 'postgresql',
      connection: {
        // Keep using local PGlite in dev, but isolate from a corrupted prior store.
        // Override with NUXT_HUB_DB_DATA_DIR when needed.
        dataDir: process.env.NUXT_HUB_DB_DATA_DIR || '.data/db/pglite-main',
      },
      // Avoid opening PGlite during both Nitro build and dev runtime startup.
      // In practice this can abort the local WASM engine before auth/session queries run.
      applyMigrationsDuringBuild: Boolean(
        process.env.DATABASE_URL
        || process.env.POSTGRES_URL
        || process.env.POSTGRESQL_URL,
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
    plugins: [
      tailwindcss(),
    ],
  },
})
