// Public Convex local binary with an explicit site origin for the real auth bridge.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { runtimeDirectory } from './runtime-directory.mjs'
const root = path.resolve(process.argv[2]),
  site = process.argv[3]
const runtime = runtimeDirectory(root)
const dir = path.join(runtime, '.convex/local/default')
const config = JSON.parse(await fs.readFile(path.join(dir, 'config.json'), 'utf8'))
const binary = path.join(
  os.homedir(),
  '.cache/convex/binaries',
  config.backendVersion,
  'convex-local-backend',
)
await fs.writeFile(
  path.join(runtime, 'self-hosted.env'),
  `CONVEX_SELF_HOSTED_URL=http://127.0.0.1:${config.ports.cloud}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${config.adminKey}\n`,
  { mode: 0o600 },
)
const child = spawn(
  binary,
  [
    '--interface',
    '127.0.0.1',
    '--port',
    String(config.ports.cloud),
    '--site-proxy-port',
    String(config.ports.site),
    '--convex-origin',
    `http://127.0.0.1:${config.ports.cloud}`,
    '--convex-site',
    site,
    '--instance-name',
    config.deploymentName,
    '--instance-secret',
    config.instanceSecret,
    '--disable-beacon',
    '--local-storage',
    path.join(dir, 'convex_local_storage'),
    path.join(dir, 'convex_local_backend.sqlite3'),
  ],
  { cwd: root, stdio: 'inherit' },
)
await fs.writeFile(
  path.join(runtime, 'backend-pids.json'),
  JSON.stringify({ wrapper: process.pid, backend: child.pid }),
)
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
process.exitCode = await new Promise((resolve, reject) => {
  child.on('error', reject)
  child.on('exit', (code) => resolve(code || 0))
})
