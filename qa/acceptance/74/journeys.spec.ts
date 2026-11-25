import { test as base, expect, type Page, type Response } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { z } from 'zod'
import { grantPersonas, oracle, pages } from './oracles'

const accountSchema = z.object({
  email: z.string(),
  password: z.string(),
  userId: z.string(),
  token: z.string(),
})
const runtime = z.string().min(1).parse(process.env.QA_RUNTIME_DIR)
const test = base.extend<{ observed: undefined }>({
  observed: [
    async ({ page }, use, info) => {
      const holds: { at: string; load1: number }[] = []
      const load1 = () => z.number().parse(os.loadavg()[0])
      while (load1() > 15) {
        holds.push({ at: new Date().toISOString(), load1: load1() })
        info.setTimeout(info.timeout + 65000)
        await new Promise((resolve) => setTimeout(resolve, 60000))
      }
      if (holds.length)
        await info.attach('load-holds.json', {
          body: JSON.stringify(holds),
          contentType: 'application/json',
        })
      const errors: string[] = []
      const cancellations: { method: string; path: string }[] = []
      const network: { method: string; path: string; status: number }[] = []
      const privateResponses: { path: string; status: number; cache: string | undefined }[] = []
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      page.on('console', (m) => {
        if (
          m.type() === 'error' &&
          !/^Failed to load resource: the server responded with a status of (?:400|401|403|404|409|503)\b/.test(
            m.text(),
          )
        )
          errors.push(`console: ${m.text()}`)
      })
      page.on('requestfailed', (r) => {
        // #28 treats navigation cancellation as expected. Keep the named auth
        // and manifest GET cancellations visible without suppressing errors.
        const p = new URL(r.url()).pathname
        if (
          r.failure()?.errorText === 'net::ERR_ABORTED' &&
          (r.isNavigationRequest() ||
            (r.method() === 'GET' &&
              (p === '/api/auth/convex/token' ||
                p === '/api/admin/access' ||
                p.startsWith('/_nuxt/builds/'))))
        ) {
          cancellations.push({ method: r.method(), path: p })
          return
        }
        errors.push(
          `requestfailed: ${r.method()} ${new URL(r.url()).pathname} ${r.failure()?.errorText ?? ''}`,
        )
      })
      page.on('response', (r) => {
        const p = new URL(r.url()).pathname
        if (/^\/(?:api\/)?(?:admin|ai-search)(?:\/|$)/.test(p))
          privateResponses.push({
            path: p,
            status: r.status(),
            cache: r.headers()['cache-control'],
          })
        if (r.status() < 400) return
        network.push({ method: r.request().method(), path: p, status: r.status() })
        const expected =
          ([401, 403].includes(r.status()) && /^\/(?:api\/)?(?:admin|ai-search)(?:\/|$)/.test(p)) ||
          (r.status() === 404 && /^\/(?:admin|ai-search|workspace|planner)(?:\/|$)/.test(p)) ||
          (r.status() === 409 && /^\/api\/admin\/rag\/sources/.test(p)) ||
          (r.status() === 503 &&
            /^\/api\/(?:admin\/(?:recommendation-reviews|rag\/ingestion)|ai-search)/.test(p))
        if (!expected)
          errors.push(`unexpected HTTP ${String(r.status())}: ${r.request().method()} ${p}`)
      })
      await use(undefined)
      await info.attach('browser-errors.json', {
        body: JSON.stringify({ errors, network, cancellations }, null, 2),
        contentType: 'application/json',
      })
      await info.attach('private-responses.json', {
        body: JSON.stringify(privateResponses, null, 2),
        contentType: 'application/json',
      })
      expect
        .soft(
          privateResponses
            .filter((r) => r.status < 300 || r.status >= 400)
            .filter((r) => ![401, 403].includes(r.status))
            .filter((r) => r.cache !== 'private, no-store'),
          oracle.private,
        )
        .toEqual([])
      // #72 L230 and deferred S4: denial must not cause hydration errors.
      expect.soft(errors, oracle.clean).toEqual([])
    },
    { auto: true },
  ],
})

