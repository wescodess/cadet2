import { convex } from '@convex-dev/better-auth/plugins'
import { defineServerAuth } from '@onmax/nuxt-better-auth/config'
import authConfig from '../convex/auth.config'

export default defineServerAuth({
  // NuxtHub provides the Better Auth database automatically via @nuxthub/core.
  // Keep the Convex plugin so Better Auth can mint Convex auth tokens.
  plugins: [convex({ authConfig })],
  emailAndPassword: {
    enabled: true,
  },
})
