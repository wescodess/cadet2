import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config'
import type { AuthConfig } from 'convex/server'

const convexAuthSiteUrl = process.env.CONVEX_SITE_URL ?? 'http://localhost:3000'

export default {
  // Convex runtime may not inherit Nuxt's `.env` values in local dev.
  providers: [
    {
      ...getAuthConfigProvider(),
      issuer: convexAuthSiteUrl,
      jwks: `${convexAuthSiteUrl}/api/auth/convex/jwks`,
    },
  ],
} satisfies AuthConfig
