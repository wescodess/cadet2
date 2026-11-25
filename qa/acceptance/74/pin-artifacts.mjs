import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
const output = process.argv[2]
const artifacts = []
for (const root of process.argv.slice(3)) {
  const files = []
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(file)
      else if (entry.isFile()) files.push(file)
    }
  }
  await walk(path.join(root, '.output'))
  const hash = crypto.createHash('sha256')
  for (const file of files.sort()) {
    hash.update(path.relative(root, file)).update('\0')
    hash.update(await fs.readFile(file)).update('\0')
  }
  artifacts.push({
    root,
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    files: files.length,
    sha256: hash.digest('hex'),
  })
}
await fs.writeFile(
  output,
  JSON.stringify(
    { artifacts, recordedAt: new Date().toISOString(), node: process.version },
    null,
    2,
  ),
)
console.log(JSON.stringify(artifacts))
