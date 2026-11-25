import { chromium, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
const correction = path.join(process.env.QA_RUNTIME_DIR, 'base-freeze-correction.json')
if (process.env.QA_BUILD === 'candidate' && (await fs.stat(correction).catch(() => null))) {
  const child = spawn(
    process.execPath,
    [path.join(process.cwd(), 'qa/acceptance/74/freeze-correction.mjs'), correction],
    { stdio: 'inherit', env: process.env },
  )
  const status = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', resolve)
  })
  if (status) throw Error('Corrected base freeze proof requires review; candidate UI remains held')
}
const evidence = process.env.QA_EVIDENCE
const account = JSON.parse(
  await fs.readFile(path.join(process.env.QA_RUNTIME_DIR, 'accounts.json'), 'utf8'),
).desktop.freeze
await fs.mkdir(evidence, { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: 'light',
  recordVideo: { dir: evidence },
})
await context.tracing.start({ screenshots: true, snapshots: true, sources: false })
const page = await context.newPage()
try {
  await page.goto(`${process.env.QA_URL}/auth`)
  await expect(async () => {
    await page.getByRole('button', { name: 'Sign In', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/sign in|welcome back/i, {
      timeout: 700,
    })
  }).toPass({ timeout: 30000 })
  await page.getByLabel('Email', { exact: true }).fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Sign In', exact: true }).last().click()
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
  await page.goto(`${process.env.QA_URL}/admin/evidence-sources`)
  await page
    .getByRole('textbox', { name: 'Search sources, tags, or description' })
    .fill('QA74 desktop approved retained channel')
  await page.getByRole('button', { name: /QA74 desktop approved retained channel/ }).click()
  await fs.writeFile(
    path.join(evidence, 'source-detail.txt'),
    await page.getByRole('main').ariaSnapshot(),
  )
  await page.screenshot({ path: path.join(evidence, 'source-detail.png'), fullPage: true })
  console.log((await page.getByRole('button').allTextContents()).join('\n'))
  await page.getByRole('button', { name: /edit/i }).click()
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()
  await fs.writeFile(
    path.join(evidence, 'source-edit.txt'),
    await page.getByRole('main').ariaSnapshot(),
  )
  await page.screenshot({ path: path.join(evidence, 'source-edit.png'), fullPage: true })
  if (await page.getByRole('dialog').count())
    await fs.writeFile(
      path.join(evidence, 'source-dialog.txt'),
      await page.getByRole('dialog').ariaSnapshot(),
    )
} finally {
  await context.tracing.stop({ path: path.join(evidence, 'trace.zip') })
  await context.close()
  await browser.close()
}
