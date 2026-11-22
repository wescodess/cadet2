import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { chromium } from '@playwright/test'
import { adminNavigationLinks } from '../../app/lib/admin/navigation.ts'
import { createStack } from './support/stack.mjs'

let stack
let browser
before(
  async () => {
    stack = await createStack()
    browser = await chromium.launch()
  },
  { timeout: 240_000 },
)
after(async () => {
  await browser?.close()
  await stack?.close()
})

const user = (role) => stack.users.find((candidate) => candidate.role === role)

async function contextFor(actor) {
  const context = await browser.newContext()
  if (actor) {
    await context.addCookies(
      actor.cookie.split('; ').map((pair) => {
        const separator = pair.indexOf('=')
        return {
          name: pair.slice(0, separator),
          value: pair.slice(separator + 1),
          url: stack.origin,
        }
      }),
    )
  }
  return context
}

const mounted = "document.querySelector('#__nuxt')?.__vue_app__"

async function open(page, path) {
  await page.goto(`${stack.origin}${path}`)
  await page.waitForFunction(mounted)
}

const signOutButton = (page) => page.getByRole('button', { name: 'Sign out', exact: true })
const sessionCookies = async (context) =>
  (await context.cookies(stack.origin)).filter((cookie) => cookie.name.includes('session_'))

async function signOutWithKeyboard(page) {
  const request = page.waitForResponse((response) =>
    response.url().startsWith(`${stack.origin}/api/auth/sign-out`),
  )
  const loaded = page.waitForEvent('load')
  await signOutButton(page).press('Enter')
  assert.equal((await request).status(), 200, 'server accepted sign-out')
  await loaded
  await page.waitForFunction(mounted)
}

async function assertSignedOut(page, context) {
  assert.equal(new URL(page.url()).pathname, '/', 'returned to the landing page')
  await page.getByRole('link', { name: 'Sign in or create an account' }).waitFor()
  assert.equal(await signOutButton(page).count(), 0, 'Sign out is no longer offered')
  assert.deepEqual(await sessionCookies(context), [], 'browser session cookies cleared')
  const session = await context.request.get(`${stack.origin}/api/auth/get-session`)
  assert.equal(await session.json(), null, 'browser no longer holds a session')
  const access = await context.request.get(`${stack.origin}/api/admin/access`)
  assert.equal(access.status(), 401, 'protected admin request refused')
  const token = await context.request.get(`${stack.origin}/api/auth/convex/token`)
  assert.notEqual(token.status(), 200, 'browser can no longer mint a Convex token')
  await open(page, '/admin/pathways')
  await page.waitForURL(`${stack.origin}/auth`)
}

test('a signed-out visitor is not offered Sign out', async () => {
  const context = await contextFor()
  const page = await context.newPage()
  try {
    for (const path of ['/', '/ai-search']) {
      await open(page, path)
      assert.equal(await signOutButton(page).count(), 0, `${path} hides Sign out`)
    }
    await open(page, '/')
    await page.getByRole('link', { name: 'Sign in or create an account' }).waitFor()
  } finally {
    await context.close()
  }
})

test('every admin page and the AI search page offer Sign out to a signed-in admin', async () => {
  const context = await contextFor(user('admin'))
  const page = await context.newPage()
  try {
    for (const path of [...adminNavigationLinks.map((link) => link.href), '/ai-search']) {
      await open(page, path)
      await signOutButton(page).waitFor()
      assert.equal(new URL(page.url()).pathname, path, `${path} stays open while signed in`)
    }
  } finally {
    await context.close()
  }
})

test('a signed-in user signs out from the landing page with the keyboard', async () => {
  const actor = user('ordinary')
  const context = await contextFor(actor)
  const page = await context.newPage()
  try {
    await open(page, '/')
    await signOutButton(page).waitFor()
    assert.equal(
      await page.getByRole('link', { name: 'Sign in or create an account' }).count(),
      0,
      'signed-in landing page does not loop back to the auth page',
    )
    await signOutWithKeyboard(page)
    await assertSignedOut(page, context)
  } finally {
    await context.close()
  }
})

test('a failed sign-out reports an error and keeps the user signed in', async () => {
  const context = await contextFor(user('foreign-user'))
  const page = await context.newPage()
  try {
    await open(page, '/')
    await page.route('**/api/auth/sign-out', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    )
    await signOutButton(page).press('Enter')
    const alert = page.getByRole('alert').filter({ hasText: 'still signed in' })
    await alert.waitFor()
    assert.equal(new URL(page.url()).pathname, '/', 'stays on the page')
    await signOutButton(page).waitFor()
    assert.ok(
      await signOutButton(page).evaluate((button) => button === button.ownerDocument.activeElement),
      'focus stays on Sign out for a keyboard retry',
    )
    assert.notDeepEqual(await sessionCookies(context), [], 'session cookie retained')
    const session = await context.request.get(`${stack.origin}/api/auth/get-session`)
    assert.equal((await session.json())?.user?.id, user('foreign-user').id, 'still signed in')
  } finally {
    await context.close()
  }
})

test('a signed-in admin signs out from an admin page and loses admin access', async (t) => {
  const actor = user('admin')
  const context = await contextFor(actor)
  const page = await context.newPage()
  try {
    const before = await context.request.get(`${stack.origin}/api/admin/access`)
    assert.equal(before.status(), 200, 'admin access positive control')
    await open(page, '/admin/recommendation-reviews')
    await signOutButton(page).waitFor()
    await signOutWithKeyboard(page)
    await assertSignedOut(page, context)
  } finally {
    await context.close()
  }

  // Characterizes the open revocation defect; #53 must replace these with denials.
  await t.test('known #53 defect: a retained pre-sign-out cookie is still admitted', async () => {
    const retained = { cookie: actor.cookie }
    const session = await fetch(`${stack.origin}/api/auth/get-session`, { headers: retained })
    assert.equal((await session.json())?.user?.id, actor.id)
    const access = await fetch(`${stack.origin}/api/admin/access`, { headers: retained })
    assert.equal(access.status, 200)
    const token = await fetch(`${stack.origin}/api/auth/convex/token`, { headers: retained })
    assert.equal(token.status, 200)
  })
})
