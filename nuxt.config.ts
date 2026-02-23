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
  },

  hub: {
    db: 'postgresql',
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
