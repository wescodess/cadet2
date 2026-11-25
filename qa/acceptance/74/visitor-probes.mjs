import fs from 'node:fs/promises'
import path from 'node:path'
import { endpoints, oracle } from './oracles.ts'
const records = []
for (const [method, template] of endpoints) {
  const url = template.replace('SOURCE', 'qa74-missing').replace('BATCH', 'qa74-missing')
  const response = await fetch(`${process.env.QA_URL}${url}`, {
    method,
    redirect: 'manual',
    headers: {
      origin: process.env.QA_URL,
      ...(method === 'GET' ? {} : { 'content-type': 'application/json' }),
    },
    ...(method === 'GET' ? {} : { body: '{}' }),
  })
  const text = await response.text()
  records.push({
    method,
    path: url,
    status: response.status,
    cache: response.headers.get('cache-control'),
    bytes: text.length,
    passed: response.status === 401,
    oracle: oracle.admission,
  })
}
await fs.mkdir(process.env.QA_EVIDENCE, { recursive: true })
await fs.writeFile(
  path.join(process.env.QA_EVIDENCE, 'visitor-api-results.json'),
  JSON.stringify(records, null, 2),
)
const failed = records.filter((r) => !r.passed)
console.log(JSON.stringify({ total: records.length, failed: failed.length, failures: failed }))
process.exitCode = failed.length ? 1 : 0
