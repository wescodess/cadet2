import { writeFileSync } from 'node:fs'
import { z } from 'zod'
import { json, main, outputDir, run, writeJSON, writingBaseline } from './common.mjs'

const expiry = '2027-01-16'
const reason =
  'Existing dependency debt at adoption; ratchet under #23, remediation under #22. No new package/version/path allowance.'
const path = 'scripts/quality/baselines/dependencies.json'
const permittedLicenses = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'Python-2.0',
  'BlueOak-1.0.0',
  '(MIT OR Apache-2.0)',
  '(Apache-2.0 OR MIT)',
  '(MIT AND Zlib)',
  '(MIT OR CC0-1.0)',
])

const severities = ['info', 'low', 'moderate', 'high', 'critical']
const nonempty = z.string().trim().min(1)
const auditSchema = z.object({
  advisories: z.record(
    z.object({
      id: z.number().int().positive(),
      severity: z.enum(severities),
      module_name: nonempty,
      url: z.string().regex(/^https:\/\/github\.com\/advisories\/GHSA-[\w-]+$/),
      github_advisory_id: z.string().regex(/^GHSA-[\w-]+$/),
      findings: z
        .array(z.object({ version: nonempty, paths: z.array(nonempty).nonempty() }))
        .nonempty(),
    }),
  ),
  metadata: z.object({
    vulnerabilities: z
      .object(
        Object.fromEntries(
          severities.map((severity) => [severity, z.number().int().nonnegative()]),
        ),
      )
      .strict(),
  }),
})

function validateAudit(report) {
  const parsed = auditSchema.safeParse(report)
  if (!parsed.success) throw new Error(`Invalid pnpm audit report: ${parsed.error.message}`)
  const audit = parsed.data
  const totals = Object.fromEntries(severities.map((severity) => [severity, 0]))
  for (const [key, advisory] of Object.entries(audit.advisories)) {
    const id = advisory.github_advisory_id
    if (String(advisory.id) !== key || !advisory.url.endsWith(`/${id}`))
      throw new Error(`Audit advisory identity mismatch: ${key}`)
    for (const finding of advisory.findings) {
      if (
        finding.paths.some((path) => !path.endsWith(`${advisory.module_name}@${finding.version}`))
      )
        throw new Error(`Audit advisory has unmatched dependency paths: ${key}`)
    }
    totals[advisory.severity] += advisory.findings.length
  }
  for (const severity of severities) {
    if (totals[severity] !== audit.metadata.vulnerabilities[severity])
      throw new Error(`Audit ${severity} count does not match parsed advisories`)
  }
  return audit
}

function auditFindings(report) {
  const audit = validateAudit(report)
  const findings = {}
  for (const advisory of Object.values(audit.advisories)) {
    if (!['high', 'critical'].includes(advisory.severity)) continue
    for (const finding of advisory.findings) {
      const key = `${advisory.github_advisory_id}|${advisory.module_name}@${finding.version}`
      findings[key] = [...new Set([...(findings[key] ?? []), ...finding.paths])].sort()
    }
  }
  return findings
}

function licenseFindings(report) {
  if (!Object.keys(report).length) throw new Error('Empty license report')
  const findings = {}
  for (const [license, packages] of Object.entries(report)) {
    if (permittedLicenses.has(license)) continue
    if (!Array.isArray(packages)) throw new Error('Unrecognized pnpm license report')
    for (const pkg of packages) {
      if (!Array.isArray(pkg.versions) || !pkg.versions.length)
        throw new Error('License package has no versions')
      for (const version of pkg.versions) findings[`${pkg.name}@${version}|${license}`] = [license]
    }
  }
  return findings
}

function enforce(kind, findings, baseline) {
  const entries = baseline[kind] ?? {}
  for (const [key, entry] of Object.entries(entries)) {
    const deadline = Date.parse(`${entry.expires}T00:00:00Z`)
    if (
      typeof entry.reason !== 'string' ||
      !entry.reason.trim() ||
      !Number.isFinite(deadline) ||
      new Date(deadline).toISOString().slice(0, 10) !== entry.expires ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires) ||
      deadline <= Date.now()
    )
      throw new Error(`${kind} allowance expired or invalid: ${key}`)
  }
  const failures = []
  for (const [key, paths] of Object.entries(findings)) {
    const allowed = entries[key]?.paths ?? []
    if (paths.some((value) => !allowed.includes(value))) failures.push(key)
  }
  if (failures.length)
    throw new Error(`${kind}: new unallowlisted findings:\n${failures.join('\n')}`)
  console.log(
    `${kind}: PASS (${Object.keys(findings).length} existing exceptions, zero new; expire ${expiry})`,
  )
}

main(() => {
  const integrity = run('pnpm', [
    'install',
    '--frozen-lockfile',
    '--lockfile-only',
    '--ignore-scripts',
  ])
  if (integrity.status !== 0) throw new Error(integrity.stdout + integrity.stderr)
  const auditResult = run('pnpm', ['audit', '--audit-level', 'high', '--json'])
  writeFileSync(`${outputDir}/audit.json`, auditResult.stdout)
  if (![0, 1].includes(auditResult.status)) throw new Error(auditResult.stdout + auditResult.stderr)
  const audit = JSON.parse(auditResult.stdout)
  if (audit.error) throw new Error(JSON.stringify(audit.error))
  const licenseResult = run('pnpm', ['licenses', 'list', '--json'])
  if (licenseResult.status !== 0) throw new Error(licenseResult.stdout + licenseResult.stderr)
  writeFileSync(`${outputDir}/licenses.json`, licenseResult.stdout)
  const findings = {
    advisories: auditFindings(audit),
    licenses: licenseFindings(JSON.parse(licenseResult.stdout)),
  }
  if (writingBaseline) {
    const baseline = {}
    for (const [kind, values] of Object.entries(findings))
      baseline[kind] = Object.fromEntries(
        Object.entries(values)
          .sort()
          .map(([key, paths]) => [key, { paths, expires: expiry, reason }]),
      )
    writeJSON(path, baseline)
    console.log(
      `dependencies: wrote ${Object.keys(findings.advisories).length} advisory/version and ${Object.keys(findings.licenses).length} license exceptions`,
    )
  } else {
    const baseline = json(path)
    const failures = []
    for (const [kind, values] of Object.entries(findings)) {
      try {
        enforce(kind, values, baseline)
      } catch (error) {
        failures.push(error.message)
      }
    }
    if (failures.length) throw new Error(failures.join('\n'))
  }
})
