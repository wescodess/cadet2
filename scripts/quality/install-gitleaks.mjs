import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { commandTimeout, run } from './common.mjs'

export const version = '8.30.1'
const archives = {
  'linux-x64': ['linux_x64', '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'],
  'darwin-arm64': [
    'darwin_arm64',
    'b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5',
  ],
}

export async function gitleaks() {
  try {
    const installed = run('gitleaks', ['version'])
    if (installed.status === 0 && installed.stdout.trim() === version) return 'gitleaks'
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    // A missing binary is installed from the checksum-pinned upstream release.
  }
  const archive = archives[`${process.platform}-${process.arch}`]
  if (!archive)
    throw new Error(
      `Install gitleaks ${version} from its official release for ${process.platform}-${process.arch}`,
    )
  const directory = resolve('.cache', 'gitleaks', version)
  const binary = join(directory, 'gitleaks')
  if (existsSync(binary) && run(binary, ['version']).stdout.trim() === version) return binary
  mkdirSync(directory, { recursive: true })
  const name = `gitleaks_${version}_${archive[0]}.tar.gz`
  const response = await fetch(
    `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${name}`,
    { signal: AbortSignal.timeout(Math.min(commandTimeout, 60_000)) },
  )
  if (!response.ok) throw new Error(`gitleaks download failed: ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (createHash('sha256').update(bytes).digest('hex') !== archive[1])
    throw new Error('gitleaks checksum mismatch')
  const archivePath = join(directory, name)
  writeFileSync(archivePath, bytes)
  const extract = run('tar', ['-xzf', archivePath, '-C', directory, 'gitleaks'])
  if (extract.status !== 0) throw new Error(extract.stderr)
  return binary
}
