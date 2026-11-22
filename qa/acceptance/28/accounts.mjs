// Arrange unique synthetic accounts through the running app's visible public forms.
import { chromium, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
const url = process.env.QA_URL,
  out = process.env.QA_ACCOUNTS
if (!url || !out) throw Error('Set QA_URL and QA_ACCOUNTS')
const browser = await chromium.launch()
const result = await fs
  .readFile(out, 'utf8')
  .then(JSON.parse)
  .catch(() => ({ desktop: {}, mobile: {}, probes: {} }))
try {
  for (const group of ['desktop', 'mobile', 'probes']) {
    for (const persona of group === 'probes'
      ? ['client', 'foreign', 'admin']
      : ['client', 'admin', 'clientRemaining', 'adminRemaining']) {
      if (result[group][persona]) continue
      const context = await browser.newContext({
        viewport: group === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      })
      const page = await context.newPage()
      const account = {
        email: `qa28-${group}-${persona}-${crypto.randomUUID().slice(0, 8)}@example.invalid`,
        password: crypto.randomBytes(18).toString('base64url'),
      }
      await page.goto(`${url}/auth`)
      // The visible heading change proves hydration before credentials are entered.
      await expect(async () => {
        await page.getByRole('button', { name: 'Sign In', exact: true }).click()
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(/welcome back|sign in/i, {
          timeout: 700,
        })
      }).toPass({ timeout: 30000 })
      await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/create account/i)
      await page.getByLabel('Name', { exact: true }).fill(`QA ${persona} Zoë 李`)
      await page.getByLabel('Email', { exact: true }).fill(account.email)
      await page.getByLabel('Password', { exact: true }).fill(account.password)
      const signup = page.waitForResponse((r) => r.url().includes('/api/auth/sign-up/email'))
      await page.getByRole('button', { name: 'Create Account', exact: true }).click()
      const response = await signup
      if (response.status() !== 200)
        throw Error(`signup ${group}/${persona}: ${response.status()} ${await response.text()}`)
      const session = await context.request.get(`${url}/api/auth/get-session`)
      const principal = await session.json()
      if (!principal?.user?.id) throw Error(`No genuine session after signup ${group}/${persona}`)
      const tokenResponse = await context.request.get(`${url}/api/auth/convex/token`)
      const tokenBody = await tokenResponse.json()
      if (!tokenBody?.token) throw Error(`No JWT ${group}/${persona}: ${JSON.stringify(tokenBody)}`)
      result[group][persona] = {
        ...account,
        userId: principal.user.id,
        cookies: await context.cookies(),
        token: tokenBody.token,
      }
      await fs.writeFile(out, JSON.stringify(result, null, 2), { mode: 0o600 })
      console.log(`Created genuine ${group}/${persona} account and JWT`)
      await context.close()
    }
  }
} finally {
  await browser.close()
}
