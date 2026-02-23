import { v } from 'convex/values'
import { query } from './_generated/server'

export const list = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const identitySubject = identity?.subject ?? '(missing Convex identity)'

    return [
      {
        id: 'welcome',
        title: 'Finish Nuxt + Convex + Better Auth wiring',
        ownerId: args.userId,
        identitySubject,
      },
      {
        id: 'build-example',
        title: 'Render protected query data with useConvexQuery()',
        ownerId: args.userId,
        identitySubject,
      },
    ]
  },
})