function account(project: string, persona: string) {
  const accounts = z
    .record(z.record(accountSchema))
    .parse(JSON.parse(fs.readFileSync(path.join(runtime, 'accounts.json'), 'utf8')))
  const value = accounts[project]?.[persona]
  if (!value) throw new Error(`Missing unique ${project}/${persona} setup`)
  return value
}
async function signIn(page: Page, project: string, persona: string) {
  const a = account(project, persona)
  await page.goto('/auth')
  await expect(async () => {
    await page.getByRole('button', { name: 'Sign In', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/welcome back|sign in/i, {
      timeout: 700,
    })
  }).toPass({ timeout: 30000 })
  await page.getByLabel('Email', { exact: true }).fill(a.email)
  await page.getByLabel('Password', { exact: true }).fill(a.password)
  await page
    .getByRole('button', { name: /^(?:sign in|login|log in)$/i })
    .last()
    .click()
  await expect(
    page
      .getByRole('button', { name: /sign out|log out/i })
      .or(page.getByRole('link', { name: /sign out|log out/i })),
  ).toBeVisible({ timeout: 30000 })
}
async function shot(page: Page, name: string) {
  await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: false })
}

async function navigationChain(response: Response | null) {
  const chain = []
  let request = response?.request() ?? null
  while (request) {
    const current = await request.response()
    chain.unshift({
      path: new URL(request.url()).pathname,
      status: current?.status(),
      cache: current?.headers()['cache-control'],
    })
    request = request.redirectedFrom()
  }
  return chain
}

async function assertSearchOff(page: Page) {
  const controls = page.getByRole('button', { name: /query|search|send|ask|generate/i })
  for (const button of await controls.all()) await expect.soft(button, oracle.off).toBeDisabled()
}

const frozenNotice =
  /YouTube source actions are frozen|YouTube (?:ingestion|execution|sources?) (?:is|are) (?:frozen|unavailable|disabled)|YOUTUBE_FROZEN|409 Conflict/i

async function assertFrozenNotice(page: Page, action: string) {
  await expect
    .soft(page.getByText(frozenNotice).first(), `${oracle.frozen}: ${action}`)
    .toBeVisible({ timeout: 5000 })
  await shot(page, `frozen-${action}`)
}

async function chooseSource(page: Page, project: string, action: string) {
  const name = `QA74 ${project} UI ${action}`
  await page.goto('/admin/evidence-sources')
  await page.getByRole('textbox', { name: 'Search sources, tags, or description' }).fill(name)
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible()
}

async function editFrozenSource(page: Page, project: string, action: 'schedule' | 'configure') {
  await chooseSource(page, project, action)
  await page.getByRole('button', { name: /^Edit$/i }).click()
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()
  // The editor exposes these controls by role but does not associate its visible
  // labels. Record the accessibility defect while exercising the visible action.
  await test.info().attach(`editor-labels-${action}.json`, {
    body: JSON.stringify({
      scheduleLabelMatches: await page.getByLabel('Schedule', { exact: true }).count(),
      maxVideosLabelMatches: await page.getByLabel('Max videos per run', { exact: true }).count(),
      controls: await page.getByRole('main').ariaSnapshot(),
    }),
    contentType: 'application/json',
  })
  if (action === 'schedule')
    await page
      .getByRole('combobox')
      .filter({ has: page.getByRole('option', { name: 'Daily', exact: true }) })
      .selectOption('daily')
  else await page.getByRole('spinbutton').last().fill('2')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await assertFrozenNotice(page, action)
}

