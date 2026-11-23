import { z } from 'zod'
import { jsonOutput, natural, nonempty, parser } from './parser.mjs'

const strings = z.array(nonempty)
const rule = z.object({ name: nonempty, severity: z.literal('error') }).strict()
const mini = z.object({ name: nonempty, dependencyTypes: strings }).strict()
const dependency = z
  .object({
    dynamic: z.boolean(),
    module: nonempty,
    moduleSystem: nonempty,
    exoticallyRequired: z.boolean(),
    dependencyTypes: strings,
    resolved: nonempty,
    coreModule: z.boolean(),
    followable: z.boolean(),
    couldNotResolve: z.boolean(),
    matchesDoNotFollow: z.boolean(),
    circular: z.boolean(),
    valid: z.boolean(),
    cycle: z.array(mini).optional(),
    rules: z.array(rule).optional(),
    protocol: nonempty.optional(),
  })
  .strict()
const module = z
  .object({
    source: nonempty,
    dependencies: z.array(dependency),
    dependents: strings,
    orphan: z.boolean(),
    valid: z.boolean(),
    followable: z.boolean().optional(),
    coreModule: z.boolean().optional(),
    couldNotResolve: z.boolean().optional(),
    matchesDoNotFollow: z.boolean().optional(),
    dependencyTypes: strings.optional(),
  })
  .strict()
const condition = z
  .object({
    path: nonempty.optional(),
    pathNot: nonempty.optional(),
    circular: z.boolean().optional(),
  })
  .strict()
const report = z
  .object({
    modules: z.array(module),
    summary: z
      .object({
        violations: z.array(
          z
            .object({
              type: z.enum(['cycle', 'dependency']),
              from: nonempty,
              to: nonempty,
              unresolvedTo: nonempty.optional(),
              dependencyTypes: strings,
              rule,
              cycle: z.array(mini).optional(),
            })
            .strict(),
        ),
        error: natural,
        warn: z.literal(0),
        info: z.literal(0),
        ignore: z.literal(0),
        advisedExitCode: natural,
        totalCruised: natural,
        totalDependenciesCruised: natural,
        optionsUsed: z
          .object({
            baseDir: nonempty,
            combinedDependencies: z.literal(false),
            detectImportsInAmbientModules: z.literal(false),
            detectJSDocImports: z.literal(false),
            detectProcessBuiltinModuleCalls: z.literal(false),
            doNotFollow: z.object({ path: nonempty }).strict(),
            enhancedResolveOptions: z.object({ extensions: strings }).strict(),
            exoticRequireStrings: strings,
            externalModuleResolutionStrategy: z.literal('node_modules'),
            metrics: z.literal(false),
            moduleSystems: strings,
            outputTo: z.literal('-'),
            outputType: z.literal('json'),
            preserveSymlinks: z.literal(false),
            rulesFile: nonempty,
            skipAnalysisNotInRules: z.literal(false),
            tsPreCompilationDeps: z.literal(true),
            args: nonempty,
            tsConfig: z.object({ fileName: nonempty }).strict(),
          })
          .strict(),
        ruleSetUsed: z
          .object({
            forbidden: z
              .array(
                z
                  .object({
                    name: nonempty,
                    severity: z.literal('error'),
                    from: condition,
                    to: condition,
                    scope: z.literal('module'),
                  })
                  .strict(),
              )
              .nonempty(),
          })
          .strict(),
        environment: z
          .object({
            version: z.literal('18.8.0'),
            nodeVersionSupported: nonempty,
            nodeVersionFound: nonempty,
            osVersionFound: nonempty,
            transpilersFound: z.array(
              z
                .object({
                  name: nonempty,
                  version: nonempty,
                  available: z.boolean(),
                  currentVersion: nonempty,
                })
                .strict(),
            ),
            extensionsFound: z.array(
              z.object({ extension: nonempty, available: z.boolean() }).strict(),
            ),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()

function violationIdentity(violation, links) {
  const { type, from, to, rule, cycle } = violation
  if (type === 'dependency' && cycle === undefined)
    return JSON.stringify([type, rule.name, from, to])
  if (type !== 'cycle' || !cycle?.length) return null
  const names = cycle.map((item) => item.name)
  const pairs = names.map((name, index) => JSON.stringify([names.at(index - 1), name]))
  if (
    new Set(names).size !== names.length ||
    !pairs.includes(JSON.stringify([from, to])) ||
    pairs.some((pair) => !links.has(pair))
  )
    return null
  // The pinned reporter coalesces rotated cycle witnesses by their member set.
  return JSON.stringify([type, rule.name, names.sort()])
}

function violationWitness(violation) {
  const { type, from, to, unresolvedTo, dependencyTypes, rule, cycle } = violation
  return JSON.stringify([type, from, to, unresolvedTo, dependencyTypes, rule, cycle])
}

function completeViolations(modules, summary) {
  const types = new Map(
    summary.ruleSetUsed.forbidden.map((rule) => [
      rule.name,
      rule.to.circular ? 'cycle' : 'dependency',
    ]),
  )
  if (types.size !== summary.ruleSetUsed.forbidden.length) return false
  const edges = modules.flatMap((module) =>
    module.dependencies.map((dependency) => ({ from: module.source, dependency })),
  )
  if (edges.some(({ dependency }) => dependency.valid !== !dependency.rules?.length)) return false
  const links = new Set(
    edges.map(({ from, dependency }) => JSON.stringify([from, dependency.resolved])),
  )
  const graph = edges.flatMap(({ from, dependency }) =>
    (dependency.rules ?? []).map((rule) => ({
      type: types.get(rule.name),
      from,
      to: dependency.resolved,
      unresolvedTo: dependency.module,
      dependencyTypes: dependency.dependencyTypes,
      rule,
      cycle: types.get(rule.name) === 'cycle' ? dependency.cycle : undefined,
    })),
  )
  const expected = new Set(graph.map((violation) => violationIdentity(violation, links)))
  const witnesses = new Set(graph.map(violationWitness))
  const reported = summary.violations.map((violation) => violationIdentity(violation, links))
  return (
    !expected.has(null) &&
    !reported.includes(null) &&
    new Set(reported).size === reported.length &&
    expected.size === reported.length &&
    reported.every((identity) => expected.has(identity)) &&
    summary.violations.every((violation) => witnesses.has(violationWitness(violation)))
  )
}

export const parse = parser(
  'dependency-cruiser report',
  z
    .object({ status: z.literal(0), stdout: jsonOutput(report), selected: strings.nonempty() })
    .strict()
    .superRefine(({ status, stdout: value, selected }, context) => {
      if (!value?.summary) return
      const summary = value.summary
      const sources = value.modules.map((item) => item.source)
      const dependencies = value.modules.flatMap((item) => item.dependencies)
      const valid =
        completeViolations(value.modules, summary) &&
        summary.totalCruised === sources.length &&
        summary.totalDependenciesCruised === dependencies.length &&
        selected.every((file) => sources.includes(file)) &&
        summary.error === summary.violations.length &&
        summary.advisedExitCode === summary.error &&
        status === 0
      if (!valid)
        context.addIssue({ code: 'custom', message: 'Incomplete graph, counts or exit status' })
    })
    .transform(({ stdout }) => stdout),
)
