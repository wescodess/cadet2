// Explicitly authorized local operator grant, outside the journey and app runtime.
import fs from 'node:fs/promises'
import path from 'node:path'
import { runConvex } from './operator-cli.mjs'
import { runtimeDirectory } from './runtime-directory.mjs'
const root = path.resolve(process.argv[2]),
  file = path.resolve(process.argv[3])
const runtime = runtimeDirectory(root)
const data = JSON.parse(await fs.readFile(file, 'utf8'))
const grants = []
for (const group of Object.values(data))
  for (const [persona, a] of Object.entries(group)) {
    if (!persona.startsWith('admin')) continue
    const jwt = JSON.parse(Buffer.from(a.token.split('.')[1], 'base64url'))
    if (jwt.sub !== a.userId) throw Error('JWT/session identity mismatch')
    grants.push({
      userId: jwt.sub,
      email: a.email,
      createdAt: Date.now(),
      grantedByUserId: 'qa28-local-operator',
    })
  }
const grantFile = file.replace('.json', '-grants.json')
await fs.writeFile(grantFile, JSON.stringify(grants), { mode: 0o600 })
runConvex(
  root,
  [
    'import',
    '--table',
    'rag_admins',
    '--replace',
    '--yes',
    grantFile,
    '--env-file',
    path.join(runtime, 'self-hosted.env'),
  ],
  { cwd: root, stdio: 'inherit' },
)
console.log(`Installed ${grants.length} subject-bound operator grants`)
