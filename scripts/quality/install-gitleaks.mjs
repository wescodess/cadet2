import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse as parseVersion } from './gitleaks-version.parser.mjs'
import { parse as parseRelease } from './gitleaks-release.parser.mjs'
import { run } from './common.mjs'

export const version = '8.30.1'
const archives = {
  'linux-x64': ['linux_x64', '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'],
  'darwin-arm64': [
    'darwin_arm64',
    'b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5',
  ],
}

function installedVersion(binary) {
  const result = run(binary, ['version'])
  return parseVersion({
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  }).stdout.trim()
}

export async function gitleaks() {
  try {
    if (installedVersion('gitleaks') === version) return 'gitleaks'
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
  if (existsSync(binary) && installedVersion(binary) === version) return binary
  mkdirSync(directory, { recursive: true })
  const name = `gitleaks_${version}_${archive[0]}.tar.gz`
  const signal = AbortSignal.timeout(60_000)
  const metadata = await fetch(
    `https://api.github.com/repos/gitleaks/gitleaks/releases/tags/v${version}`,
    { signal },
  )
  if (!metadata.ok) throw new Error(`gitleaks release metadata failed: ${metadata.status}`)
  const release = parseRelease(await metadata.text())
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${name}`
  const asset = release.assets.find((entry) => entry.name === name)
  if (!asset || asset.browser_download_url !== url || asset.digest !== `sha256:${archive[1]}`)
    throw new Error('gitleaks release asset does not match pinned archive')
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`gitleaks download failed: ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (createHash('sha256').update(bytes).digest('hex') !== archive[1])
    throw new Error('gitleaks checksum mismatch')
  const archivePath = join(directory, name)
  writeFileSync(archivePath, bytes)
  const extract = run('tar', ['-xzf', archivePath, '-C', directory, 'gitleaks'])
  if (extract.status !== 0) throw new Error(extract.stderr)
  if (installedVersion(binary) !== version)
    throw new Error('Unexpected downloaded gitleaks version')
  return binary
}