for (const persona of ['visitor', 'client', ...grantPersonas]) {
  test(`J74-01 ${persona} every preserved admin page and API admission`, async ({ page }, info) => {
    if (persona !== 'visitor') await signIn(page, info.project.name, persona)
    const admitted = persona === 'reviewed'
    const records = []
    for (const [url, heading] of pages) {
      const response = await page.goto(`${url}?qa74=deep-link`)
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30000 })
      const redirects = await navigationChain(response)
      const status = redirects[0]?.status ?? response?.status()
      if (admitted) {
        // #74 AC1 and LR preserved admin-page inventory.
        expect.soft(status, `${oracle.preserve}: ${url}`).toBe(200)
        expect.soft(response?.headers()['cache-control'], oracle.private).toBe('private, no-store')
        await expect
          .soft(page.getByRole('heading').filter({ hasText: heading }).first(), oracle.preserve)
          .toBeVisible()
      } else {
        // LR HTTP/page containment: anonymous 401 and signed-in non-admin 403 APIs;
        // private pages must admit neither actor nor render the admin capability.
        expect
          .soft(
            [401, 403].includes(status ?? 0) ||
              ([302, 303].includes(status ?? 0) &&
                ['/', '/auth'].includes(new URL(page.url()).pathname)),
            oracle.admission,
          )
          .toBe(true)
        expect
          .soft(
            await page.getByRole('heading').filter({ hasText: heading }).count(),
            oracle.admission,
          )
          .toBe(0)
      }
      records.push({
        kind: 'page',
        persona,
        url,
        status,
        finalStatus: response?.status(),
        redirects,
        finalPath: new URL(page.url()).pathname,
        cache: response?.headers()['cache-control'],
        headings: await page.getByRole('heading').allTextContents(),
      })
      await shot(page, `page-${url.replaceAll('/', '_')}`)
    }
    await info.attach('authorization-matrix.json', {
      body: JSON.stringify(records, null, 2),
      contentType: 'application/json',
    })
  })
}

test('J74-02 admitted unknown private pages and API errors stay private', async ({
  page,
}, info) => {
  await signIn(page, info.project.name, 'private')
  const records = []
  for (const url of [
    '/admin/qa74-unknown',
    '/admin/qa74-unknown/nested',
    '/ai-search/qa74-unknown',
  ]) {
    const response = await page.goto(url)
    await expect(page.getByRole('heading').first()).toBeVisible()
    // Contract Private errors explicitly includes unknown /admin/** and /ai-search/** documents.
    expect.soft(response?.status(), oracle.private).toBe(404)
    expect.soft(response?.headers()['cache-control'], oracle.private).toBe('private, no-store')
    records.push({ url, status: response?.status(), cache: response?.headers()['cache-control'] })
    await shot(page, url.replaceAll('/', '_'))
  }
  await info.attach('private-errors.json', {
    body: JSON.stringify(records, null, 2),
    contentType: 'application/json',
  })
})

for (const persona of ['visitor', 'offClient', 'offAdmin']) {
  test(`J74-03 ${persona} public AI Search and planner stay off`, async ({ page }, info) => {
    if (persona !== 'visitor') await signIn(page, info.project.name, persona)
    await page.goto('/ai-search')
    await expect(page.getByRole('heading').first()).toBeVisible()
    // J10 step 5 / N06: no public or portal LLM recovery path.
    await assertSearchOff(page)
    if (persona === 'offAdmin')
      await expect
        .soft(page.getByText(/\b(?:unavailable|disabled|off|paused)\b/i).first(), oracle.off)
        .toBeVisible()
    for (const url of [
      '/workspace',
      '/workspace/intake',
      '/workspace/recommendations',
      '/planner',
    ]) {
      const response = await page.goto(url)
      expect.soft(response?.status(), oracle.off).toBe(404)
      await expect(page.getByText(/404/).first()).toBeVisible()
      await shot(page, `off-${url.replaceAll('/', '_')}`)
    }
  })
}

test('J74-04 reviewed admin sees AI Search unavailable and bounded diagnostics', async ({
  page,
}, info) => {
  await signIn(page, info.project.name, 'diagnostics')
  await page.goto('/ai-search')
  await expect(page.getByRole('heading').first()).toBeVisible()
  // Contract: all queries/sync off, no grant enables them.
  await expect
    .soft(page.getByText(/\b(?:unavailable|disabled|off|paused)\b/i).first(), oracle.off)
    .toBeVisible()
  await assertSearchOff(page)
  await shot(page, 'search-off')
  await page.goto('/admin/rag-phase0')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await expect
    .soft(page.getByText(/configured|configuration|readiness/i).first(), oracle.preserve)
    .toBeVisible()
  await shot(page, 'phase0')
})

