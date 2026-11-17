import { z } from 'zod'
import { jsonOutput, natural, nonempty, parser, positive } from './parser.mjs'

const severities = ['info', 'low', 'moderate', 'high', 'critical']
const advisory = z
  .object({
    id: positive,
    severity: z.enum(severities),
    module_name: nonempty,
    url: z.string().regex(/^https:\/\/github\.com\/advisories\/GHSA-[\w-]+$/),
    github_advisory_id: z.string().regex(/^GHSA-[\w-]+$/),
    findings: z
      .array(z.object({ version: nonempty, paths: z.array(nonempty).nonempty() }).strict())
      .nonempty(),
    found_by: z.null(),
    deleted: z.null(),
    references: z.string(),
    created: z.string().datetime(),
    npm_advisory_id: z.null(),
    overview: z.string(),
    reported_by: z.null(),
    title: nonempty,
    metadata: z.null(),
    cves: z.array(nonempty),
    access: z.literal('public'),
    vulnerable_versions: nonempty,
    recommendation: z.string(),
    patched_versions: nonempty,
    updated: z.string().datetime(),
    cvss: z
      .object({ score: z.number().min(0).max(10).nullable(), vectorString: z.string().nullable() })
      .strict(),
    cwe: z.array(nonempty),
  })
  .strict()
const resolve = z
  .object({
    id: positive,
    path: nonempty,
    dev: z.boolean(),
    optional: z.boolean(),
    bundled: z.boolean(),
  })
  .strict()
const report = z
  .object({
    actions: z.array(
      z.discriminatedUnion('action', [
        z
          .object({
            action: z.literal('review'),
            resolves: z.array(resolve).nonempty(),
            module: nonempty.nullable(),
          })
          .strict(),
        z
          .object({
            action: z.literal('update'),
            resolves: z.array(resolve).nonempty(),
            module: nonempty.nullable(),
            target: nonempty.nullable(),
            depth: natural,
          })
          .strict(),
        z
          .object({
            action: z.literal('install'),
            resolves: z.array(resolve).nonempty(),
            module: nonempty.nullable(),
            target: nonempty.nullable(),
            depth: natural,
          })
          .strict(),
      ]),
    ),
    advisories: z.record(z.string().regex(/^\d+$/), advisory),
    muted: z.array(z.never()),
    metadata: z
      .object({
        vulnerabilities: z
          .object(Object.fromEntries(severities.map((severity) => [severity, natural])))
          .strict(),
        dependencies: natural,
        devDependencies: natural,
        optionalDependencies: natural,
        totalDependencies: positive,
      })
      .strict(),
  })
  .strict()
  .superRefine((audit, context) => {
    const totals = Object.fromEntries(severities.map((severity) => [severity, 0]))
    for (const [key, entry] of Object.entries(audit.advisories)) {
      if (String(entry.id) !== key || !entry.url.endsWith(`/${entry.github_advisory_id}`))
        context.addIssue({ code: 'custom', message: `Advisory identity mismatch: ${key}` })
      for (const finding of entry.findings) {
        if (finding.paths.some((path) => !path.endsWith(`${entry.module_name}@${finding.version}`)))
          context.addIssue({ code: 'custom', message: `Unmatched advisory paths: ${key}` })
      }
      totals[entry.severity] += entry.findings.length
    }
    for (const severity of severities) {
      if (totals[severity] !== audit.metadata.vulnerabilities[severity])
        context.addIssue({
          code: 'custom',
          message: `Audit ${severity} count does not match advisories`,
        })
    }
    const metadata = audit.metadata
    if (
      metadata.dependencies + metadata.devDependencies + metadata.optionalDependencies !==
      metadata.totalDependencies
    )
      context.addIssue({ code: 'custom', message: 'Dependency totals do not match' })
  })
export const schema = z
  .object({
    status: z.union([z.literal(0), z.literal(1)]),
    stdout: jsonOutput(report),
    stderr: z.literal(''),
  })
  .strict()
  .transform((result, context) => {
    const { status, stdout } = result
    if (
      (status === 1) !==
      stdout.metadata.vulnerabilities.high + stdout.metadata.vulnerabilities.critical > 0
    )
      context.addIssue({
        code: 'custom',
        message: 'Audit exit status does not match high/critical counts',
      })
    return result
  })
export const parse = parser('pnpm audit report', schema)
