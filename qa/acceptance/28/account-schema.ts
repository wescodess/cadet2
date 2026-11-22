import { readFileSync } from 'node:fs'
import { z } from 'zod'

const accountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  ownRunId: z.string().min(1),
})
const accountsSchema = z.record(z.record(accountSchema))

export function accountFor(project: string, persona: string) {
  const file = process.env.QA_ACCOUNTS
  if (!file) throw new Error('Set QA_ACCOUNTS')
  const accounts = accountsSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
  const account = accounts[project]?.[persona]
  if (!account) throw new Error(`Missing account for ${project}/${persona}`)
  return account
}