test('J74-05 reviewed admin cannot change frozen YouTube sources through visible actions', async ({
  page,
}, info) => {
  await signIn(page, info.project.name, 'freeze')
  page.on('dialog', async (dialog) => {
    await dialog.accept(
      dialog.type() === 'prompt'
        ? /frequency/i.test(dialog.message())
          ? 'manual'
          : 'Synthetic QA freeze attempt'
        : undefined,
    )
  })
  const records: { action: string; offered: boolean; frozenNotice: boolean }[] = []
  await page.goto('/admin/rag-sources')
  await expect(page.getByRole('heading', { name: /source registry/i })).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Type', exact: true })
    .first()
    .selectOption('youtube_channel')
  await page
    .getByLabel('Name', { exact: true })
    .fill(`QA74 ${info.project.name} new channel Zoë 李`)
  await page.getByRole('combobox', { name: 'Frequency', exact: true }).selectOption('manual')
  await page.getByLabel('Channel ID', { exact: true }).fill('UC0000000000000000000000')
  await page
    .getByLabel('Channel URL', { exact: true })
    .fill('https://www.youtube.com/channel/UC0000000000000000000000')
  await page.getByLabel('Max videos/run', { exact: true }).fill('1')
  await page.getByRole('button', { name: 'Submit Source', exact: true }).click()
  // Contract: frozen submissions fail before writing and communicate unavailable/conflict.
  await assertFrozenNotice(page, 'create')
  records.push({
    action: 'create',
    offered: true,
    frozenNotice: await page.getByText(frozenNotice).first().isVisible(),
  })

  for (const action of ['schedule', 'configure'] as const) {
    await editFrozenSource(page, info.project.name, action)
    records.push({
      action,
      offered: true,
      frozenNotice: await page.getByText(frozenNotice).first().isVisible(),
    })
  }
  await chooseSource(page, info.project.name, 'enable')
  const enable = page.getByRole('button', { name: /^enable(?: source| ingestion)?$/i })
  const enableOffered = (await enable.count()) > 0
  if (enableOffered) {
    await enable.click()
    await assertFrozenNotice(page, 'enable')
  }
  records.push({
    action: 'standalone enable (separate PATCH enable probe always runs)',
    offered: enableOffered,
    frozenNotice: enableOffered && (await page.getByText(frozenNotice).first().isVisible()),
  })

  for (const action of ['approve', 'resume'] as const) {
    await page.goto('/admin/rag-sources')
    const item = page
      .getByRole('listitem')
      .filter({ has: page.getByText(`QA74 ${info.project.name} UI ${action}`, { exact: true }) })
    await item.getByRole('button', { name: new RegExp(`^${action}$`, 'i') }).click()
    await assertFrozenNotice(page, action)
    records.push({
      action,
      offered: true,
      frozenNotice: await page.getByText(frozenNotice).first().isVisible(),
    })
  }
  await chooseSource(page, info.project.name, 'delete')
  await page.getByRole('button', { name: /^Remove$/i }).click()
  const confirmation = page.getByRole('alertdialog').or(page.getByRole('dialog'))
  if (await confirmation.isVisible())
    await confirmation
      .getByRole('button', { name: /remove|delete|confirm|continue/i })
      .last()
      .click()
  await assertFrozenNotice(page, 'delete')
  await expect
    .soft(
      page.getByRole('button', { name: new RegExp(`^QA74 ${info.project.name} UI delete`) }),
      oracle.frozen,
    )
    .toBeVisible()
  records.push({
    action: 'delete',
    offered: true,
    frozenNotice: await page.getByText(frozenNotice).first().isVisible(),
  })
  await info.attach('frozen-ui-actions.json', {
    body: JSON.stringify(records, null, 2),
    contentType: 'application/json',
  })
})
