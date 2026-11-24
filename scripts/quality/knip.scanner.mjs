import { readFileSync, writeFileSync } from 'node:fs'
import { createOptions, createSession } from 'knip/session'
import nativeReporter from '../../node_modules/knip/dist/reporters/json.js'

try {
  const [config, inventoryPath] = process.argv.slice(2)
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'))
  if (JSON.parse(readFileSync('package.json', 'utf8')).knip !== undefined)
    throw new Error('Use the trusted structural configuration, not package.json#knip')
  const options = await createOptions({
    cwd: process.cwd(),
    args: {
      config,
      include: ['files', 'exports', 'types', 'dependencies'],
      'no-gitignore': true,
      'no-progress': true,
    },
    isSession: true,
  })
  const session = await createSession(options)
  const result = session.getResults()
  if (result.hasConfigLoadErrors) throw new Error('Knip configuration failed to load')
  const unused = new Set(Object.keys(result.issues.files))
  for (const file of inventory.ignored) {
    if (unused.has(file) || session.describeFile(file, { isShowContention: false }))
      throw new Error(
        `Knip analyzed ignored untracked source outside the trusted source inventory: ${file}`,
      )
  }
  const analyzed = []
  for (const file of inventory.selected) {
    if (unused.has(file)) continue
    if (!session.describeFile(file, { isShowContention: false }))
      throw new Error(`Incomplete Knip source population: ${file}`)
    analyzed.push(file)
  }
  writeFileSync(
    inventoryPath,
    JSON.stringify({ ...inventory, analyzed, unused: [...unused].sort() }, null, 2) + '\n',
  )
  await nativeReporter({
    ...result,
    report: options.includedIssueTypes,
    cwd: process.cwd(),
    write: (text) => process.stdout.write(text),
  })
  process.exitCode = Object.entries(result.counters).some(
    ([kind, count]) => options.includedIssueTypes[kind] && count > 0,
  )
    ? 1
    : 0
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
