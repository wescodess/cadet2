import { createHash } from 'node:crypto'
import { access, chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { command } from './processes.mjs'

export const backendVersion = 'precompiled-2026-11-16-80befbc'
const archives = {
  'darwin-arm64': [
    'aarch64-apple-darwin',
    '9e551167c421e03e4bb4aac089b353d44adb9eeb80916a6ec1ef82d0f2eb254d',
  ],
  'linux-x64': [
    'x86_64-unknown-linux-gnu',
    '65230f5e8583c7c7f13cdf5854b140187c153c71bbc32276d60d75658214ab9e',
  ],
}

export async function backendBinary() {
  const archive = archives[`${process.platform}-${process.arch}`]
  if (!archive) throw new Error('Security tests require macOS arm64 or Linux x64')
  const directory = resolve('.cache', 'legacy-access', backendVersion)
  const binary = join(directory, 'convex-local-backend')
  try {
    await access(binary)
    return binary
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const cliCache = join(homedir(), '.cache/convex/binaries', backendVersion, 'convex-local-backend')
  const filename = `convex-local-backend-${archive[0]}.zip`
  await mkdir(directory, { recursive: true })
  const response = await fetch(
    `https://github.com/convex/convex-backend/releases/download/${backendVersion}/${filename}`,
    { signal: AbortSignal.timeout(120_000) },
  )
  if (!response.ok) throw new Error(`Backend download failed: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (createHash('sha256').update(bytes).digest('hex') !== archive[1])
    throw new Error('Backend archive digest mismatch')
  const zip = join(directory, filename)
  await writeFile(zip, bytes)
  await command('unzip', ['-o', zip, '-d', directory])
  await chmod(binary, 0o755)
  try {
    const cached = await readFile(cliCache)
    if (!cached.equals(await readFile(binary)))
      throw new Error('CLI cache differs from pinned backend')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return binary
}
