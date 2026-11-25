import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.env.QA_EVIDENCE
if (!root) throw Error('Set QA_EVIDENCE to the ticket evidence directory')
const summary = {}
const slug = (value) => value.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 130)
const specs = (suites) =>
  suites.flatMap((suite) => [...(suite.specs || []), ...specs(suite.suites || [])])
async function decodeAttachment(attachment, decoded, prefix) {
  if (!attachment.body || attachment.contentType !== 'application/json')
    return attachment.path ? { name: attachment.name, path: attachment.path } : undefined
  const data = JSON.parse(Buffer.from(attachment.body, 'base64').toString())
  const file = path.join(decoded, `${slug(prefix)}-${slug(attachment.name)}`)
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n')
  return { name: attachment.name, path: file, data }
}
async function collectCases(suites, decoded) {
  const cases = []
  for (const spec of specs(suites)) {
    for (const test of spec.tests) {
      for (const result of test.results) {
        const attachments = await Promise.all(
          result.attachments.map((a) =>
            decodeAttachment(a, decoded, `${test.projectName}-${spec.title}`),
          ),
        )
        cases.push({
          title: spec.title,
          project: test.projectName,
          status: result.status,
          duration: result.duration,
          retry: result.retry,
          errors: result.errors.map((e) => e.message),
          attachments: attachments.filter(Boolean),
        })
      }
    }
  }
  return cases
}
for (const build of ['base', 'candidate']) {
  const output = { ui: {}, probes: {} }
  for (const run of ['ui']) {
    const directory = path.join(root, build, run)
    const report = JSON.parse(await fs.readFile(path.join(directory, 'results.json'), 'utf8'))
    const decoded = path.join(directory, 'decoded-attachments')
    await fs.mkdir(decoded, { recursive: true })
    const cases = await collectCases(report.suites, decoded)
    if (
      cases.length !== 30 ||
      report.stats.skipped ||
      report.stats.flaky ||
      cases.some((c) => c.retry !== 0)
    )
      throw Error(`Incomplete ${build} browser population`)
    output.ui[run] = { stats: report.stats, cases }
  }
  for (const name of ['api-results', 'worker-results', 'ui-state-result']) {
    output.probes[name] = JSON.parse(
      await fs.readFile(path.join(root, build, `${name}.json`), 'utf8'),
    )
  }
  const api = output.probes['api-results']
  const worker = output.probes['worker-results']
  if (api.records.length !== 612 || api.passed + api.failed !== 612 || worker.records.length !== 12)
    throw Error(`Incomplete ${build} probe population`)
  summary[build] = output
}
await fs.writeFile(path.join(root, 'run-summary.json'), JSON.stringify(summary, null, 2) + '\n')
for (const [build, result] of Object.entries(summary)) {
  console.log(
    build,
    JSON.stringify({
      ui: Object.fromEntries(Object.entries(result.ui).map(([name, run]) => [name, run.stats])),
      api: {
        passed: result.probes['api-results'].passed,
        failed: result.probes['api-results'].failed,
      },
      worker: {
        total: result.probes['worker-results'].records.length,
        failed: result.probes['worker-results'].failed,
      },
      uiState: result.probes['ui-state-result'],
    }),
  )
}
