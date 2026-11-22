import { z } from 'zod'
import { jsonOutput, natural, nonempty, parser, positive } from './parser.mjs'

const user = z
  .object({
    login: nonempty,
    id: positive,
    node_id: nonempty,
    avatar_url: z.string().url(),
    gravatar_id: z.string(),
    url: z.string().url(),
    html_url: z.string().url(),
    followers_url: z.string().url(),
    following_url: nonempty,
    gists_url: nonempty,
    starred_url: nonempty,
    subscriptions_url: z.string().url(),
    organizations_url: z.string().url(),
    repos_url: z.string().url(),
    events_url: nonempty,
    received_events_url: z.string().url(),
    type: nonempty,
    user_view_type: nonempty,
    site_admin: z.boolean(),
  })
  .strict()
const asset = z
  .object({
    url: z.string().url(),
    id: positive,
    node_id: nonempty,
    name: nonempty,
    label: z.string(),
    uploader: user,
    content_type: nonempty,
    state: z.literal('uploaded'),
    size: positive,
    digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    download_count: natural,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    browser_download_url: z.string().url(),
  })
  .strict()
const release = z
  .object({
    url: z.string().url(),
    assets_url: z.string().url(),
    upload_url: nonempty,
    html_url: z.string().url(),
    id: positive,
    author: user,
    node_id: nonempty,
    tag_name: z.literal('v8.30.1'),
    target_commitish: nonempty,
    name: nonempty,
    draft: z.literal(false),
    immutable: z.boolean(),
    prerelease: z.literal(false),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    published_at: z.string().datetime(),
    assets: z.array(asset).nonempty(),
    tarball_url: z.string().url(),
    zipball_url: z.string().url(),
    body: nonempty,
    reactions: z
      .object({
        url: z.string().url(),
        total_count: natural,
        '+1': natural,
        '-1': natural,
        laugh: natural,
        hooray: natural,
        confused: natural,
        heart: natural,
        rocket: natural,
        eyes: natural,
      })
      .strict()
      .refine(
        (reactions) =>
          Object.entries(reactions)
            .filter(([key]) => !['url', 'total_count'].includes(key))
            .reduce((sum, [, count]) => sum + count, 0) === reactions.total_count,
        'Reaction counts do not match',
      ),
  })
  .strict()
  .refine(
    (entry) => new Set(entry.assets.map((asset) => asset.name)).size === entry.assets.length,
    'Duplicate release assets',
  )
  .refine((entry) => {
    const api = 'https://api.github.com/repos/gitleaks/gitleaks/releases'
    const web = 'https://github.com/gitleaks/gitleaks/releases'
    return (
      entry.url === `${api}/${entry.id}` &&
      entry.assets_url === `${entry.url}/assets` &&
      entry.html_url === `${web}/tag/${entry.tag_name}` &&
      new Set(entry.assets.map((asset) => asset.id)).size === entry.assets.length &&
      entry.assets.every(
        (asset) =>
          asset.url === `${api}/assets/${asset.id}` &&
          asset.browser_download_url === `${web}/download/${entry.tag_name}/${asset.name}`,
      )
    )
  }, 'Release and asset references do not match their identities')
export const schema = jsonOutput(release)
export const parse = parser('GitHub gitleaks release metadata', schema)
