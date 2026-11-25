import { chromium, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'

const runtime = process.env.QA_RUNTIME_DIR
const evidence = process.env.QA_EVIDENCE
const accountsFile = path.join(runtime, 'accounts.json')
const accounts = await fs
  .readFile(accountsFile, 'utf8')
  .then(JSON.parse)
  .catch(() => ({}))
const browser = await chromium.launch()
try {
  for (const project of ['desktop', 'mobile', 'probes']) {
    accounts[project] ||= {}
    for (const persona of project === 'probes'
      ? [
          'client',
          'legacy',
          'wrongIssuer',
          'future',
          'missingEvidence',
          'tokenIdentifier',
          'emailOnly',
          'reviewed',
        ]
      : [
          'client',
          'legacy',
          'wrongIssuer',
          'future',
          'missingEvidence',
          'tokenIdentifier',
          'emailOnly',
          'reviewed',
          'private',
          'freeze',
          'offClient',
          'offAdmin',
          'diagnostics',
        ]) {
      if (accounts[project][persona]?.userId) continue
      while (os.loadavg()[0] > 15) {
        console.log(`Holding account setup: load1=${os.loadavg()[0].toFixed(2)}`)
        await new Promise((r) => setTimeout(r, 60000))
      }
      const dir = path.join(evidence, 'signup', project, persona)
      await fs.mkdir(dir, { recursive: true })
      const context = await browser.newContext({
        viewport:
          project === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 },
        colorScheme: 'light',
        recordVideo: { dir },
      })
      await context.tracing.start({ screenshots: true, snapshots: true, sources: false })
      const page = await context.newPage()
      const account = {
        email: `qa74-${path.basename(runtime)}-${project}-${persona.toLowerCase()}@example.invalid`,
        password: crypto.randomBytes(18).toString('base64url'),
      }
      await page.goto(`${process.env.QA_URL}/auth`)
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
      await page.getByRole('button', { name: 'Create Account', exact: true }).click()
      await expect(
        page
          .getByRole('button', { name: /sign out|log out/i })
          .or(page.getByRole('link', { name: /sign out|log out/i })),
      ).toBeVisible({ timeout: 30000 })
      await page.screenshot({ path: path.join(dir, 'signed-up.png'), fullPage: true })
      const session = await (
        await context.request.get(`${process.env.QA_URL}/api/auth/get-session`)
      ).json()
      const token = await (
        await context.request.get(`${process.env.QA_URL}/api/auth/convex/token`)
      ).json()
      if (!session?.user?.id || !token.token)
        throw Error(`Public auth setup failed for ${project}/${persona}`)
      accounts[project][persona] = {
        ...account,
        userId: session.user.id,
        token: token.token,
        cookies: await context.cookies(),
      }
      await fs.writeFile(accountsFile, JSON.stringify(accounts, null, 2), { mode: 0o600 })
      await context.tracing.stop({ path: path.join(dir, 'trace.zip') })
      await context.close()
      console.log(`Created ${project}/${persona} through visible signup`)
    }
  }
} finally {
  await browser.close()
}
