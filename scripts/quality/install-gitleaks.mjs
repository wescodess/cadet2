import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse as parseVersion } from './gitleaks-version.parser.mjs'
import { parse as parseRelease } from './gitleaks-release.parser.mjs'
import { run } from './common.mjs'

export const version = '8.30.1'
const archives = {
  'linux-x64': [
    'linux_x64',
    '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb',
    '88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509',
  ],
  'darwin-arm64': [
    'darwin_arm64',
    'b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5',
    'ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f',
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

function verifyBinary(binary, checksum) {
  if (createHash('sha256').update(readFileSync(binary)).digest('hex') !== checksum)
    throw new Error('gitleaks binary checksum mismatch')
  if (installedVersion(binary) !== version) throw new Error('Unexpected gitleaks version')
}

export async function gitleaks() {
  const archive = archives[`${process.platform}-${process.arch}`]
  if (!archive)
    throw new Error(`Unsupported gitleaks platform: ${process.platform}-${process.arch}`)
  const directory = resolve('.cache', 'gitleaks', version)
  const binary = join(directory, 'gitleaks')
  try {
    verifyBinary(binary, archive[2])
    return binary
  } catch {
    rmSync(binary, { force: true })
  }
  mkdirSync(directory, { recursive: true })
  const temporary = mkdtempSync(join(directory, '.install-'))
  try {
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
    const archivePath = join(temporary, name)
    writeFileSync(archivePath, bytes)
    const extract = run('tar', ['-xzf', archivePath, '-C', temporary, 'gitleaks'])
    if (extract.status !== 0) throw new Error(extract.stderr)
    const extracted = join(temporary, 'gitleaks')
    verifyBinary(extracted, archive[2])
    renameSync(extracted, binary)
    return binary
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}
