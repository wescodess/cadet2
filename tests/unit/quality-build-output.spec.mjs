// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { buildOutputProblems } from '../../scripts/quality/build-output.mjs'

const roots = []

function output(files) {
  const root = mkdtempSync(join(tmpdir(), 'build-output-'))
  roots.push(root)
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  return root
}

const fonts = Object.fromEntries(
  ['sans-latin-400-normal', 'mono-latin-400-normal'].map((name) => [
    `public/fonts/ibm-plex/ibm-plex-${name}.woff2`,
    'wOF2',
  ]),
)

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('built output check', () => {
  it('passes a deployable build with self-hosted fonts and no specimen', () => {
    expect(
      buildOutputProblems(
        output({ ...fonts, 'server/chunks/app.mjs': 'export const routes = ["/auth"]' }),
      ),
    ).toEqual([])
  })

  it.each([
    ['the specimen route', 'server/chunks/routes.mjs', 'path:"/dev/relay"'],
    ['the specimen markup', 'public/_nuxt/page.js', 'data-specimen="relay"'],
    ['the specimen component', 'server/chunks/build/RelaySpecimen-x.mjs', 'export default {}'],
    [
      'a Google Fonts request',
      'public/_nuxt/entry.css',
      '@import url(https://fonts.googleapis.com/css2?family=IBM+Plex+Sans)',
    ],
  ])('fails when the build carries %s', (_name, path, content) => {
    expect(buildOutputProblems(output({ ...fonts, [path]: content }))).not.toEqual([])
  })

  it('fails when the self-hosted fonts are missing', () => {
    expect(buildOutputProblems(output({ 'server/index.mjs': '' }))).not.toEqual([])
  })
})
